## Why

项目 CSS 当前为单文件 3942 行（`src/public/css/style.css`），随着功能增长维护成本持续上升。前端 JS 约 20 个模块文件直接由浏览器加载，无打包合并。需要引入构建流程，将 CSS 按功能区域拆分为独立文件，同时打包 CSS 和 JS 为单一产物，提升可维护性并减少运行时 HTTP 请求。

## What Changes

- 将 `style.css`（3942 行）拆分为 ~12 个按功能区域划分的 CSS 文件
- 新增 CSS 入口文件 `index.css`，通过 `@import` 聚合所有拆分文件
- 引入 `bun build` 构建步骤，打包 CSS 和 JS 为 `dist/bundle.css` + `dist/bundle.js`
- 更新 `index.html` 引用路径指向构建产物
- 更新 `package.json` scripts（`build`、`build:css`、`build:js`）
- 修复 `url-bar.js` 中残留的 TypeScript 类型注解（`Record<string, string>`）
- 将 `dist/` 目录加入 `.gitignore`

## 非目标

- 不改变任何现有样式（纯结构拆分，零视觉差异）
- 不引入第三方 CSS 预处理器（PostCSS、Sass 等）
- 不改变前端 JS 组件架构
- 不改变后端代码
- 不做 CSS 代码清理或优化（如合并重复选择器、删除未使用样式）

## Capabilities

### New Capabilities
- `build-pipeline`: 前端构建流程 — bun build 打包 CSS 和 JS，构建脚本配置

### Modified Capabilities
（无 spec 层面的行为变更，纯内部重构）

## Impact

- **前端文件结构**: `src/public/css/` 从单文件变为多文件目录
- **HTML**: `index.html` 的 `<link>` 和 `<script>` 引用路径变更
- **构建配置**: `package.json` 新增 `build` 相关 scripts
- **开发体验**: 修改 CSS/JS 后需运行 `bun run build` 或在 `bun run dev` 时自动构建
- **Git**: `dist/` 产物不再提交（或可选提交）
