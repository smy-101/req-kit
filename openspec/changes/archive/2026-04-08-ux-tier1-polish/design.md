## Context

req-kit 前端采用纯 Vanilla JS + 事件驱动 Store 架构，组件通过 `store.on`/`store.emit` 通信。后端代理层使用 `fetch` + `AbortController`，已具备 30s 硬编码超时能力。当前用户体验存在 6 个核心缺口：无法取消进行中请求、无法复制请求、响应不可搜索、非 JSON 响应无格式化、关闭 tab 不提醒未保存变更、超时/重定向不可配置。

## Goals / Non-Goals

**Goals:**
- 6 个基础体验功能全部落地
- 前端改动最小化，复用现有 Store 事件机制
- 后端改动仅涉及 proxy 路由和服务层的参数透传
- 不引入新依赖

**Non-Goals:**
- Collection Runner（独立功能，后续处理）
- OAuth 2.0 等新 Auth 类型
- WebSocket/GraphQL 支持
- 性能压测或负载测试能力

## Decisions

### 1. 请求取消：复用 store 中的 AbortController

**方案**：在 `api.js` 中维护模块级 `_currentController` 实例。发送请求时创建新 controller，新请求自动取消上一个未完成的请求。`url-bar.js` 的 Cancel 按钮调用 `api.abortCurrent()` 中止请求。Send 按钮在请求中显示为 Cancel，点击时调用 `api.abortCurrent()`。

**替代方案**：在 `url-bar.js` 中维护 controller。→ 拒绝，因为 api 层需要自动取消上一个未完成请求以防止旧响应覆盖当前 tab，controller 放在 api 层可同时服务这两个目的。

**后端**：无需改动。Bun 的 `fetch` 已支持 `signal`，当前代码已使用 `AbortController` 实现超时。前端 abort 会导致 fetch 抛出 `AbortError`，前端 catch 后静默处理即可。

### 2. 复制请求：后端 API 复制

**方案**：在 `collection.ts` 路由中新增 `POST /api/collections/requests/:id/duplicate`，后端读取原请求并创建副本（name 加 " (副本)" 后缀）。前端 sidebar 右键菜单增加"复制"选项。

**替代方案**：纯前端复制（读取 → 填入新 tab）。→ 拒绝，因为用户期望复制的是已保存请求，应该在后端创建新记录。

### 3. 响应搜索：前端纯实现

**方案**：在 response-viewer 上方增加搜索栏（`Ctrl+F` 或点击图标触发）。搜索时：
- 小响应：遍历 DOM 高亮匹配文本
- 大响应（虚拟滚动）：在 VirtualScroller 中维护 `searchTerm`，render 时对行内容做高亮标记。上下箭头跳转匹配行，滚动到对应位置。

**不引入后端搜索**：响应体已在前端内存中，无需后端参与。

### 4. 响应格式多样化

**方案**：在响应 body 上方增加格式切换 tab：`Pretty | Raw | Preview`。

| 格式 | 实现方式 |
|------|----------|
| JSON (已有) | syntaxHighlight |
| XML | 正则缩进格式化 + 语法高亮 |
| HTML | `<iframe sandbox>` 渲染预览 |
| Image | `<img>` 标签展示，显示尺寸信息 |
| Raw | 纯文本，无格式化 |

Content-Type 检测自动选择默认 tab。Pretty 失败时 fallback 到 Raw。

### 5. 未保存变更提示：dirty 标记

**方案**：store 中每个 tab 增加 `dirty` 布尔值。触发 `store.setState` 修改请求配置时（method、url、headers、body、auth、scripts），若该请求来自已保存请求（有 `savedRequestId`），则标记 `dirty = true`。保存后清除。

Tab 关闭时检查：`tab-bar.js` 关闭 tab 前检查 `dirty`，若为 true 弹出确认模态框。Tab 上显示 `●` 标记表示未保存。

**关键约束**：仅对从已保存请求打开的 tab 追踪 dirty。新建的空 tab 不需要追踪（没有可丢失的数据）。

### 6. 超时/重定向配置：请求级选项

**方案**：URL 栏下方新增可折叠的"设置"面板（齿轮图标触发）。包含：
- 超时时间（ms），默认 30000，范围 1000–300000
- 跟随重定向开关，默认开启

配置存储在 tab 状态中，发送时传入后端。后端 `ProxyService.sendRequest` 使用传入的 timeout 和 redirect 配置。

**后端改动**：
- `ProxyRequest` 接口新增 `timeout?: number` 和 `follow_redirects?: boolean`
- `routes/proxy.ts` 透传参数
- `services/proxy.ts` 的 `sendRequest` 使用自定义 timeout；`follow_redirects: false` 时用 `redirect: 'manual'`

## Risks / Trade-offs

- **[虚拟滚动 + 搜索高亮性能]** → 大响应 + 长搜索词时行渲染变慢。缓解：搜索高亮仅在匹配行附近执行，限制高亮缓存大小
- **[iframe sandbox 安全]** → HTML preview 使用 `<iframe sandbox="">`（无 script/allow-same-origin），阻止 XSS。但某些 HTML 可能渲染异常 → 可接受，Preview 是辅助视图
- **[dirty 检测精度]** → 某些 setState 可能误标记 dirty（如切换 tab 后恢复状态）。缓解：保存原始快照，对比实质性变更
