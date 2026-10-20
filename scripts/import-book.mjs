import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.resolve(siteRoot, '../markdown/图解支付系统设计与实现')
const bookRoot = path.join(siteRoot, 'docs/book')
const metadataPath = path.join(siteRoot, 'docs/.vitepress/book-data.json')
const sha256 = (content) => createHash('sha256').update(content).digest('hex')
const slash = (value) => value.split(path.sep).join('/')

function withoutFences(markdown) {
  let fence
  return markdown.split(/(?<=\n)/).map((line) => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined
      return '\n'
    }
    if (marker) {
      fence = marker[1]
      return '\n'
    }
    return line
  }).join('')
}

function relativeFile(base, relative) {
  if (path.isAbsolute(relative)) throw new Error(`Expected a relative source path: ${relative}`)
  const resolved = path.resolve(base, relative)
  if (!resolved.startsWith(`${base}${path.sep}`)) throw new Error(`Source path escapes the book: ${relative}`)
  return resolved
}

async function collectUnit(directory, order) {
  const source = slash(path.join(directory, `${directory}.md`))
  const sourceFile = relativeFile(sourceRoot, source)
  const sourceBytes = await readFile(sourceFile)
  const original = sourceBytes.toString('utf8')
  const visible = withoutFences(original)
  const headings = [...visible.matchAll(/^#\s+(.+)$/gm)]
  if (headings.length !== 1) throw new Error(`${source}: expected one H1, found ${headings.length}`)
  const title = headings[0][1].trim()
  const name = `ch${String(order).padStart(2, '0')}`
  const images = []
  const files = new Map()
  const imagePattern = /(!\[[^\]\n]*\]\()([^\s)]+)(\))/g
  let fence
  const body = original.split(/(?<=\n)/).map((line) => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined
      return line
    }
    if (marker) {
      fence = marker[1]
      return line
    }
    return line.replace(imagePattern, (_whole, opening, reference, closing) => {
      if (!reference.startsWith('images/')) throw new Error(`${source}: unexpected image reference ${reference}`)
      const filename = path.posix.basename(reference)
      if (reference !== `images/${filename}` || !/\.(?:jpe?g|png|webp|gif|svg)$/i.test(filename)) {
        throw new Error(`${source}: unsupported image path ${reference}`)
      }
      const sourceImage = slash(path.join(directory, reference))
      const target = `./assets/${name}/${filename}`
      images.push({ source: sourceImage, path: target })
      files.set(target, sourceImage)
      return `${opening}${target}${closing}`
    })
  }).join('')
  for (const [target, sourceImage] of files) {
    const bytes = await readFile(relativeFile(sourceRoot, sourceImage))
    files.set(target, bytes)
  }
  for (const image of images) image.sha256 = sha256(files.get(image.path))
  const vueCandidates = []
  const prose = visible.replace(/<!--[\s\S]*?-->/g, '').replace(/`[^`]*`/g, '')
  for (const match of prose.matchAll(/\{\{|<\/?(?:script|template|style)\b|\bv-[\w-]+\s*=/g)) {
    vueCandidates.push({ source, offset: match.index, token: match[0] })
  }
  return {
    data: { order, title, link: `/book/${name}`, source, imageCount: images.length, sourceSha256: sha256(sourceBytes), bodySha256: sha256(body), images },
    markdown: `---\ntitle: ${JSON.stringify(title)}\n---\n\n${body}`,
    name,
    files,
    vueCandidates,
  }
}

async function main() {
  const entries = await readdir(sourceRoot, { withFileTypes: true })
  const sourceUnits = entries.filter((entry) => entry.isDirectory()).map((entry) => {
    const chapter = entry.name.match(/^第(\d{2})章-/)
    const additional = entry.name.match(/^(00|20|21)-/)
    return chapter || additional ? { directory: entry.name, order: Number((chapter || additional)[1]) } : undefined
  }).filter(Boolean).sort((a, b) => a.order - b.order)
  if (sourceUnits.length !== 22 || sourceUnits.some((unit, index) => unit.order !== index)) {
    throw new Error('Expected exactly 22 source units, ordered 00 through 21')
  }
  // Read and validate every source before replacing generated output.
  const units = []
  for (const unit of sourceUnits) units.push(await collectUnit(unit.directory, unit.order))
  const referenceCount = units.reduce((count, unit) => count + unit.data.imageCount, 0)
  if (referenceCount !== 249) throw new Error(`Expected 249 source image references, found ${referenceCount}`)
  await mkdir(bookRoot, { recursive: true })
  await mkdir(path.dirname(metadataPath), { recursive: true })
  for (const unit of units) {
    const assetDirectory = path.join(bookRoot, 'assets', unit.name)
    await rm(assetDirectory, { recursive: true, force: true })
    if (unit.files.size) await mkdir(assetDirectory, { recursive: true })
    for (const [target, bytes] of unit.files) await writeFile(relativeFile(bookRoot, target), bytes)
    await writeFile(path.join(bookRoot, `${unit.name}.md`), unit.markdown, 'utf8')
  }
  await writeFile(metadataPath, `${JSON.stringify(units.map((unit) => unit.data), null, 2)}\n`, 'utf8')
  const vueCandidates = units.flatMap((unit) => unit.vueCandidates)
  console.log(JSON.stringify({ importedUnits: units.length, imageReferences: referenceCount, imageFiles: units.reduce((count, unit) => count + unit.files.size, 0), uniqueImageHashes: new Set(units.flatMap((unit) => unit.data.images.map((image) => image.sha256))).size, vueCandidates }, null, 2))
}

await main()
