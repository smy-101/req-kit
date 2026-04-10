## Why

前端 20+ 个组件文件（共 ~5250 行）存在多处代码重复、职责混乱、模块边界模糊的问题。组件在模块顶层直接执行 DOM 查询和事件绑定，无法按需加载或独立测试。多个组件直接操作同一个 `#modal` DOM，互相覆盖内容，`env-manager` 甚至需要手动保存/恢复 innerHTML 来处理嵌套对话框。随着功能增长，这些问题会持续恶化。

## What Changes

- 提取 7 处重复代码为独立工具模块（SSE 解析、VirtualScroller、语法高亮、上下文菜单、请求解析/序列化、escapeAttr）
- 统一组件初始化模式：所有组件改为导出 `init()` 函数，由 `app.js` 显式调用，不再在模块顶层执行副作用
- 引入 Modal 栈管理器：替代各组件直接操作 `#modal` DOM 的模式，天然支持嵌套对话框
- `Dialogs` 工具改为基于 Modal 栈实现，公共 API 不变
- 拆分 `response-viewer.js`（669 行）为 3 个文件：viewer + search + 提取出的通用工具
- 拆分 `sidebar.js`（456 行）为 3 个文件：sidebar + save-dialog + 提取出的通用工具
- 精简 `env-manager.js`：删除 `rebindAfterRestore()` hack，改用 Modal 栈 + Dialogs

## 非目标

- 不引入前端框架或构建系统
- 不改变公共 API 行为（Dialogs.prompt/confirm/confirmDanger 接口不变）
- 不改变 store 的事件驱动架构
- 不增加组件生命周期管理（cleanup/unmount）
- 不修改后端代码
- 不修改 CSS

## Capabilities

### New Capabilities

- `modal-stack`: Modal 栈管理器，统一管理 `#modal-overlay` / `#modal` 的 open/close/replace，支持嵌套对话框自动恢复
- `sse-parser`: SSE 流解析工具，从 `api.js` 提取重复的 SSE buffer/event 解析逻辑
- `virtual-scroller`: 虚拟滚动组件，从 `response-viewer.js` 提取为通用工具
- `syntax-highlight`: JSON/XML 语法高亮工具，从 `response-viewer.js` 提取
- `context-menu`: 右键上下文菜单 UI 组件，从 `sidebar.js` 提取
- `request-data`: 请求记录解析与序列化工具，统一 `sidebar.js` 和 `history-panel.js` 的重复逻辑
- `component-init`: 组件初始化模式，所有组件改为导出 `init()` 函数

### Modified Capabilities

（无 spec 级别的行为变更，所有改动均为内部实现重构）

## Impact

- **前端所有 20+ 个组件文件**：改为 `init()` 模式
- **`api.js`**：SSE 解析提取后精简
- **`utils/dialogs.js`**：内部改为基于 Modal 栈
- **新增 7 个工具/组件文件**：`modal.js`, `sse-parser.js`, `virtual-scroller.js`, `syntax-highlight.js`, `context-menu.js`, `request-data.js`
- **拆分产生 2 个新组件文件**：`response-search.js`, `save-dialog.js`
- **`app.js`**：从 side-effect import 改为显式 init 调用
- **现有测试**：不受影响（`store.test.ts`, `api.test.ts` 等测试的是后端逻辑）
