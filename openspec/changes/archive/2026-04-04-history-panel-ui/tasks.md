## 1. 后端：History 搜索过滤

- [x] 1.1 `HistoryService.list()` 增加 `search`、`method` 可选参数，SQL 拼接 WHERE 条件（search 用 LIKE %keyword%，method 用等值匹配）
- [x] 1.2 `src/routes/history.ts` 从 query params 中提取 `search`、`method` 并传入 `historyService.list()`
- [x] 1.3 编写单元测试验证过滤逻辑（搜索、method、组合过滤、无结果）

## 2. 前端：Store 和 API 调整

- [x] 2.1 `store.js` 的 `_createEmptyTab()` 增加 `historyId: null` 字段
- [x] 2.2 `api.js` 的 `getHistory()` 增加 `search`、`method` 参数支持

## 3. 前端：History Panel 组件

- [x] 3.1 新建 `src/public/js/components/history-panel.js`，实现面板渲染：搜索框 + method chips + 列表区域 + 底部按钮
- [x] 3.2 实现历史记录列表渲染：每条显示 method badge + URL + status + 耗时 + 相对时间
- [x] 3.3 实现分页加载：初始 20 条 + "加载更多" 按钮
- [x] 3.4 实现搜索功能：300ms debounce 实时过滤，输入清空时恢复全量
- [x] 3.5 实现 method 过滤 chips：ALL / GET / POST / PUT / DELETE，点击切换高亮
- [x] 3.6 实现清空历史按钮：弹出确认对话框后调用 `api.clearHistory()`
- [x] 3.7 实现点击记录：调用 `api.getHistoryItem(id)` → `store.createTab()` 填充请求参数和历史响应

## 4. 前端：Sidebar 集成

- [x] 4.1 改造 `sidebar.js` 中 "📋 History" 为可展开/折叠面板，展开时挂载 history-panel 组件
- [x] 4.2 `index.html` 中引入 `history-panel.js` 脚本

## 5. 验证

- [x] 5.1 启动 dev server 手动验证完整流程：展开面板 → 搜索过滤 → 点击记录 → 查看 tab → replay 请求
