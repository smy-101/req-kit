## Purpose

History panel UI component in the sidebar, providing expandable history browsing with search, method filtering, pagination, and click-to-load functionality.

## Requirements

### Requirement: History 面板展开折叠

Sidebar 中的 "📋 History" 区域 SHALL 为可展开/折叠面板。默认折叠状态，点击标题行切换展开/折叠。

#### Scenario: 展开 History 面板
- **WHEN** 用户点击 "📋 History" 标题行
- **THEN** 面板展开，显示搜索框、method 过滤 chips 和历史记录列表
- **THEN** 自动加载最新的 20 条历史记录

#### Scenario: 折叠 History 面板
- **WHEN** 用户再次点击 "📋 History" 标题行
- **THEN** 面板折叠，隐藏搜索框、过滤和列表

### Requirement: 历史记录列表展示

历史列表 SHALL 显示每条记录的 method badge、URL、状态码、响应耗时和相对时间。列表区域 SHALL 有固定最大高度并可滚动。

#### Scenario: 显示历史列表
- **WHEN** History 面板展开且有历史记录
- **THEN** 每条记录显示 method badge（带颜色）、截断的 URL、状态码、响应耗时（ms）和相对时间（如 "2分钟前"）

#### Scenario: 无历史记录
- **WHEN** History 面板展开但数据库中无历史记录
- **THEN** 显示空状态提示 "暂无历史记录"

### Requirement: 分页加载

历史列表 SHALL 初始加载 20 条记录，用户可通过 "加载更多" 按钮加载下一页。底部 SHALL 显示 "清空历史" 按钮。

#### Scenario: 加载更多历史
- **WHEN** 用户点击 "加载更多" 按钮
- **THEN** 追加加载下一页 20 条记录到列表底部
- **THEN** 如果没有更多记录，隐藏 "加载更多" 按钮

#### Scenario: 清空历史
- **WHEN** 用户点击 "清空历史" 按钮
- **THEN** 弹出确认对话框
- **THEN** 确认后调用 `DELETE /api/history` 清空所有历史，列表显示空状态

### Requirement: URL 关键字搜索

History 面板 SHALL 提供搜索输入框，支持按 URL 关键字实时过滤。输入 SHALL 使用 300ms debounce，避免频繁请求。

#### Scenario: 搜索过滤历史
- **WHEN** 用户在搜索框中输入关键字
- **THEN** 300ms 无额外输入后，以该关键字作为 search 参数请求历史列表
- **THEN** 列表刷新为匹配 URL 的记录，分页重置为第一页

#### Scenario: 清空搜索
- **WHEN** 用户清空搜索框
- **THEN** 列表恢复为未过滤的全部历史记录

### Requirement: Method 过滤

History 面板 SHALL 提供 method 过滤 chips（ALL、GET、POST、PUT、DELETE 等），点击切换过滤条件。默认选中 ALL。

#### Scenario: 按 method 过滤
- **WHEN** 用户点击某个 method chip（如 "POST"）
- **THEN** 列表刷新为仅该 method 的历史记录，分页重置为第一页
- **THEN** 选中的 chip 高亮显示

#### Scenario: 恢复全部
- **WHEN** 用户点击 "ALL" chip
- **THEN** 列表恢复为全部 method 的历史记录

### Requirement: 请求完成后历史刷新防抖
History 面板在收到 `request:complete` 事件后 SHALL 使用 500ms debounce 延迟刷新历史列表，避免快速连续发请求时产生大量冗余网络请求。

#### Scenario: 单次请求后历史刷新
- **WHEN** 用户发送一个请求并收到响应
- **THEN** History 面板在 500ms 后自动刷新历史列表

#### Scenario: 快速连续请求去重
- **WHEN** 用户在 500ms 内连续发送多个请求
- **THEN** 只在最后一个请求完成后 500ms 触发一次历史刷新，而非每个请求都刷新一次

#### Scenario: 手动展开面板立即加载
- **WHEN** 用户手动展开 History 面板
- **THEN** 立即加载最新历史记录，不受 debounce 影响

### Requirement: 点击历史记录加载到 Tab

用户点击历史列表中的一条记录 SHALL 在新 tab 中加载该记录的完整请求参数和历史响应。

#### Scenario: 点击历史记录
- **WHEN** 用户点击列表中的一条历史记录
- **THEN** 调用 `GET /api/history/:id` 获取完整记录
- **THEN** 创建新 tab，填充请求参数（method、url、headers、params、body、bodyType、authType、authConfig）
- **THEN** 同时填充历史响应数据到 tab 的 response 字段（status、headers、body、time、size）
- **THEN** tab 的 `historyId` 字段设置为该记录 ID

#### Scenario: Replay 历史请求
- **WHEN** 用户在已加载历史记录的 tab 中点击 Send
- **THEN** 按正常流程发送请求（经过模板替换、脚本执行、代理转发）
- **THEN** 新的响应覆盖 tab 中的历史响应
- **THEN** 新请求自动记录为新的历史记录
