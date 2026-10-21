import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

export function getBuildOptions(target = 'local') {
  switch (target) {
    case 'local':
      return { target, base: '/', outDir: 'docs/.vitepress/dist' }
    case 'pages':
      return { target, base: '/Decoding-Payment-System-Book/', outDir: 'docs/.vitepress/dist' }
    case 'cloudflare':
      return { target, base: '/', outDir: 'docs/.vitepress/dist-root' }
    default:
      throw new Error(`Unknown build target: ${JSON.stringify(target)}. Choose local, pages, or cloudflare.`)
  }
}

export async function buildSite(target = 'local') {
  const options = getBuildOptions(target)
  const { validateContent } = await import('./book-content.mjs')
  await validateContent(projectRoot)
  console.log(`Content checks passed. Building ${options.target} site with base ${options.base}`)
  const compiler = path.join(projectRoot, 'node_modules/vitepress/bin/vitepress.js')
  const result = spawnSync(process.execPath, [compiler, 'build', 'docs', '--outDir', options.outDir], {
    cwd: projectRoot,
    env: { ...process.env, SITE_BASE: options.base },
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.signal) throw new Error(`VitePress build terminated by signal ${result.signal}`)
  if (result.status !== 0) throw new Error(`VitePress build failed with exit code ${result.status ?? 1}`)
  return options
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node scripts/build-site.mjs [local|pages|cloudflare]')
    await buildSite(process.argv[2])
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
