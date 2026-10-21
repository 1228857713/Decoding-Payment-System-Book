# Single-source book implementation plan

> **For agentic workers:** Use executing-plans for the primary implementation, with bounded independent implementation and final review delegated in this session.

**Goal:** 让当前目录只维护一份章节文档，推送后自动校验、构建、发布。

**Architecture:** 公开网站工作树提升为根目录，私有备份历史独立保留。VitePress 直接读取 docs/book，章节元数据与目录从源文件生成。GitHub Actions 在成功检查、测试和构建后发布。

**Tech Stack:** Node 24、VitePress 1.6.4、Vue 3、GitHub Actions、Node test runner。

**Spec:** docs/superpowers/specs/2026-10-21-single-source-design.md

## Global Constraints

- 现有 22 个章节和 249 张图片字节不变。
- 保持现有公开仓库历史、站点地址和章节 URL；不合并私有 Git 历史。
- 不新增后端、数据库或跨仓库凭据。
- PR 不部署；main 检查、测试、构建成功后才部署。
- 构建结果和依赖不提交 Git。

## Review Focus

- 修改合法正文应能构建，不能受旧哈希清单限制。
- 新增章节应自动进入目录，重复排序和缺标题有明确错误。
- 图片与站内链接失效必须在发布前失败。
- 代码块里的示例链接不应被当作真实依赖。
- 公开 Git 历史和产物不得包含私有 OCR 档案或本机恢复目录。

## Tasks

- [x] 1. 核验两个远端，记录迁移前章节/原图哈希，保留本机私有 Git 恢复点，将网站提升为根目录。
- [x] 2. 在 scripts/book-content.mjs 实现章节发现、排序和结构校验；tests/content.test.mjs 验证正文修改、新章节、重复排序、缺图、坏链接及代码示例处理。
- [x] 3. 网站配置与全书目录共用动态章节数据；删除导入器和旧哈希清单。
- [x] 4. 统一构建与清理入口，更新 PR/main 工作流、README 和 AGENTS.md。
- [x] 5. 运行测试、两种路径生产构建和浏览器检查，独立复核后提交。
- [x] 6. main 正常快进推送，确认远端 CI 和线上页面；补充验收记录。
