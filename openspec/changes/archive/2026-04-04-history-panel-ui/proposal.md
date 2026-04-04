## Why

后端已有完整的 history 功能（数据库表、CRUD 服务、API 路由、前端 api.js 客户端），但前端缺少浏览和交互 UI。Sidebar 中的 "📋 History" 是静态占位，无法展开查看历史记录。用户发送的请求被默默记录，但无法回顾、查看详情或重放。

## What Changes

- 将 Sidebar 中 "📋 History" 改为可展开/折叠面板，包含搜索框、method 过滤 chips、历史记录列表
- 历史列表每条显示 method badge + URL + status + 耗时 + 相对时间
- 支持按 URL 关键字实时搜索（debounce）和按 method 过滤
- 初始加载 20 条，底部 "加载更多" 按钮分页加载
- 底部提供 "清空历史" 按钮
- 点击历史记录打开新 tab，同时填充请求参数和历史响应
- tab 可直接点 Send 重放请求（replay）
- 后端 `HistoryService.list()` 增加 search、method 过滤参数
- 路由层透传 search、method query params

## Capabilities

### New Capabilities

- `history-panel-ui`: 前端历史记录面板组件，负责 sidebar 内嵌的 history 列表展示、搜索过滤、记录点击加载

### Modified Capabilities

- `history`: 历史查询 API 增加搜索和过滤参数（search、method）

## Impact

- `src/services/history.ts` — `list()` 方法签名和 SQL 增加 WHERE 条件
- `src/routes/history.ts` — 透传 search、method query params
- `src/public/js/components/sidebar.js` — History 区域改为可展开面板
- `src/public/js/components/history-panel.js` — 新建，历史面板核心组件
- `src/public/js/store.js` — tab 结构增加 `historyId` 字段
- `src/public/js/api.js` — `getHistory()` 增加 search、method 参数
- `src/public/index.html` — 引入 history-panel.js 脚本
