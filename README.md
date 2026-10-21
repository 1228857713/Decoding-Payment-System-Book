# 图解支付系统设计与实现 · 在线阅读版

**[在线阅读](https://1228857713.github.io/Decoding-Payment-System-Book/)** · [全书目录](https://1228857713.github.io/Decoding-Payment-System-Book/contents) · [来源、版权与勘误](https://1228857713.github.io/Decoding-Payment-System-Book/about)

《图解支付系统设计与实现》V_0.1.0，原著作者：**隐墨星辰**，原作者仓库：<https://github.com/yinmo-sc/Decoding-Payment-System-Book>。本仓库将原书整理为 VitePress 网站便于在线阅读，保留原书图示；文字经转换整理仍可能有错误，请与原书核对。内容版权归原作者及相关权利人所有，整理者不宣称已就网站发布单独取得授权。如对内容有异议，请通过 [GitHub Issues](https://github.com/1228857713/Decoding-Payment-System-Book/issues/new) 反馈，核实后将删除相关内容或下架网站。

## 项目结构

本仓库根目录即是站点项目（VitePress 1.6.4）：

- `docs/book/*.md` — 唯一正文来源，一章一个文件；`docs/book/assets/` 为正文引用的原图
- `docs/contents.md` — 目录页，章节清单由数据加载器自动生成
- `docs/about.md` — 版权与勘误说明
- `scripts/book-content.mjs` — 章节发现与内容校验的唯一实现，供配置、目录数据加载器和校验脚本共用
- `docs/.vitepress/config.ts` — 站点配置，侧栏与目录均从上述加载器读取

不维护 PDF、正文副本或哈希锁定清单；正文只以 `docs/book/` 下的 Markdown 为准。

## 章节自动发现

- 章节无需登记：新增 `docs/book/chXX.md`（按文件名数字升序）或带显式 frontmatter `order` 的其他 `.md` 章节，即可自动进入侧栏和目录
- `chXX.md` 的顺序默认取文件名数字；非 `chXX` 文件名或需要自定义顺序时，在 frontmatter 写 `order`（数字，不得重复）
- 章节标题默认取正文 H1，可用 frontmatter `title` 覆盖
- 每章正文必须恰好有一个非空的有效 H1，否则校验失败
- 新增章节后目录页（`docs/contents.md`）自动包含，无需手工修改

## 本地开发

要求 Node 24。常用命令：

| 命令 | 用途 |
| --- | --- |
| `npm ci` | 安装锁定版本的依赖 |
| `npm run dev` | 启动本地开发服务器，实时预览 |
| `npm run check` | 校验内容：章节发现、H1/order 约束、链接与图片引用等 |
| `npm test` | 运行单元测试（Node 内置测试运行器） |
| `npm run build` | 本地根路径构建，产物在 `docs/.vitepress/dist` |
| `npm run build:pages` | GitHub Pages 构建子路径，产物同样写入 `docs/.vitepress/dist` |
| `npm run build:cloudflare` | Cloudflare 根路径构建，产物在 `docs/.vitepress/dist-root` |
| `npm run preview` | 本地预览最近一次构建的 `docs/.vitepress/dist`（仅此产物，不预览 `dist-root`） |
| `npm run clean` | 删除 `docs/.vitepress/` 下的 cache、dist、dist-root 产物 |

产物说明：`npm run build` 与 `npm run build:pages` 都输出到 `docs/.vitepress/dist`，区别只在站点 base（分别为 `/` 与 `/Decoding-Payment-System-Book/`），后者会覆盖前者；`npm run build:cloudflare` 输出到独立的 `docs/.vitepress/dist-root`（根路径），互不影响。

## 构建与发布

- 推送到 `main`：CI 依次执行 `npm test` 与 `npm run build:pages`（构建前先做内容校验），全部通过后把 `docs/.vitepress/dist` 发布到 GitHub Pages
- Pull request：仅执行同样的测试与构建校验，不发布
- `node_modules/`、`docs/.vitepress/cache/` 及构建产物不提交仓库
