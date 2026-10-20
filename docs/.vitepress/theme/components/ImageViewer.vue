<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vitepress'

const dialog = ref<HTMLDialogElement>()
const src = ref('')
const caption = ref('')
let original: HTMLImageElement | undefined
let previousOverflow = ''
let observer: MutationObserver
const route = useRoute()

function prepareImages() {
  document.querySelectorAll<HTMLImageElement>('.vp-doc img').forEach((image) => {
    image.tabIndex = 0
    image.setAttribute('role', 'button')
    image.setAttribute('aria-label', `放大图片：${image.alt || '原书图示'}`)
    image.setAttribute('aria-haspopup', 'dialog')
  })
}
async function open(image: HTMLImageElement) {
  original = image
  src.value = image.currentSrc || image.src
  caption.value = image.alt || '原书图示'
  await nextTick()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
}
function close() {
  if (!dialog.value?.open) return
  dialog.value.close()
  document.body.style.overflow = previousOverflow
}
function closed() {
  document.body.style.overflow = previousOverflow
  original?.focus({ preventScroll: true })
  src.value = ''
}
function handleClick(event: MouseEvent) {
  const target = event.target
  if (target instanceof HTMLImageElement && target.closest('.vp-doc')) open(target)
}
function handleKey(event: KeyboardEvent) {
  const target = event.target
  if ((event.key === 'Enter' || event.key === ' ') && target instanceof HTMLImageElement && target.closest('.vp-doc')) {
    event.preventDefault()
    open(target)
  }
}
watch(() => route.path, close)
onMounted(() => {
  prepareImages()
  observer = new MutationObserver(prepareImages)
  observer.observe(document.querySelector('#app')!, { childList: true, subtree: true })
  document.addEventListener('click', handleClick)
  document.addEventListener('keydown', handleKey)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('click', handleClick)
  document.removeEventListener('keydown', handleKey)
  if (dialog.value?.open) close()
})
</script>

<template>
  <dialog ref="dialog" class="book-image-viewer" aria-labelledby="image-caption" @close="closed" @click="event => { if (event.target === dialog) close() }">
    <div class="viewer-header">
      <span id="image-caption">{{ caption }}</span>
      <div class="viewer-actions">
        <a :href="src" target="_blank" rel="noopener">查看原图</a>
        <button type="button" autofocus aria-label="关闭放大图片" @click="close">关闭 <kbd>Esc</kbd></button>
      </div>
    </div>
    <div class="viewer-content"><img v-if="src" :src="src" :alt="caption"></div>
  </dialog>
</template>

<style scoped>
.book-image-viewer { position: fixed; inset: 0; width: calc(100vw - 2rem); max-width: 1600px; height: calc(100dvh - 2rem); max-height: none; margin: auto; padding: 0; color: var(--vp-c-text-1); background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider); border-radius: 8px; }
.book-image-viewer::backdrop { background: rgba(0, 0, 0, .8); }
.viewer-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: .75rem 1rem; border-bottom: 1px solid var(--vp-c-divider); font-size: .875rem; }
.viewer-header > span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.viewer-actions { display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
.viewer-actions a { color: var(--vp-c-brand-1); }
.viewer-actions button { padding: .35rem .6rem; border: 1px solid var(--vp-c-divider); border-radius: 4px; }
.viewer-actions kbd { margin-left: .25rem; font-size: .75rem; color: var(--vp-c-text-2); }
.viewer-content { height: calc(100% - 64px); padding: 1rem; overflow: auto; text-align: center; }
.viewer-content img { display: inline-block; max-width: none; height: auto; background: white; }
@media (max-width: 639px) { .viewer-header { flex-wrap: wrap; gap: .5rem; } .viewer-header > span { width: 100%; } .viewer-content { height: calc(100% - 100px); padding: .5rem; } }
</style>
