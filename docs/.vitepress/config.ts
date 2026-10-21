import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { imageSize } from 'image-size'
import { loadBookPages } from '../../scripts/book-content.mjs'

const chapters = loadBookPages()
const repository = 'https://github.com/1228857713/Decoding-Payment-System-Book'
const base = process.env.SITE_BASE || '/'

export default defineConfig({
  lang: 'zh-CN',
  title: '图解支付系统',
  titleTemplate: ':title · 图解支付系统',
  description: '《图解支付系统设计与实现》在线阅读版，隐墨星辰著。保留原书图示，按章阅读与全文搜索。',
  base,
  cleanUrls: true,
  srcExclude: ['superpowers/**'],
  lastUpdated: false,
  head: [
    ['meta', { name: 'theme-color', content: '#2f8f64' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
  ],
  markdown: {
    image: { lazyLoading: true },
    config(md) {
      const renderImage = md.renderer.rules.image!
      md.renderer.rules.image = (tokens, index, options, env, self) => {
        const token = tokens[index]
        const source = token.attrGet('src') || ''
        const decodedPath = decodeURIComponent(source.split(/[?#]/, 1)[0])
        if (decodedPath.startsWith('./assets/') && env.path) {
          const dimensions = imageSize(readFileSync(resolve(dirname(env.path), decodedPath)))
          if (dimensions.width && dimensions.height) {
            token.attrSet('width', String(dimensions.width))
            token.attrSet('height', String(dimensions.height))
          }
        }
        return renderImage(tokens, index, options, env, self)
      }
    },
  },
  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: '图解支付系统',
    nav: [
      { text: '目录', link: '/contents' },
      { text: '关于本书', link: '/about' },
    ],
    sidebar: [{
      text: '全书目录',
      items: chapters.map(({ title, link }) => ({ text: title, link })),
    }],
    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一章', next: '下一章' },
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '章节目录',
    darkModeSwitchLabel: '切换深浅色',
    lightModeSwitchTitle: '切换为浅色',
    darkModeSwitchTitle: '切换为深色',
    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            tokenize(text) {
              return Array.from(new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(text))
                .filter((item) => item.isWordLike)
                .map((item) => item.segment.toLowerCase())
            },
          },
        },
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索本书', buttonAriaLabel: '搜索本书' },
              modal: {
                displayDetails: '显示详细结果',
                resetButtonTitle: '清空搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '未找到相关内容',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
      },
    },
    socialLinks: [{ icon: 'github', link: repository, ariaLabel: 'GitHub 仓库与问题反馈' }],
    footer: {
      message: `原著：隐墨星辰 · 本站仅作阅读整理 · <a href="${base}about.html">版权与勘误</a>`,
      copyright: '《图解支付系统设计与实现》V_0.1.0',
    },
  },
})
