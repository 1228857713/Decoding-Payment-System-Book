# 支付系统阅读站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已验收的图书 Markdown 发布为可搜索、可移动阅读的网站。

**Architecture:** VitePress 静态构建，元数据驱动目录。Vue 组件负责图片查看与浏览器阅读偏好；两个托管目标分别构建正确 base。

**Tech Stack:** VitePress 1.6.4、Vue 3、Node 24、GitHub Pages。

**Spec:** `docs/superpowers/specs/2026-10-20-payment-book-design.md`

## Global Constraints

保留原 PDF 和原 README 内容；不重写已导入正文。原著为隐墨星辰 V_0.1.0。仅使用已授权免费托管，不提交本地凭据和转换中间文件。

## Review Focus

中文查询与索引分词一致；子路径图片和搜索链接正确；长表格不撑破移动视口；图片对话框可键盘退出；仅显式继续阅读恢复位置，普通跳章不强制滚动。

### Task 1: 阅读站及内容

**Files:** `package.json`、`docs/.vitepress/config.ts`、`docs/index.md`、`docs/contents.md`、`docs/about.md`、`scripts/check-content.mjs`。

- [x] 以 `book-data.json` 的 22 单元生成有序目录，配置中文本地搜索。
- [x] 配置纯静态构建和 base 环境变量，明确署名与版权联系方式。
- [x] 运行内容完整性校验和两种 base 的生产构建。

### Task 2: 阅读交互

**Files:** `docs/.vitepress/theme/index.ts`、`style.css`、`components/ImageViewer.vue`、`components/ReaderTools.vue`。

- [x] 实现原图可访问对话框与原图链接。
- [x] 实现字号和浏览器本地继续阅读。
- [x] 浏览器验证中文搜索、放大/退出、阅读偏好及 320/768/1024/1440 视口。

### Task 3: 发布

**Files:** `.github/workflows/deploy.yml`、`README.md`、`.gitignore`。

- [x] 在原 README 前添加网站入口与整理说明，保留下方全文。
- [x] 建立 Node 24 的 Pages 构建部署工作流，提交并 SSH 推送至现有 main。
- [x] 等待工作流完成，打开真实 Pages URL 验证图片与搜索。
- [x] 为 Cloudflare 留下根路径产物与准确构建参数，并报告登录状态。
