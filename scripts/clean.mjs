import { realpath, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const generatedDirectories = ['docs/.vitepress/cache', 'docs/.vitepress/dist', 'docs/.vitepress/dist-root']

export async function cleanGenerated(root = projectRoot) {
  const resolvedRoot = await realpath(root)
  for (const directory of generatedDirectories) {
    const target = path.join(resolvedRoot, directory)
    let parent
    try {
      parent = await realpath(path.dirname(target))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw error
    }
    const relative = path.relative(resolvedRoot, parent)
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`Refusing to clean ${directory}: its parent resolves outside the project`)
    }
    if (parent !== path.dirname(target)) {
      throw new Error(`Refusing to clean ${directory}: its parent is a symbolic link to another project directory`)
    }
    await rm(target, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: node scripts/clean.mjs')
    await cleanGenerated()
    console.log('Cleaned generated cache and build output. Book content and configuration were preserved.')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
