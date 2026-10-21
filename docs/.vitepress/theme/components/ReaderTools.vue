<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useData, useRoute, useRouter, withBase } from 'vitepress'

type Position = { path: string; title: string; scrollY: number; updatedAt: number }
type ResumeRequest = Position & { requestedAt: number }

const FONT_KEY = 'payment-book:font-size'
const POSITION_KEY = 'payment-book:position'
const RESUME_KEY = 'payment-book:resume'
const SAVE_INTERVAL = 500
const fontOptions = [
  { value: 16, label: '小' },
  { value: 18, label: '标准' },
  { value: 20, label: '大' },
]
const fontSize = ref(18)
const position = ref<Position | null>(null)
const route = useRoute()
const router = useRouter()
const { page, frontmatter } = useData()
const isChapter = computed(() => isChapterPath(route.path))
const isHome = computed(() => {
  const root = withBase('/')
  return [root, `${root}index`, `${root}index.html`].includes(route.path)
})
let mounted = false
let active: Pick<Position, 'path' | 'title'> | null = null
let latestScrollY = 0
let lastSavedAt = 0
let saveTimer: ReturnType<typeof setTimeout> | undefined
let frame: number | undefined
let restoring = false

function isChapterPath(value: string) {
  const prefix = withBase('/book/')
  if (!value.startsWith(prefix)) return false
  // Strip the raw trailing slash and .html suffix before decoding, so encoded
  // traversal like %2e%2e or %2F collapses into characters the check below rejects.
  let segment: string
  try {
    segment = decodeURIComponent(value.slice(prefix.length).replace(/\/$/, '').replace(/\.html$/, ''))
  } catch {
    return false
  }
  if (segment === '.' || segment === '..') return false
  // Exactly one non-empty segment: no separators, query, hash, whitespace, or control characters.
  return /^[^\s\\/?#\u0000-\u001f\u007f-\u009f]+$/.test(segment)
}

function samePage(first: string, second: string) {
  const normalize = (value: string) => value.replace(/\/$/, '').replace(/\.html$/, '')
  return normalize(first) === normalize(second)
}

function parsePosition(value: unknown): Position | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<Position>
  if (typeof record.path !== 'string' || !isChapterPath(record.path)) return null
  if (typeof record.title !== 'string' || !record.title.trim()) return null
  if (typeof record.scrollY !== 'number' || !Number.isFinite(record.scrollY) || record.scrollY < 0) return null
  if (typeof record.updatedAt !== 'number' || !Number.isFinite(record.updatedAt)) return null
  return { path: record.path, title: record.title.slice(0, 200), scrollY: record.scrollY, updatedAt: record.updatedAt }
}

function readPosition() {
  try {
    position.value = parsePosition(JSON.parse(localStorage.getItem(POSITION_KEY) || 'null'))
  } catch {
    position.value = null
  }
}

function clearResumeRequest() {
  try { sessionStorage.removeItem(RESUME_KEY) } catch { /* Storage may be unavailable. */ }
}

function pendingResume(): ResumeRequest | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(RESUME_KEY) || 'null')
    const saved = parsePosition(value)
    if (!saved || typeof value.requestedAt !== 'number') return null
    const age = Date.now() - value.requestedAt
    if (!Number.isFinite(age) || age < 0 || age > 5 * 60 * 1000) {
      clearResumeRequest()
      return null
    }
    return { ...saved, requestedAt: value.requestedAt }
  } catch {
    return null
  }
}

function setFontSize(value: number) {
  if (!fontOptions.some((option) => option.value === value)) return
  fontSize.value = value
  if (!mounted) return
  document.documentElement.style.setProperty('--book-font-size', `${value}px`)
  try { localStorage.setItem(FONT_KEY, String(value)) } catch { /* Reading still works without persistence. */ }
}

function savePosition(readWindow = false) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = undefined
  if (!mounted || !active) return
  if (readWindow && !restoring) latestScrollY = Math.max(0, window.scrollY)
  const saved: Position = { ...active, scrollY: latestScrollY, updatedAt: Date.now() }
  position.value = saved
  lastSavedAt = Date.now()
  try { localStorage.setItem(POSITION_KEY, JSON.stringify(saved)) } catch { /* Ignore quota and privacy restrictions. */ }
}

function onScroll() {
  if (!active || restoring) return
  latestScrollY = Math.max(0, window.scrollY)
  const delay = SAVE_INTERVAL - (Date.now() - lastSavedAt)
  if (delay <= 0) savePosition()
  else if (!saveTimer) saveTimer = setTimeout(() => savePosition(), delay)
}

function saveBeforeLeaving() {
  savePosition(true)
}

function onVisibilityChange() {
  if (document.hidden) saveBeforeLeaving()
}

async function activatePage() {
  const target = route.path
  await nextTick()
  if (!mounted || route.path !== target) return
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    frame = undefined
    if (!mounted || route.path !== target) return
    const pending = pendingResume()
    if (!isChapterPath(target)) {
      active = null
      readPosition()
      if (pending) clearResumeRequest()
      return
    }
    active = { path: target, title: String(frontmatter.value.title || page.value.title || '继续阅读') }
    latestScrollY = Math.max(0, window.scrollY)
    // Ordinary chapter navigation never consumes a saved position. Only the
    // homepage's explicit continue action creates this short-lived request.
    if (pending && samePage(pending.path, target)) {
      clearResumeRequest()
      restoring = true
      latestScrollY = pending.scrollY
      frame = requestAnimationFrame(() => {
        frame = undefined
        if (mounted && active?.path === target && route.path === target) {
          window.scrollTo({ top: pending.scrollY, left: 0, behavior: 'instant' })
          latestScrollY = Math.max(0, window.scrollY)
          restoring = false
          savePosition()
        } else restoring = false
      })
    } else {
      if (pending) clearResumeRequest()
      restoring = false
      savePosition()
    }
  })
}

async function continueReading(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const saved = position.value
  if (!saved) return
  event.preventDefault()
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ ...saved, requestedAt: Date.now() }))
  } catch { /* Navigate normally if session storage is disabled. */ }
  try {
    await router.go(saved.path)
  } catch {
    clearResumeRequest()
  }
}

watch(() => route.path, () => {
  if (!mounted) return
  // VitePress updates route.path before its next-tick scroll reset, so the
  // old page's current offset is still available here.
  savePosition(true)
  active = null
  restoring = false
  void activatePage()
}, { flush: 'sync' })

onMounted(() => {
  mounted = true
  let savedFont = 18
  try { savedFont = Number(localStorage.getItem(FONT_KEY)) || 18 } catch { /* Keep the default. */ }
  setFontSize(savedFont)
  readPosition()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pagehide', saveBeforeLeaving)
  window.addEventListener('beforeunload', saveBeforeLeaving)
  document.addEventListener('visibilitychange', onVisibilityChange)
  void activatePage()
})

onBeforeUnmount(() => {
  savePosition(true)
  mounted = false
  if (saveTimer) clearTimeout(saveTimer)
  if (frame !== undefined) cancelAnimationFrame(frame)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('pagehide', saveBeforeLeaving)
  window.removeEventListener('beforeunload', saveBeforeLeaving)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <div v-if="isChapter" class="reader-tools" aria-label="阅读设置">
    <div class="font-controls" role="group" aria-label="正文字号">
      <span class="control-label">字号</span>
      <button
        v-for="option in fontOptions"
        :key="option.value"
        type="button"
        :aria-label="`${option.label}字号，${option.value} 像素`"
        :aria-pressed="fontSize === option.value"
        @click="setFontSize(option.value)"
      >{{ option.label }}</button>
    </div>
    <span class="storage-note">字号与阅读位置仅保存在此浏览器</span>
  </div>
  <div v-else-if="isHome && position" class="resume-reading">
    <a :href="position.path" aria-label="继续上次阅读" @click="continueReading">
      继续阅读：{{ position.title }} <span aria-hidden="true">→</span>
    </a>
    <span class="storage-note">阅读位置仅保存在此浏览器</span>
  </div>
</template>

<style scoped>
.reader-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  line-height: 1.6;
}
.font-controls { display: flex; align-items: center; gap: 4px; }
.control-label { margin-right: 6px; color: var(--vp-c-text-2); }
button {
  min-width: 40px;
  min-height: 36px;
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font: inherit;
}
button:hover { color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
button[aria-pressed="true"] { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
button:focus-visible, a:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 3px; }
.storage-note { color: var(--vp-c-text-2); font-size: 12px; }
.resume-reading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 16px;
  max-width: 1152px;
  margin: 20px auto 0;
  padding: 0 24px;
  line-height: 1.7;
}
.resume-reading a { color: var(--vp-c-brand-1); font-size: 15px; font-weight: 500; overflow-wrap: anywhere; }
@media (min-width: 640px) { .resume-reading { padding: 0 48px; } }
</style>
