import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadBookPages, validateContent } from '../scripts/book-content.mjs'

async function fixture(t, chapter = '---\ntitle: 第一章\n---\n\n# 第一章\n\n正文。\n') {
  const root = await mkdtemp(path.join(tmpdir(), 'payment-book-content-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const put = async (relative, content) => {
    const file = path.join(root, relative)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, content)
  }
  await put('docs/book/ch00.md', chapter)
  await put('docs/index.md', '# 首页\n\n[开始阅读](/book/ch00)\n')
  return { root, put }
}

test('正文可直接修改，不依赖外部书稿或历史 hash', async (t) => {
  const { root, put } = await fixture(t)
  let result = await validateContent(root)
  assert.equal(result.pages, 2)
  assert.equal(result.chapters, 1)
  await put('docs/book/ch00.md', '# 改过的标题\n\n正文已修订，也可以增加段落。\n')
  result = await validateContent(root)
  assert.equal(result.chapters, 1)
  assert.equal(loadBookPages(root)[0].title, '改过的标题')
})

test('新章节自动进入目录，未指定 order 时采用 chXX 文件名', async (t) => {
  const { root, put } = await fixture(t)
  await put('docs/book/ch01.md', '# 第二章\n\n新正文。\n')
  assert.deepEqual(loadBookPages(root), [
    { order: 0, title: '第一章', link: '/book/ch00' },
    { order: 1, title: '第二章', link: '/book/ch01' },
  ])
  assert.equal((await validateContent(root)).chapters, 2)
})

test('支持正常 YAML 标题与显式顺序，slug 可用显式 order 排序', async (t) => {
  const { root, put } = await fixture(t)
  await put('docs/book/appendix.md', '---\ntitle: >-\n  支付\n  修订版\norder: -2\n---\n# 附录正文标题\n')
  await put('docs/book/ch00.md', "---\ntitle: '第一章：已改名'\norder: 4.5\n---\n# 真实正文标题\n")
  assert.deepEqual(loadBookPages(root), [
    { order: -2, title: '支付 修订版', link: '/book/appendix' },
    { order: 4.5, title: '第一章：已改名', link: '/book/ch00' },
  ])
})

test('拒绝重复 order、缺标题、无 H1 或多个 H1', async (t) => {
  const duplicate = await fixture(t)
  await duplicate.put('docs/book/ch01.md', '---\norder: 0\n---\n# 第二章\n')
  assert.throws(() => loadBookPages(duplicate.root), /重复.*order|order.*重复/i)
  for (const chapter of ['正文没有标题。\n', '---\ntitle: ""\n---\n# 有 H1\n', '# 一\n\n# 二\n']) {
    const current = await fixture(t, chapter)
    assert.throws(() => loadBookPages(current.root), /标题|H1/)
  }
})

test('拒绝错误类型的标题、非有限数字顺序、无排序 slug 与空书稿', async (t) => {
  for (const frontmatter of ['title: 12', 'title: []', 'order: "2"', 'order: .inf']) {
    const { root } = await fixture(t, `---\n${frontmatter}\n---\n# 正文标题\n`)
    assert.throws(() => loadBookPages(root), /title|标题|order/)
  }
  const slug = await fixture(t)
  await slug.put('docs/book/new-section.md', '# 新章节\n')
  assert.throws(() => loadBookPages(slug.root), /order/)
  const empty = await fixture(t)
  await rm(path.join(empty.root, 'docs/book/ch00.md'))
  assert.throws(() => loadBookPages(empty.root), /章节|书稿|chapter/i)
})

test('缺图片与坏站内页面链接会失败', async (t) => {
  const image = await fixture(t, '# 正文\n\n![缺图](./assets/missing.png)\n')
  await assert.rejects(validateContent(image.root), /图片.*不存在|missing.*image/i)
  const page = await fixture(t, '# 正文\n\n[不存在](/book/missing?from=test#section)\n')
  await assert.rejects(validateContent(page.root), /页面.*不存在|链接.*不存在/i)
})

test('正确处理 URL 编码、查询参数、hash、目录首页和 public 资源', async (t) => {
  const { root, put } = await fixture(t, '# 正文\n\n![支付图](./assets/%E6%94%AF%E4%BB%98%20%E5%9B%BE%23%3F.png?download=1#figure)\n\n[说明](/guide/%E8%AF%B4%E6%98%8E.html?lang=zh#intro)\n\n[目录首页](/guide/)\n\n[同页](?view=full#here)\n\n<img src="/logo.svg?v=1#logo">\n')
  await put('docs/book/assets/支付 图#?.png', 'new image bytes')
  await put('docs/guide/说明.md', '# 说明\n')
  await put('docs/guide/index.md', '# 指南首页\n')
  await put('docs/public/logo.svg', '<svg/>')
  const result = await validateContent(root)
  assert.equal(result.pages, 4)
  assert.equal(result.imageReferences, 2)
})

test('忽略 fence、inline code、HTML 注释中的示例，不把代码里的 # 算 H1', async (t) => {
  const { root, put } = await fixture(t, '# 正文\n\n```md\n# 示例标题\n![不存在](missing.png)\n[不存在](/not-a-page)\n<img src="missing.png">\n```\n\n`![不存在](missing.png)` 与 `<img src="missing.png">` 是示例。\n\n<!-- <img src="missing.png"><a href="/missing">示例</a> -->\n')
  await put('docs/.vitepress/internal.md', '# 内部\n\n![故意不存在](missing.png)\n')
  await put('docs/superpowers/plan.md', '# 计划\n\n[不检查](/missing)\n')
  await put('docs/book/assets/example.md', '# 资源目录不是页面\n')
  const result = await validateContent(root)
  assert.equal(result.pages, 2)
  assert.equal(result.imageReferences, 0)
})

test('检查 HTML 页面及资源引用，拒绝本地 file 链接和越界图片', async (t) => {
  const html = await fixture(t, '# 正文\n\n<a href="/missing">坏链接</a>\n')
  await assert.rejects(validateContent(html.root), /页面.*不存在|链接.*不存在/i)
  const source = await fixture(t, '# 正文\n\n<img src="./assets/no.png">\n')
  await assert.rejects(validateContent(source.root), /图片.*不存在|资源.*不存在/i)
  const machine = await fixture(t, '# 正文\n\n[机器文件](file:///Users/example/private.pdf)\n')
  await assert.rejects(validateContent(machine.root), /file|机器|本地文件/i)
  const outside = await fixture(t, '# 正文\n\n![越界](../../../outside.png)\n')
  await assert.rejects(validateContent(outside.root), /越界|docs.*之外|outside/i)
})

test('支持带点 slug 的 clean URL；带斜线的页面只能解析到目录首页', async (t) => {
  const { root, put } = await fixture(t, '# 正文\n\n[新增章节](/book/chapter.v2?edition=2#intro)\n')
  await put('docs/book/chapter.v2.md', '---\norder: 1\n---\n# 新增章节\n')
  assert.equal((await validateContent(root)).chapters, 2)
  await put('docs/book/ch00.md', '# 正文\n\n[错误目录路径](/book/chapter.v2/)\n')
  await assert.rejects(validateContent(root), /页面.*不存在/)
})

test('解析引用式图片与 HTML srcset、带引号的 >，拒绝符号链接越界', async (t) => {
  const { root, put } = await fixture(t, '# 正文\n\n![引用图][图]\n\n[图]: ./assets/new.png?download=1#figure\n\n<source srcset="./assets/new.png 1x, ./assets/large.png 2x">\n<img alt="a > b" src="./assets/new.png">\n')
  await put('docs/book/assets/new.png', 'new image')
  await put('docs/book/assets/large.png', 'large image')
  const result = await validateContent(root)
  assert.equal(result.imageReferences, 4)
  assert.equal(result.imageFiles, 2)
  await put('outside.png', 'outside docs')
  await symlink(path.join(root, 'outside.png'), path.join(root, 'docs/book/assets/escaped.png'))
  await put('docs/book/ch00.md', '# 正文\n\n![越界](./assets/escaped.png)\n')
  await assert.rejects(validateContent(root), /之外|越界/)
})

test('真实 HTML H1 也计入正文标题；inline code 里的 HTML H1 不计入', async (t) => {
  const { root, put } = await fixture(t, '<h1>HTML 标题</h1>\n\n正文。\n')
  assert.equal(loadBookPages(root)[0].title, 'HTML 标题')
  await put('docs/book/ch00.md', '# 主标题\n\n文字 <h1>多余标题</h1>\n')
  assert.throws(() => loadBookPages(root), /H1/)
  await put('docs/book/ch00.md', '# 主标题\n\n`<h1>代码示例</h1>`\n')
  assert.equal(loadBookPages(root)[0].title, '主标题')
})
