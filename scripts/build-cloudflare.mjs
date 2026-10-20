import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const siteRoot = fileURLToPath(new URL('../', import.meta.url))
const vitepress = fileURLToPath(new URL('../node_modules/vitepress/bin/vitepress.js', import.meta.url))
const result = spawnSync(process.execPath, [vitepress, 'build', 'docs', '--outDir', 'docs/.vitepress/dist-root'], {
  cwd: siteRoot,
  env: { ...process.env, SITE_BASE: '/' },
  stdio: 'inherit',
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
