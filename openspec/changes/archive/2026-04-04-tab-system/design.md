## Context

req-kit 前端当前使用全局单例 `store` 对象管理状态，持有单个请求的全部数据（method、url、headers、params、body、auth、script、response）。所有组件直接读写 `store.state`。切换请求时直接覆盖 state，导致上一个请求的编辑内容和响应丢失。

当前组件通信模式：组件通过 `store.setState()` 更新状态，通过 `store.on('event')` 监听变化并重新渲染。组件通过全局变量互相引用（如 `headersEditor.setRows()`、`paramsEditor.setRows()`）。

约束：无前端框架、无构建工具、纯 Vanilla JS。

## Goals / Non-Goals

**Goals:**
- 支持同时打开多个请求 Tab，每个 Tab 状态完全隔离
- 切换 Tab 时瞬间恢复该 Tab 的全部状态（请求配置 + 响应）
- 与现有组件架构平滑集成，不引入框架

**Non-Goals:**
- Tab 拖拽排序
- Tab 状态持久化（刷新页面后恢复）
- Tab 分组/颜色标记
- 限制 Tab 数量上限

## Decisions

### 决策 1：Store 内部状态结构为 Tab 数组 + activeTabId

**方案**: `store.state.tabs` 为 Tab 对象数组，`store.state.activeTabId` 标识当前 Tab。每个 Tab 包含完整的请求+响应状态。

**替代方案**:
- (B) 使用 Map<id, tab> — 查找快但顺序管理复杂
- (C) 保持扁平 state，增加 currentTabId 字段前缀 — 状态管理混乱

**理由**: 数组天然保持 Tab 顺序，过滤/查找操作频率低（通常 < 20 个 Tab），O(n) 可接受。结构清晰，便于渲染 Tab Bar。

### 决策 2：组件通过 store 事件驱动更新，不直接持有 Tab 引用

**方案**: Tab 切换时 store 发出 `tab:switch` 事件，携带新 Tab 的完整状态。各组件监听该事件并重新渲染。组件读写 state 时通过 `store.getActiveTab()` 访问当前 Tab。

**替代方案**:
- (B) 组件直接引用 Tab 对象 — 耦合度高，切换时需逐个通知
- (C) 每次切换销毁重建组件 DOM — 性能差，丢失未持久化的 UI 状态

**理由**: 与现有 `store.on('event')` 模式完全一致，组件改动最小。

### 决策 3：Tab Bar 为独立组件文件

**方案**: 新建 `src/public/js/components/tab-bar.js`，负责渲染 Tab 列表、处理点击/关闭/新建交互。

**理由**: 职责单一，不影响现有组件。

### 决策 4：sidebar 点击请求 → 打开新 Tab（如未打开）或切换到已有 Tab

**方案**: 点击已保存请求时，先检查该请求是否已有对应 Tab（通过 requestId 匹配）。如有则切换，否则新建。

**理由**: 避免同一请求重复打开多个 Tab，符合 Postman 行为。

## Risks / Trade-offs

- **[所有组件需适配]** → 逐个修改，每个组件只需将 `store.state.xxx` 改为 `store.getActiveTab().xxx`，改动模式统一
- **[Tab 数据量大时内存]** → 单个 Tab 状态很小（几 KB），20 个 Tab 也只占几百 KB，可接受
- **[组件全局变量引用]** → `headersEditor`、`paramsEditor` 等全局引用保持不变，组件内部方法签名不变，只改数据来源
