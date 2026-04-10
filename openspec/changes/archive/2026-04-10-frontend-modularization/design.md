## Context

req-kit 前端是纯 Vanilla JS，20+ 个组件文件共 ~5250 行，通过 `app.js` 的 side-effect import 加载。每个组件在模块顶层直接执行 `document.getElementById`、事件绑定、`store.on` 订阅。项目使用 `bun build --minify` 做简单打包，无转译、无框架。

当前存在的架构问题：
- 7 处代码重复（SSE 解析、escapeAttr、请求解析、VirtualScroller 等）
- `response-viewer.js`（669 行）和 `sidebar.js`（456 行）职责过多
- 多个组件直接操作 `#modal` DOM，无协调机制
- 组件无法按需加载或独立测试

## Goals / Non-Goals

**Goals:**
- 消除所有已识别的代码重复
- 建立统一的组件初始化模式（`init()` 函数）
- 引入 Modal 栈，解决 modal 互相覆盖和嵌套问题
- 拆分职责过多的组件文件
- 保持 Vanilla JS 零依赖原则

**Non-Goals:**
- 不引入前端框架或构建系统
- 不修改后端代码
- 不修改 CSS
- 不增加组件生命周期管理（cleanup/unmount）— YAGNI
- 不修改任何公共 API 行为

## Decisions

### D1: 组件 init() 模式

**选择**: 每个组件导出 `init()` 函数，`app.js` 显式调用。需要公共 API 的组件 `init()` 返回 API 对象。

**替代方案**:
- A) 保持现状（side-effect import）— 无法解决初始化时机不明确的问题
- B) 引入 class-based 组件 — 过度设计，Vanilla JS 不需要
- C) `init()` 返回 cleanup 函数 — 增加样板代码，当前无卸载需求

**理由**: `init()` 是最小改动。`<script type="module">` 天然 defer，`app.js` 执行时 DOM 已就绪，不需要 `DOMContentLoaded` 保护。

```js
// 简单组件
export function init() {
  const el = document.getElementById('xxx');
  el.addEventListener('click', handler);
  store.on('event', handler);
}

// 需要公共 API 的组件
export function init() {
  // ... setup ...
  return { refreshCollections, saveAsNewRequest };
}
```

### D2: Modal 栈管理器

**选择**: 引入 `Modal` 工具（`utils/modal.js`），提供 `open()`/`close()`/`replace()` 三个方法，内部维护内容栈。

**替代方案**:
- A) 保持各组件直接操作 DOM — 无法解决覆盖问题
- B) 事件驱动的 modal 系统 — 过度设计

**理由**: 栈结构天然支持嵌套对话框。`env-manager` 的 unsaved changes 场景中，`Dialogs.confirm()` push 当前内容到栈，关闭时 pop 恢复，无需手动保存/恢复 innerHTML。

```js
// utils/modal.js
export const Modal = {
  open(html, styles) { /* push 栈, 设置内容 */ },
  close()           { /* pop 栈, 恢复内容或隐藏 */ },
  replace(html)     { /* 替换当前内容, 不入栈 */ },
};
```

`Dialogs` 改为内部调用 `Modal.open()` / `Modal.close()`，公共 API（`prompt`/`confirm`/`confirmDanger`）不变。

### D3: 重复代码提取策略

**选择**: 按职责提取为独立工具模块，不创建抽象层级。

| 提取项 | 目标文件 | 来源 |
|--------|----------|------|
| SSE 流解析 | `utils/sse-parser.js` | `api.js` 两处 |
| VirtualScroller | `utils/virtual-scroller.js` | `response-viewer.js` |
| JSON/XML 语法高亮 | `utils/syntax-highlight.js` | `response-viewer.js` |
| 上下文菜单 | `utils/context-menu.js` | `sidebar.js` |
| 请求解析/序列化 | `utils/request-data.js` | `sidebar.js` + `history-panel.js` |
| escapeAttr | 合入 `utils/template.js` | `response-viewer.js` + `history-panel.js` |

### D4: 组件拆分策略

**response-viewer.js**（669 行 → 3 个文件）:
- `response-viewer.js` (~205 行): 状态栏、格式切换（Pretty/Raw/Preview）、渲染调度
- `response-search.js` (~180 行): 搜索 UI、搜索逻辑、高亮导航
- 通用工具提取到 `utils/`（VirtualScroller、syntax-highlight）

**sidebar.js**（456 行 → 3 个文件）:
- `sidebar.js` (~185 行): 树渲染、请求加载
- `save-dialog.js` (~80 行): 保存请求对话框
- 通用工具提取到 `utils/`（context-menu、request-data）

### D5: 实施顺序

按依赖关系分 4 步，每步完成后可独立验证：

1. **工具提取**（无破坏性）: 创建 6 个新工具文件，提取重复代码
2. **Modal 栈**（基础设施）: 创建 `modal.js`，改造 `Dialogs`
3. **组件拆分 + init 模式**（核心重构）: 拆分大组件，所有组件改为 `init()`
4. **清理**（收尾）: 更新 `app.js`，删除死代码，运行测试

## Risks / Trade-offs

- **[风险] 大规模重构可能引入回归** → 每步完成后手动验证 UI 功能正常 + 运行 `bun test` 确保后端测试不受影响
- **[风险] init() 顺序敏感** → 组件间有隐式依赖（如 `variable-preview` 在 `global-var-modal` 之前被 sidebar 引用），需在 `app.js` 中按正确顺序 init → 在 design 中记录依赖顺序
- **[取舍] init() 模式增加每个组件约 2 行样板**（`export function init() {` + 闭合 `}`）→ 可接受的代价，换来明确的初始化边界
- **[取舍] Modal 栈增加一层抽象** → 简化了 env-manager 等组件的代码量，净效果为正
