## 1. 准备工作

- [x] 1.1 修复 `src/public/js/components/url-bar.js:77` 的 TypeScript 类型注解 `Record<string, string>`，改为纯 JS
- [x] 1.2 验证 JS 打包：执行 `bun build src/public/js/app.js --outfile src/public/dist/bundle.js --target browser` 确认无错误
- [x] 1.3 在 `.gitignore` 中添加 `src/public/dist/`（如尚未忽略）

## 2. CSS 拆分

- [x] 2.1 创建 `src/public/css/` 目录结构
- [x] 2.2 提取 `tokens.css`：`:root` 变量 + `[data-theme="light"]` 主题（第 11-252 行）
- [x] 2.3 提取 `base.css`：body typography（第 253-272 行）+ `.hidden` 工具类（原第 1601 行）
- [x] 2.4 提取 `sidebar.css`：sidebar + env-selector + global-var-row + cookie-row + collection-tree + tree-items + method-badges + context-menu（第 273-676 行）
- [x] 2.5 提取 `url-bar.css`：url-bar + send-btn + save-btn（第 677-860 行）
- [x] 2.6 提取 `request-panel.css`：main-content + request-tab-bar + request/response-split + request-options + panel-resizer + tabs + kv-editor + body/script-editor + multipart-editor + binary-editor + graphql-editor + auth-panel（第 861-1672 行，去掉 `.hidden` 和 `@keyframes sendPulse`）
- [x] 2.7 提取 `response.css`：response-viewer + json-highlight + response-search-bar + response-format-bar + virtual-scroll（第 1673-2011 行）
- [x] 2.8 提取 `modal.css`：modal + confirm-dialog + env-manager + import/export（第 2012-2335 行）
- [x] 2.9 提取 `utilities.css`：toast + empty-state + shortcut-hints + scrollbar + utility-classes + loading-spinner + reduced-motion + selection + focus-visible（第 2336-2720 行，去掉 animations）
- [x] 2.10 提取 `animations.css`：所有 `@keyframes`（含原第 819 行的 `sendPulse`）+ 动画相关样式（第 2528-2720 行中的 keyframes 部分）
- [x] 2.11 提取 `history.css`：history-panel（第 2721-3657 行）
- [x] 2.12 提取 `runner.css`：collection-runner-panel（第 3658-3942 行）
- [x] 2.13 创建 `index.css` 入口文件，按顺序 `@import` 所有拆分文件
- [x] 2.14 将原 `style.css` 替换为 `index.css` 的内容（保持开发模式兼容）

## 3. 构建配置

- [x] 3.1 更新 `package.json` scripts：添加 `build`、`build:css`、`build:js` 命令
- [x] 3.2 验证 CSS 打包：执行 `bun run build:css` 确认生成 `dist/bundle.css`
- [x] 3.3 验证完整构建：执行 `bun run build` 确认 CSS 和 JS 均成功打包

## 4. HTML 更新与验证

- [x] 4.1 保持 `src/public/index.html` 引用源文件（`/css/style.css` 和 `/js/app.js`），符合 D4 开发模式设计
- [x] 4.2 启动 `bun run dev`，在浏览器中验证页面样式和功能正常
- [x] 4.3 对比拆分前后页面截图，确认零视觉差异
