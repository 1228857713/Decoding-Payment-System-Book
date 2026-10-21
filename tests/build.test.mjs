import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { getBuildOptions } from '../scripts/build-site.mjs'
import { cleanGenerated } from '../scripts/clean.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

test('local builds and previews use the site root by default', () => {
  assert.deepEqual(getBuildOptions(), {
    target: 'local', base: '/', outDir: 'docs/.vitepress/dist',
  })
  assert.deepEqual(getBuildOptions('local'), getBuildOptions())
})

test('Pages uses the existing project URL while Cloudflare has isolated root output', () => {
  assert.deepEqual(getBuildOptions('pages'), {
    target: 'pages', base: '/Decoding-Payment-System-Book/', outDir: 'docs/.vitepress/dist',
  })
  assert.deepEqual(getBuildOptions('cloudflare'), {
    target: 'cloudflare', base: '/', outDir: 'docs/.vitepress/dist-root',
  })
})

test('unknown build targets fail before loading content or starting a compiler', () => {
  for (const target of ['unknown', '', '../../', '__proto__']) {
    assert.throws(() => getBuildOptions(target), /Unknown build target/)
  }
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts/build-site.mjs'), 'unknown'], {
    cwd: tmpdir(), encoding: 'utf8',
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Unknown build target/)
  assert.doesNotMatch(result.stderr, /ERR_MODULE_NOT_FOUND|Cannot find module/)
})

test('clean removes only generated output and is safe to run twice', async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'payment-book-clean-'))
  t.after(() => rm(fixture, { recursive: true, force: true }))
  const preserved = [
    'docs/book/ch05.md', 'docs/book/assets/ch05/diagram.jpg',
    'docs/.vitepress/config.ts', 'docs/.vitepress/theme/index.ts',
    '.git/config', 'node_modules/vitepress/package.json', 'README.md',
  ]
  for (const file of preserved) {
    await mkdir(path.dirname(path.join(fixture, file)), { recursive: true })
    await writeFile(path.join(fixture, file), `keep ${file}`)
  }
  const outputs = ['docs/.vitepress/cache', 'docs/.vitepress/dist', 'docs/.vitepress/dist-root']
  for (const directory of outputs) {
    await mkdir(path.join(fixture, directory), { recursive: true })
    await writeFile(path.join(fixture, directory, 'generated.txt'), 'rebuild me')
  }
  await cleanGenerated(fixture)
  await cleanGenerated(fixture)
  for (const directory of outputs) {
    await assert.rejects(readFile(path.join(fixture, directory, 'generated.txt')), { code: 'ENOENT' })
  }
  for (const file of preserved) {
    assert.equal(await readFile(path.join(fixture, file), 'utf8'), `keep ${file}`)
  }
})

test('clean refuses a generated-output parent symlink outside the project', async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'payment-book-clean-link-'))
  const external = await mkdtemp(path.join(tmpdir(), 'payment-book-keep-'))
  t.after(() => Promise.all([fixture, external].map((directory) => rm(directory, { recursive: true, force: true }))))
  await mkdir(path.join(fixture, 'docs'))
  await mkdir(path.join(external, 'dist'))
  await writeFile(path.join(external, 'dist/source.md'), 'outside data')
  await symlink(external, path.join(fixture, 'docs/.vitepress'), 'dir')
  await assert.rejects(cleanGenerated(fixture), /outside the project/)
  assert.equal(await readFile(path.join(external, 'dist/source.md'), 'utf8'), 'outside data')
})

test('clean never treats a chapter directory reached through a symlink as output', async (t) => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'payment-book-clean-source-'))
  t.after(() => rm(fixture, { recursive: true, force: true }))
  const chapter = path.join(fixture, 'docs/book/dist/ch05.md')
  await mkdir(path.dirname(chapter), { recursive: true })
  await writeFile(chapter, 'chapter source')
  await symlink(path.join(fixture, 'docs/book'), path.join(fixture, 'docs/.vitepress'), 'dir')
  await assert.rejects(cleanGenerated(fixture), /symbolic link/)
  assert.equal(await readFile(chapter, 'utf8'), 'chapter source')
})
