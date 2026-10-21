import { loadBookPages } from '../scripts/book-content.mjs'

export default {
  watch: ['./book/*.md'],
  load() {
    return loadBookPages()
  },
}
