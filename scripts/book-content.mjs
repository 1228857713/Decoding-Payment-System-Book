import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const internalDirectories = new Set(['.vitepress', 'superpowers', 'assets', 'public', 'node_modules'])
const markdown = new MarkdownIt({ html: true })
// Retain prohibited file: destinations as tokens so validation reports them.
markdown.validateLink = () => true
const label = (root, file) => path.relative(root, file).split(path.sep).join('/')

function readPage(file, root) {
  try { return matter(readFileSync(file, 'utf8')) }
  catch (error) { throw new Error(`${label(root, file)}: 无法解析 Markdown / YAML：${error.message}`) }
}

function walkTokens(tokens, visit) {
  for (const token of tokens) {
    visit(token)
    // Image children are alt text, not nested live links or HTML resources.
    if (token.children && token.type !== 'image') walkTokens(token.children, visit)
  }
}

function inlineText(token) {
  return token?.children?.map((child) => ['softbreak', 'hardbreak'].includes(child.type) ? ' ' : ['text', 'code_inline', 'image'].includes(child.type) ? child.content : '').join('').trim() || ''
}

// Markdown-it separates real HTML from fences and inline code. Within those
// HTML tokens, respect comments and quoted > characters when reading tags.
function htmlTags(source) {
  const result = []
  let offset = 0
  while ((offset = source.indexOf('<', offset)) !== -1) {
    if (source.startsWith('<!--', offset)) {
      const end = source.indexOf('-->', offset + 4)
      offset = end < 0 ? source.length : end + 3
      continue
    }
    const match = source.slice(offset).match(/^<(\/?)([a-z][\w:-]*)\b/i)
    if (!match) { offset += 1; continue }
    const start = offset
    let end = offset + match[0].length
    let quote = ''
    for (; end < source.length; end += 1) {
      const character = source[end]
      if (quote) { if (character === quote) quote = '' }
      else if (character === '"' || character === "'") quote = character
      else if (character === '>') break
    }
    if (end === source.length) break
    const tag = match[2].toLowerCase()
    const attributes = new Map()
    for (const attribute of source.slice(offset + match[0].length, end).matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      attributes.set(attribute[1].toLowerCase(), markdown.utils.unescapeAll(attribute[2] ?? attribute[3] ?? attribute[4] ?? ''))
    }
    result.push({ tag, closing: Boolean(match[1]), attributes, start, end: end + 1 })
    offset = end + 1
    if (!match[1] && (tag === 'script' || tag === 'style')) {
      const close = source.toLowerCase().indexOf(`</${tag}`, offset)
      if (close >= 0) offset = close
    }
  }
  return result
}

function h1Titles(tokens) {
  const titles = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type === 'heading_open' && token.tag === 'h1') titles.push(inlineText(tokens[index + 1]))
    const html = token.type === 'html_block' ? token.content : token.type === 'inline' ? token.children.map((child) => child.type === 'html_inline' ? child.content : markdown.utils.escapeHtml(child.content || '')).join('') : ''
    if (html) {
      const tags = htmlTags(html)
      for (const opening of tags.filter((tag) => tag.tag === 'h1' && !tag.closing)) {
        const closing = tags.find((tag) => tag.tag === 'h1' && tag.closing && tag.start >= opening.end)
        titles.push(markdown.utils.unescapeAll(html.slice(opening.end, closing?.start).replace(/<[^>]*>/g, '')).trim())
      }
    }
  }
  return titles
}

export function loadBookPages(projectRoot = defaultRoot) {
  const bookRoot = path.join(projectRoot, 'docs/book')
  let files
  try { files = readdirSync(bookRoot, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith('.md')).map((entry) => entry.name).sort() }
  catch { throw new Error('docs/book: 找不到书稿章节目录') }
  if (!files.length) throw new Error('docs/book: 没有可读取的书稿章节')
  const orders = new Map()
  return files.map((filename) => {
    const file = path.join(bookRoot, filename)
    const parsed = readPage(file, projectRoot)
    const headings = h1Titles(markdown.parse(parsed.content, {}))
    if (headings.length !== 1 || !headings[0]) throw new Error(`${label(projectRoot, file)}: 正文必须恰好有一个非空 H1 标题（当前 ${headings.length} 个）`)
    const hasTitle = Object.hasOwn(parsed.data, 'title')
    if (hasTitle && (typeof parsed.data.title !== 'string' || !parsed.data.title.trim())) throw new Error(`${label(projectRoot, file)}: frontmatter.title 必须为非空字符串标题`)
    const title = hasTitle ? parsed.data.title.trim() : headings[0]
    const slug = filename.slice(0, -3)
    const inferredOrder = slug.match(/^ch(\d+)$/)?.[1]
    const order = Object.hasOwn(parsed.data, 'order') ? parsed.data.order : inferredOrder === undefined ? undefined : Number(inferredOrder)
    if (typeof order !== 'number' || !Number.isFinite(order)) throw new Error(`${label(projectRoot, file)}: order 必须为有限数字；非 chXX 文件名需要显式 order`)
    if (orders.has(order)) throw new Error(`${label(projectRoot, file)}: 重复 order ${order}，与 ${orders.get(order)} 冲突`)
    orders.set(order, label(projectRoot, file))
    return { order, title, link: `/book/${slug}` }
  }).sort((first, second) => first.order - second.order)
}

function discoverPages(directory) {
  const result = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || internalDirectories.has(entry.name)) continue
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...discoverPages(file))
    else if (entry.isFile() && entry.name.endsWith('.md')) result.push(file)
  }
  return result.sort()
}

function referencesIn(tokens) {
  const references = []
  walkTokens(tokens, (token) => {
    if (token.type === 'image') references.push({ kind: 'image', url: token.attrGet('src') || '' })
    if (token.type === 'link_open') references.push({ kind: 'link', url: token.attrGet('href') || '' })
    if (token.type !== 'html_inline' && token.type !== 'html_block') return
    for (const { tag, closing, attributes } of htmlTags(token.content)) {
      if (closing) continue
      if (attributes.has('href')) references.push({ kind: tag === 'a' || tag === 'area' ? 'link' : 'resource', url: attributes.get('href') })
      if (attributes.has('src')) references.push({ kind: tag === 'img' ? 'image' : 'resource', url: attributes.get('src') })
      if (attributes.has('poster')) references.push({ kind: 'image', url: attributes.get('poster') })
      if (attributes.has('srcset') && !attributes.get('srcset').trim().startsWith('data:')) {
        for (const candidate of attributes.get('srcset').split(',')) {
          const url = candidate.trim().split(/\s+/)[0]
          if (url) references.push({ kind: 'image', url })
        }
      }
    }
  })
  return references
}

function within(root, file) {
  const relative = path.relative(root, file)
  return !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)
}

function existingFile(candidates, docsRoot, realDocsRoot, context) {
  for (const candidate of candidates) {
    if (!within(docsRoot, candidate)) throw new Error(`${context}: 路径越界，引用必须在 docs 目录内`)
    let stat
    try { stat = statSync(candidate) } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') continue
      throw error
    }
    if (!within(realDocsRoot, realpathSync(candidate))) throw new Error(`${context}: 符号链接指向 docs 目录之外`)
    if (stat.isFile()) return candidate
  }
  return null
}

export async function validateContent(projectRoot = defaultRoot) {
  const chapters = loadBookPages(projectRoot)
  const docsRoot = path.resolve(projectRoot, 'docs')
  const realDocsRoot = realpathSync(docsRoot)
  const pages = discoverPages(docsRoot)
  const pageSet = new Set(pages)
  const images = new Set()
  const stats = { pages: pages.length, chapters: chapters.length, imageReferences: 0, localPageLinks: 0, resourceReferences: 0, externalReferences: 0, imageFiles: 0 }
  for (const file of pages) {
    const { content } = readPage(file, projectRoot)
    for (const reference of referencesIn(markdown.parse(content, {}))) {
      const url = reference.url.trim()
      const context = `${label(projectRoot, file)}: ${url || '空引用'}`
      if (reference.kind === 'image') stats.imageReferences += 1
      if (/^(?:file:|[a-z]:[\\/]|\\\\)/i.test(url)) throw new Error(`${context}: 不允许机器本地文件链接（file / drive / UNC）`)
      if (/^(?:javascript|vbscript):/i.test(url)) throw new Error(`${context}: 不允许可执行脚本链接`)
      if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) { stats.externalReferences += 1; continue }
      const rawPath = url.split(/[?#]/, 1)[0]
      if (!rawPath) {
        if (reference.kind !== 'link') throw new Error(`${context}: 图片或资源引用为空`)
        continue
      }
      let decoded
      try { decoded = decodeURIComponent(rawPath) } catch { throw new Error(`${context}: URL 编码无效`) }
      if (/^(?:file:|[a-z]:[\\/]|\\\\)/i.test(decoded) || decoded.includes('\\')) throw new Error(`${context}: 不允许机器本地文件路径或反斜杠路径`)
      const target = decoded.startsWith('/') ? path.resolve(docsRoot, `.${decoded}`) : path.resolve(path.dirname(file), decoded)
      if (!within(docsRoot, target)) throw new Error(`${context}: 路径越界，引用必须在 docs 目录内`)
      const publicTarget = decoded.startsWith('/') ? path.resolve(docsRoot, 'public', `.${decoded}`) : null
      if (reference.kind === 'link') {
        const candidates = /\.(?:md|html)$/i.test(decoded) ? [target.replace(/\.html$/i, '.md')] : decoded.endsWith('/') ? [path.join(target, 'index.md')] : [`${target}.md`, path.join(target, 'index.md')]
        const page = candidates.find((candidate) => pageSet.has(candidate))
        if (page) { existingFile([page], docsRoot, realDocsRoot, context); stats.localPageLinks += 1; continue }
        if (!/\.md$/i.test(decoded) && !decoded.endsWith('/') && existingFile([target, publicTarget].filter(Boolean), docsRoot, realDocsRoot, context)) { stats.resourceReferences += 1; continue }
        throw new Error(`${context}: 页面或资源链接目标不存在，未找到对应 Markdown / index.md / 静态文件`)
      }
      const existing = existingFile([target, publicTarget].filter(Boolean), docsRoot, realDocsRoot, context)
      if (!existing) throw new Error(`${context}: ${reference.kind === 'image' ? '图片' : '资源'}不存在`)
      if (reference.kind === 'image') images.add(realpathSync(existing))
      stats.resourceReferences += 1
    }
  }
  stats.imageFiles = images.size
  return stats
}
