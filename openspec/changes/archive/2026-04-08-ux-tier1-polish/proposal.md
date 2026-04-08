## Why

req-kit 已具备完整的 API 调试核心功能，但日常使用中存在多处体验短板：请求发出后无法取消、响应内容无法搜索、非 JSON 响应缺乏格式化、关闭未保存的 tab 会丢失配置、超时和重定向无法按请求控制。这些问题在日常调试中频繁出现，直接影响使用效率。

## What Changes

- **请求取消**：Send 按钮在请求进行中变为 Cancel，点击后通过 AbortController 中止请求
- **复制/重复请求**：sidebar 中已保存的请求支持"复制"操作，快速创建副本
- **响应搜索**：响应区域增加搜索栏，支持关键字查找和高亮匹配行（兼容虚拟滚动）
- **响应格式多样化**：XML pretty print、HTML preview（iframe sandbox）、Image 预览、Raw 模式切换
- **未保存变更提示**：tab 关闭时若有未保存的修改，弹窗确认
- **超时/重定向配置**：请求级设置面板，可自定义超时时间（ms）和是否跟随重定向

## Capabilities

### New Capabilities
- `request-cancellation`: 请求进行中的取消能力，前端 AbortController + 后端 AbortSignal 传递
- `request-duplicate`: 复制已保存请求，含完整配置（headers、body、auth、scripts）
- `response-search`: 响应体文本搜索，支持高亮和行定位
- `response-formatting`: 多格式响应展示（XML pretty print、HTML preview、Image preview、Raw）
- `unsaved-changes-guard`: tab 关闭时的未保存变更检测与确认弹窗
- `request-options`: 请求级选项配置（超时时间、重定向跟随）

### Modified Capabilities
- `proxy`: 支持 AbortSignal 传递和超时/重定向配置
- `tab-manager`: tab 状态增加 dirty 标记和 options 字段

## Impact

- 前端：`url-bar.js`（取消按钮）、`response-viewer.js`（搜索+格式化）、`sidebar.js`（复制菜单）、`tab-bar.js`（dirty 标记）、新增 `request-options.js` 组件
- 后端：`routes/proxy.ts`（接收 timeout/redirect 参数）、`services/proxy.ts`（支持 redirect 控制和自定义 timeout）
- CSS：响应区域搜索栏样式、格式切换 tab 样式、未保存标记样式

## 非目标

- 不做 Collection Runner（第二梯队）
- 不做 OAuth 2.0（第二梯队）
- 不做响应 Diff
- 不做 WebSocket/GraphQL 支持
- 不改变现有的 SSE 流式架构
