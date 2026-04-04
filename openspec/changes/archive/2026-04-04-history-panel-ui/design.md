## Context

req-kit 已有完整的 history 后端链路：`history` SQLite 表 → `HistoryService`（CRUD）→ `/api/history` 路由 → `api.js` 客户端方法。每次 proxy 请求完成后自动写入历史记录。

前端现状：sidebar 中有一个静态 "📋 History" 树节点（`sidebar.js:18`），无展开交互、无列表渲染、无点击事件。`api.js` 已提供 `getHistory()`、`getHistoryItem()`、`deleteHistory()`、`clearHistory()` 方法但未使用。

前端架构为纯 Vanilla JS，事件驱动 Store + 模块化组件模式，无构建工具和框架。

## Goals / Non-Goals

**Goals:**

- 将 sidebar 中 History 区域改为可展开/折叠面板，展示历史记录列表
- 支持按 URL 关键字实时搜索和按 HTTP method 过滤
- 点击历史记录在新 tab 中加载完整请求+响应数据，支持 replay
- 后端 API 扩展搜索过滤能力
- 保持现有 Vanilla JS 架构，不引入前端框架

**Non-Goals:**

- 不做历史记录的编辑功能（历史是只读的）
- 不做按时间范围过滤（现阶段搜索和 method 过滤足够）
- 不做历史记录分组或标签
- 不做响应 diff 对比

## Decisions

### 1. History 面板嵌入 Sidebar 而非独立页面

**选择**：Sidebar 内嵌展开面板

**理由**：与 Postman 等工具的体验一致，用户可以在浏览历史的同时看到集合结构。不需要额外的页面路由或 overlay，交互更轻量。

**替代方案**：独立 overlay/抽屉面板 — 会增加 UI 复杂度，且打断工作流。

### 2. 搜索使用 debounce 实时过滤

**选择**：输入 300ms debounce 后自动查询

**理由**：sidebar 空间有限，不需要额外的"搜索"按钮。debounce 避免频繁请求后端。

### 3. 历史记录加载到普通 tab 而非特殊只读视图

**选择**：`store.createTab()` 创建普通 tab，预填请求参数和历史响应

**理由**：复用现有 tab 系统的所有 UI（request panel、response viewer），用户可直接点 Send 重放。新增 `historyId` 字段标识来源即可，无需新建 tab 类型。

**替代方案**：只读详情面板 — 需要额外的 UI 组件，且用户无法直接 replay，体验割裂。

### 4. 后端过滤在 SQL 层实现

**选择**：`HistoryService.list()` 接受可选的 `search`、`method` 参数，拼接到 SQL WHERE 条件

**理由**：SQLite 对简单 LIKE + 等值过滤性能足够，无需引入搜索引擎。分页查询与过滤在同一条 SQL 中完成，逻辑简单。

### 5. 组件职责分离：sidebar.js 负责折叠展开，history-panel.js 负责列表内容

**选择**：新建独立 `history-panel.js` 组件

**理由**：sidebar.js 已有集合管理的逻辑，历史面板有自己的搜索/过滤/分页状态，拆分为独立组件更清晰。两个组件通过 DOM 嵌套关系组合。

## Risks / Trade-offs

- **[Sidebar 空间有限]** → 搜索和过滤 UI 需紧凑设计，method 过滤用横向可滚动 chips，列表区域固定高度可滚动
- **[历史量大时列表性能]** → 分页加载（每次 20 条），不一次性加载全部；"加载更多"按钮而非无限滚动，避免复杂度
- **[后端 list() 签名变更]** → 新参数均为可选，向后兼容，不影响现有调用
