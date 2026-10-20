import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.resolve(siteRoot, '../markdown/图解支付系统设计与实现')
const bookRoot = path.join(siteRoot, 'docs/book')
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const metadata = JSON.parse(await readFile(path.join(siteRoot, 'docs/.vitepress/book-data.json'), 'utf8'))
const manifestOnly = process.argv.includes('--manifest-only')

function confined(base, relative) {
  assert(!path.isAbsolute(relative), `Private absolute source path: ${relative}`)
  const result = path.resolve(base, relative)
  assert(result.startsWith(`${base}${path.sep}`), `Path outside expected directory: ${relative}`)
  return result
}

function proseOnly(markdown) {
  const output = []
  let fence
  for (const line of markdown.split('\n')) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined
      continue
    }
    if (marker) fence = marker[1]
    else output.push(line)
  }
  assert(!fence, 'Unclosed code fence')
  return output.join('\n')
}

async function allFiles(directory) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...await allFiles(full))
    else result.push(full)
  }
  return result
}

assert(Array.isArray(metadata), 'Book data must be an array')
assert.equal(metadata.length, 22, 'Expected 22 book units')
const actualFiles = await allFiles(bookRoot)
const markdownFiles = actualFiles.filter((file) => file.endsWith('.md'))
assert.equal(markdownFiles.length, 22, 'Expected 22 generated Markdown pages')
let references = 0
const expectedImageFiles = new Set()
const sourceImageHashes = []
const copiedImageHashes = []
for (const [index, unit] of metadata.entries()) {
  const chapter = `ch${String(index).padStart(2, '0')}`
  assert.equal(unit.order, index, 'Book units must be ordered from 00 through 21')
  assert.equal(unit.link, `/book/${chapter}`, 'Unexpected reading route')
  assert.equal(typeof unit.title, 'string')
  const sourceFile = confined(sourceRoot, unit.source)
  const originalBytes = manifestOnly ? undefined : await readFile(sourceFile)
  const original = originalBytes?.toString('utf8')
  if (!manifestOnly) assert.equal(sha256(originalBytes), unit.sourceSha256, `${chapter}: source changed since import`)
  const imported = await readFile(path.join(bookRoot, `${chapter}.md`), 'utf8')
  const frontmatter = imported.match(/^---\ntitle: ([^\n]+)\n---\n\n/)
  assert(frontmatter, `${chapter}: expected title frontmatter`)
  assert.equal(JSON.parse(frontmatter[1]), unit.title, `${chapter}: wrong page title`)
  const body = imported.slice(frontmatter[0].length)
  assert.equal(sha256(body), unit.bodySha256, `${chapter}: imported body changed`)
  const prose = proseOnly(body)
  assert.equal([...prose.matchAll(/^#\s+\S.*$/gm)].length, 1, `${chapter}: expected one H1`)
  const imageReferences = [...prose.matchAll(/!\[[^\]\n]*\]\(([^\s)]+)\)/g)].map((match) => match[1])
  const htmlImages = [...prose.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1])
  assert.equal(htmlImages.length, 0, `${chapter}: HTML images need an explicit import mapping`)
  assert.equal(imageReferences.length, unit.imageCount, `${chapter}: image reference count changed`)
  assert.equal(unit.images.length, unit.imageCount, `${chapter}: incomplete image manifest`)
  let recovered = body
  const reverseMappings = new Map()
  for (const [imageIndex, image] of unit.images.entries()) {
    assert.equal(image.path, imageReferences[imageIndex], `${chapter}: image order changed`)
    assert(image.path.startsWith(`./assets/${chapter}/`), `${chapter}: image must use a base-safe relative path`)
    const target = confined(bookRoot, image.path)
    const sourceImage = confined(sourceRoot, image.source)
    const originalImageBytes = manifestOnly ? undefined : await readFile(sourceImage)
    const copiedImageBytes = await readFile(target)
    const originalHash = manifestOnly ? image.sha256 : sha256(originalImageBytes)
    const copiedHash = sha256(copiedImageBytes)
    assert.equal(originalHash, image.sha256, `${chapter}: source image changed`)
    assert.equal(copiedHash, originalHash, `${chapter}: image bytes changed during import`)
    expectedImageFiles.add(target)
    sourceImageHashes.push(originalHash)
    copiedImageHashes.push(copiedHash)
    reverseMappings.set(image.path, `images/${path.basename(image.source)}`)
  }
  for (const [target, source] of reverseMappings) recovered = recovered.replaceAll(`](${target})`, `](${source})`)
  if (!manifestOnly) assert.equal(recovered, original, `${chapter}: content changed beyond image paths and frontmatter`)
  references += imageReferences.length
}
assert.equal(references, 249, 'Expected 249 book image references')
const physicalImages = actualFiles.filter((file) => /\.(?:jpe?g|png|webp|gif|svg)$/i.test(file))
assert.equal(physicalImages.length, 249, 'Expected 249 physical image files')
assert.equal(new Set(copiedImageHashes).size, 243, 'Expected 243 unique source image hashes')
assert.deepEqual(copiedImageHashes, sourceImageHashes, 'Image hash occurrence sequence differs')
assert(physicalImages.every((file) => expectedImageFiles.has(file)), 'Unexpected generated image file')
assert(actualFiles.every((file) => file.endsWith('.md') || expectedImageFiles.has(file)), 'Unexpected non-book file, PDF, or OCR output in imported content')
console.log(JSON.stringify({ mode: manifestOnly ? 'manifest' : 'source', units: metadata.length, h1PerPage: 1, imageReferences: references, physicalImageFiles: physicalImages.length, uniqueImageHashes: new Set(copiedImageHashes).size, sourceBodiesPreserved: manifestOnly ? 'verified against recorded hashes' : true, imageBytesPreserved: true, relativeImagesValid: true }, null, 2))
