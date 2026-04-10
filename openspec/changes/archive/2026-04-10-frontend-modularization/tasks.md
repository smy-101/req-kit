## 1. 工具模块提取（无破坏性，可独立验证）

- [x] 1.1 创建 `utils/sse-parser.js` — 从 `api.js` 提取 `parseSSEStream(reader, callbacks)`，`api.js` 的 `sendRequestStream` 和 `runCollection` 改为调用此函数
- [x] 1.2 创建 `utils/virtual-scroller.js` — 从 `response-viewer.js` 提取 `VirtualScroller` 类，`response-viewer.js` 改为 import 使用
- [x] 1.3 创建 `utils/syntax-highlight.js` — 从 `response-viewer.js` 提取 `highlightJson`、`highlightXml`、`formatXml`，`response-viewer.js` 改为 import 使用
- [x] 1.4 将 `escapeAttr` 合入 `utils/template.js` — 从 `response-viewer.js` 和 `history-panel.js` 删除重复定义，改为从 `template.js` import
- [x] 1.5 创建 `utils/context-menu.js` — 从 `sidebar.js` 提取 `showContextMenu(event, items)` 函数
- [x] 1.6 创建 `utils/request-data.js` — 提取 `parseRequestRecord(record)`、`serializeRequestBody(tab)`、`kvToArray(rows)`；`sidebar.js` 和 `history-panel.js` 改为 import 使用

## 2. Modal 栈（基础设施）

- [x] 2.1 创建 `utils/modal.js` — 实现 `Modal.open(html, styles)`、`Modal.close()`、`Modal.replace(html, styles)`，基于 `#modal-overlay` / `#modal` DOM
- [x] 2.2 改造 `utils/dialogs.js` — 内部改为调用 `Modal.open()` / `Modal.close()`，公共 API（`prompt`/`confirm`/`confirmDanger`）保持不变
- [x] 2.3 验证 Dialogs 嵌套 — 确认 `Dialogs.confirm()` 在自定义 modal 打开后调用能正确恢复上一级内容

## 3. 组件拆分

- [x] 3.1 创建 `components/response-search.js` — 从 `response-viewer.js` 提取搜索状态、搜索逻辑、高亮导航、搜索 UI 事件绑定
- [x] 3.2 精简 `response-viewer.js` — 删除已提取的 VirtualScroller、syntax-highlight、search 代码，改为 import；保留状态栏、格式切换、渲染调度
- [x] 3.3 创建 `components/save-dialog.js` — 从 `sidebar.js` 提取保存请求对话框（`saveAsNewRequest` 的 modal 部分）
- [x] 3.4 精简 `sidebar.js` — 删除已提取的 context-menu、save-dialog、request-data 代码，改为 import

## 4. 组件 init() 模式改造

- [x] 4.1 改造简单组件为 init() 模式 — `url-bar.js`、`tab-bar.js`、`tab-panel.js`、`headers-editor.js`、`body-editor.js`、`auth-panel.js`、`script-editor.js`、`post-script-editor.js`、`test-results.js`、`cookie-tab.js`、`request-options.js`、`theme-switcher.js`、`variable-autocomplete.js`、`import-export.js`、`collection-var-editor.js`
- [x] 4.2 改造有公共 API 的组件 — `sidebar.js`（返回 `refreshCollections`、`saveAsNewRequest`）、`env-manager.js`、`runner-panel.js`（返回 `openRunnerPanel`）、`variable-preview.js`（返回 `refreshGlobalVars`）、`global-var-modal.js`（返回 `showGlobalVarModal`）、`history-panel.js`（返回 `HistoryPanel`）
- [x] 4.3 改造 `response-viewer.js` + `response-search.js` 为 init() 模式，`response-search.js` init 接收依赖（statusEl、formatContentEl 等）或通过返回值暴露搜索控制
- [x] 4.4 改造 `save-dialog.js` 为 init() 模式，返回 `saveAsNewRequest()` 方法

## 5. env-manager 精简 + 全局 Modal 迁移

- [x] 5.1 `env-manager.js` 改为使用 `Modal.open()` / `Modal.replace()` / `Modal.close()`，删除所有直接操作 `#modal` DOM 的代码
- [x] 5.2 `env-manager.js` 的 unsaved changes 对话框改为使用 `Dialogs` 或 `Modal` 栈，删除 `rebindAfterRestore()` 函数
- [x] 5.3 `runner-panel.js` 改为使用 `Modal.open()` / `Modal.close()`
- [x] 5.4 `global-var-modal.js` 改为使用 `Modal.open()` / `Modal.close()`

## 6. app.js 重构 + 清理

- [x] 6.1 重写 `app.js` — 从 side-effect import 改为显式 import + init 调用，按依赖顺序初始化各组件，从有 API 的 init 获取返回值供快捷键使用
- [x] 6.2 删除 `app.js` 中多余的 `document.getElementById('modal-overlay').addEventListener('click', ...)` — Modal 栈应自行管理 overlay 点击
- [x] 6.3 运行 `bun test` 确认所有测试通过
- [x] 6.4 运行 `bun run build` 确认打包正常
- [x] 6.5 手动验证 — 启动 `bun run dev`，测试发送请求、切换 tab、保存请求、打开环境管理、集合运行器、变量预览等核心流程
