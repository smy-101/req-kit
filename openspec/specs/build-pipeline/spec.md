# Capability: build-pipeline

## Purpose

Frontend CSS 拆分与构建流程 — 将单一 CSS 文件按功能区域拆分为独立模块，提供 `bun build` 打包命令生成部署产物，同时保持开发模式热重载正常工作。

## Requirements

### Requirement: CSS 按功能区域拆分
`src/public/css/style.css` 必须拆分为独立的功能区域文件，通过 `css/index.css` 入口文件的 `@import` 聚合。拆分后的样式输出必须与拆分前完全一致（零视觉差异）。

#### Scenario: 拆分后页面外观无变化
- **WHEN** 使用 bun build 打包拆分后的 CSS 并加载页面
- **THEN** 页面所有元素的样式、布局、颜色、动画与拆分前完全一致

#### Scenario: 开发模式可直接使用源文件
- **WHEN** `index.html` 引用 `css/style.css`（保留为入口的副本或重定向）
- **THEN** 开发模式下页面样式正常渲染

### Requirement: 前端构建流程
系统必须提供 `bun run build` 命令，将 CSS 和 JS 打包到 `src/public/dist/` 目录。

#### Scenario: 构建生成 CSS 产物
- **WHEN** 执行 `bun run build`
- **THEN** 生成 `src/public/dist/bundle.css`，包含所有拆分 CSS 的合并内容

#### Scenario: 构建生成 JS 产物
- **WHEN** 执行 `bun run build`
- **THEN** 生成 `src/public/dist/bundle.js`，包含所有前端 JS 的打包内容

#### Scenario: 分别构建 CSS 和 JS
- **WHEN** 执行 `bun run build:css`
- **THEN** 仅生成 `src/public/dist/bundle.css`
- **WHEN** 执行 `bun run build:js`
- **THEN** 仅生成 `src/public/dist/bundle.js`

### Requirement: HTML 引用源文件，构建产物供部署使用
`index.html` 始终引用源文件（`/css/style.css` 和 `/js/app.js`），确保开发模式下热重载正常工作。`bun run build` 生成的 `dist/bundle.css` 和 `dist/bundle.js` 供生产部署使用，部署脚本负责替换引用路径。

#### Scenario: 开发模式使用源文件
- **WHEN** 启动 `bun run dev` 并加载页面
- **THEN** 浏览器加载 `/css/style.css`（通过 `@import` 聚合拆分文件）和 `/js/app.js`，样式和功能正常

#### Scenario: 构建产物可供部署使用
- **WHEN** 执行 `bun run build` 后将 `index.html` 中的引用路径替换为 `/dist/` 路径
- **THEN** 浏览器加载 `/dist/bundle.css` 和 `/dist/bundle.js`，样式和功能正常

### Requirement: JS 构建无错误
前端 JS 代码中不得包含 TypeScript 语法，确保 bun build 能正常打包。

#### Scenario: JS 打包成功
- **WHEN** 执行 `bun run build:js`
- **THEN** 打包成功完成，无语法错误
