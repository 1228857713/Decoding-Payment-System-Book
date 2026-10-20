# 阅读站验收记录

## 发布与源内容

- 复用现有仓库 `1228857713/Decoding-Payment-System-Book`，首个网站提交 `93210bd5ca828cdcf57dd93f70b38cc8d002c350` 已由 GitHub API 确认。
- GitHub Pages 工作流 `39402067757` 的 build 和 deploy 均成功。
- 公网首页和第五章均 HTTP 200：`https://1228857713.github.io/Decoding-Payment-System-Book/`。
- `npm run check` 与 `npm run check:source` 通过：22 个阅读单元、249 个图片引用/文件，243 个唯一图像哈希，正文除图片路径与 frontmatter 外与转换源一致。
- 原仓库 27 个 PDF 未更改；README 原文在新增说明之后逐字保留。

## 浏览器验收

使用独立 Chrome 会话验证本地生产产物，并在真实 GitHub Pages 网站复核核心交互：

- 中文“收银支付”“幂等性”“渠道路由”均返回相应章节结果，锚点和资源路径包含正确部署 base。
- 第五章保留 15 图；所有正文原图在构建时加入宽高，避免懒加载引起版面跳动。
- Tab 选图、Enter 打开放大、Esc 关闭并返回焦点通过。
- 字号三档可切换，刷新后保留。
- 首页显式“继续阅读”从保存的 1600px 返回 1600px；普通切章回到章首。
- 本地 22 单元在 320px 全量检查无文档横向溢出；768/1024/1440px 抽查第五、七、十七章通过。线上第五章四种宽度复核通过。
- 浏览器无运行时异常，检查过程无失败资源响应。
- 独立内容审查确认 1175 处本地 href/src 可解析，生产 HTML 不包含本机路径、内部方案文档或转换中间资料。

## 部署路径与限制

- Pages 子路径产物：`docs/.vitepress/dist`，base 为 `/Decoding-Payment-System-Book/`。
- Cloudflare 独立产物：`npm run build:cloudflare` 输出 `docs/.vitepress/dist-root`，base 固定为 `/`。Cloudflare 浏览器当前未登录，后续由用户本人完成账户登录。
- 稳定版 VitePress 1.6.4 的上游 Vite/esbuild 开发服务器依赖存在 npm 通告；当前部署只发布静态产物，不发布或运行开发服务器。未为消除通告改用 alpha 版。
