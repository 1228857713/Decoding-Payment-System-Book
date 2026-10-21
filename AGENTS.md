# AGENTS.md

面向 AI 代理与贡献者的快速须知。

## 项目目的

《图解支付系统设计与实现》（隐墨星辰著，V_0.1.0）的在线阅读网站。仓库根目录即 VitePress 1.6.4 站点项目，正文只保留 Markdown 单一来源。

## 内容源与规则

- 正文唯一来源：`docs/book/*.md`，一章一个文件；图片在 `docs/book/assets/`
- 排序：`chXX.md` 按文件名数字升序；可用 frontmatter `order`（数字、唯一）覆盖，非 `chXX` 文件名必须显式 `order`
- 标题：默认取正文 H1，可用 frontmatter `title` 覆盖
- 每章必须恰好有一个非空有效 H1
- 新增章节自动进入侧栏与目录页，不需要手工登记

## 关键入口

- `scripts/book-content.mjs` — 章节发现（`loadBookPages`）与内容校验（`validateContent`）的唯一实现
- `docs/.vitepress/config.ts` — 站点配置；侧栏由 `loadBookPages()` 生成
- `docs/contents.data.js` — 目录页数据加载器（VitePress 构建时数据加载器，build-time data loader），监视 `docs/book/*.md`
- `docs/contents.md` — 目录页，通过上述加载器渲染章节清单，不硬编码章节

## 常用命令（Node 24）

- `npm ci` — 安装依赖
- `npm run dev` — 本地开发服务器
- `npm run check` — 内容校验
- `npm test` — 单元测试
- `npm run build` — 根路径构建 → `docs/.vitepress/dist`
- `npm run build:pages` — GitHub Pages 子路径构建 → `docs/.vitepress/dist`
- `npm run build:cloudflare` — 根路径构建 → `docs/.vitepress/dist-root`
- `npm run preview` — 预览 `docs/.vitepress/dist`（不预览 `dist-root`）
- `npm run clean` — 清理 cache/dist/dist-root

## CI 约定

- Pull request 只运行测试与构建校验，不发布
- 推送到 `main`：测试 + 内容校验 + 构建全部通过后自动发布 GitHub Pages
- `node_modules/`、`docs/.vitepress/cache/`、`docs/.vitepress/dist*` 为生成物，不提交

## 署名与版权

- 书名、作者（隐墨星辰）与版本信息必须保留；原作者仓库 <https://github.com/yinmo-sc/Decoding-Payment-System-Book>，在线阅读 <https://1228857713.github.io/Decoding-Payment-System-Book/>
- 内容版权归原作者及相关权利人所有，整理者不宣称已单独取得发布授权；异议与勘误走 [Issues](https://github.com/1228857713/Decoding-Payment-System-Book/issues/new)
