# 图解支付系统设计与实现 · 在线阅读版

**[在线阅读](https://1228857713.github.io/Decoding-Payment-System-Book/)** · [全书目录](https://1228857713.github.io/Decoding-Payment-System-Book/contents) · [来源、版权与勘误](https://1228857713.github.io/Decoding-Payment-System-Book/about)

《图解支付系统设计与实现》V_0.1.0，原著作者：**隐墨星辰**，原作者仓库：<https://github.com/yinmo-sc/Decoding-Payment-System-Book>。本仓库将原书整理为 VitePress 网站便于在线阅读，保留原书图示；文字经转换整理仍可能有错误，请与原书核对。内容版权归原作者及相关权利人所有，整理者不宣称已就网站发布单独取得授权。如对内容有异议，请通过 [GitHub Issues](https://github.com/1228857713/Decoding-Payment-System-Book/issues/new) 反馈，核实后将删除相关内容或下架网站。

## 全书章节

| 章节 | Markdown源文件 |
| --- | --- |
| [封面与序言](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch00) | [docs/book/ch00.md](docs/book/ch00.md) |
| [第1章 在线支付系统基本概念](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch01) | [docs/book/ch01.md](docs/book/ch01.md) |
| [第2章 在线支付系统概要设计](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch02) | [docs/book/ch02.md](docs/book/ch02.md) |
| [第3章 核心业务简介](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch03) | [docs/book/ch03.md](docs/book/ch03.md) |
| [第4章 收单结算](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch04) | [docs/book/ch04.md](docs/book/ch04.md) |
| [第5章 收银支付](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch05) | [docs/book/ch05.md](docs/book/ch05.md) |
| [第6章 渠道网关](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch06) | [docs/book/ch06.md](docs/book/ch06.md) |
| [第7章 账务系统](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch07) | [docs/book/ch07.md](docs/book/ch07.md) |
| [第8章 会员与卡中心](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch08) | [docs/book/ch08.md](docs/book/ch08.md) |
| [第9章 商户服务](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch09) | [docs/book/ch09.md](docs/book/ch09.md) |
| [第10章 资金产品](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch10) | [docs/book/ch10.md](docs/book/ch10.md) |
| [第11章 支付安全](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch11) | [docs/book/ch11.md](docs/book/ch11.md) |
| [第12章 技术风险与资损防控](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch12) | [docs/book/ch12.md](docs/book/ch12.md) |
| [第13章 业务ID生成规则](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch13) | [docs/book/ch13.md](docs/book/ch13.md) |
| [第14章 状态机设计思想在支付系统中的广泛应用](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch14) | [docs/book/ch14.md](docs/book/ch14.md) |
| [第15章 渠道开关及渠道路由](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch15) | [docs/book/ch15.md](docs/book/ch15.md) |
| [第16章 支付系统日志设计](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch16) | [docs/book/ch16.md](docs/book/ch16.md) |
| [第17章 分布式支付系统的幂等性原理与实践](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch17) | [docs/book/ch17.md](docs/book/ch17.md) |
| [第18章 分布式流控](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch18) | [docs/book/ch18.md](docs/book/ch18.md) |
| [第19章 一些重要的小点](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch19) | [docs/book/ch19.md](docs/book/ch19.md) |
| [附录](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch20) | [docs/book/ch20.md](docs/book/ch20.md) |
| [后记](https://1228857713.github.io/Decoding-Payment-System-Book/book/ch21) | [docs/book/ch21.md](docs/book/ch21.md) |

新增章节后，网站侧栏与目录会自动发现；如需在仓库说明中展示，再同步补充上面的索引。README 索引不影响网站构建与发布。

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

## 如何修改文档

1. 在上方表格中找到对应的 Markdown 源文件。例如，修改第五章“收银支付”，只需编辑 [docs/book/ch05.md](docs/book/ch05.md)。也可以在 GitHub 打开源文件，点击铅笔 **Edit**，保存并提交到 `main` 后便会触发自动发布。

2. 修改章节标题时，同时更新 frontmatter 的 `title` 和正文的 H1，让两者保持一致。例如第五章的 `title: 第5章 收银支付` 对应 `# 第5章 收银支付`。每章正文必须恰好有一个非空 H1，小节使用 `## 二级标题`、`### 三级标题`。

3. 本章图片放在对应的图片目录，例如 `docs/book/assets/ch05/`；在 `ch05.md` 中使用相对引用：`![原书图示](./assets/ch05/ch05-01.jpg)`。保留原图，不需要复制整份书稿。

4. 根目录 `README.md` 只负责 GitHub 仓库说明，修改它不会修改书稿。网站首页编辑 `docs/index.md`，来源、版权与勘误页编辑 `docs/about.md`。常规正文修改仍只编辑对应的一份章节 Markdown。

5. 改动较大时，建议先在本地预览并检查。首次使用先安装依赖，再启动开发预览：

   ```sh
   npm ci
   npm run dev
   ```

   修改完成后，运行内容检查与生产构建：

   ```sh
   npm run check
   npm run build
   ```

6. 将修改提交并推送到 `main` 后，网站会自动校验、构建和发布；可以在 [GitHub Actions](https://github.com/1228857713/Decoding-Payment-System-Book/actions) 查看执行状态。若提交的是 pull request，则只验证，合并到 `main` 后才发布。

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
