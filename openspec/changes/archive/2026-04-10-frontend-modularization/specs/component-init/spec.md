## ADDED Requirements

### Requirement: 组件导出 init 函数
所有前端组件 SHALL 导出 `init()` 函数作为唯一初始化入口。组件 SHALL NOT 在模块顶层执行 DOM 查询（`document.getElementById` 等）、事件绑定（`addEventListener` 等）或 store 订阅（`store.on` 等）。

#### Scenario: 模块导入不产生副作用
- **WHEN** 执行 `import './components/url-bar.js'` 但不调用其 `init()`
- **THEN** 无 DOM 查询、无事件绑定、无 store 订阅发生

#### Scenario: init 后组件正常工作
- **WHEN** 调用 `initUrlBar()` 后用户操作 URL 输入框
- **THEN** 组件行为与重构前完全一致

### Requirement: init 执行时 DOM 已就绪
`app.js` SHALL 在所有 `init()` 调用时保证 DOM 已加载完成。由于 `<script type="module">` 天然 defer，`app.js` 中直接调用 `init()` 即可，不需要 `DOMContentLoaded` 包装。

#### Scenario: app.js 启动流程
- **WHEN** 页面加载完成
- **THEN** `app.js` 按依赖顺序依次调用各组件的 `init()` 函数
- **THEN** 所有组件正常工作

### Requirement: 公共 API 通过 init 返回值暴露
需要被其他组件或 `app.js` 调用的组件 SHALL 通过 `init()` 返回值暴露公共 API，而非模块级导出。

#### Scenario: sidebar 公共 API
- **WHEN** `app.js` 调用 `const sidebar = initSidebar()`
- **THEN** 返回对象包含 `refreshCollections()` 和 `saveAsNewRequest()` 方法
- **THEN** 键盘快捷键通过 `sidebar.saveAsNewRequest()` 调用

#### Scenario: runner-panel 公共 API
- **WHEN** `app.js` 调用 `const runnerPanel = initRunnerPanel()`
- **THEN** 返回对象包含 `openRunnerPanel(collectionId, collectionName)` 方法
