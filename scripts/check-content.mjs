import { validateContent } from './book-content.mjs'

try {
  console.log(JSON.stringify(await validateContent(), null, 2))
} catch (error) {
  console.error(`内容校验失败：${error.message}`)
  process.exitCode = 1
}
