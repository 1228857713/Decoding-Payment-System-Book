import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import ReaderTools from './components/ReaderTools.vue'
import ImageViewer from './components/ImageViewer.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(ReaderTools),
      'home-hero-after': () => h(ReaderTools),
      'layout-bottom': () => h(ImageViewer),
    })
  },
}
