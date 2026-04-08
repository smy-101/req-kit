## 1. 提取代理管道共享函数

- [x] 1.1 从 `src/routes/proxy.ts` 中提取核心请求执行逻辑为 `executeRequestPipeline()` 函数，接受请求参数 + 变量上下文 + services，返回执行结果对象（status, headers, body, time, size, scriptTests, scriptLogs, postScriptLogs, scriptVariables, postScriptVariables, setCookies, error）
- [x] 1.2 重构 `POST /api/proxy` 路由，改为调用 `executeRequestPipeline()`，仅负责 HTTP 协议适配（解析请求体、构造响应）
- [x] 1.3 重构流式代理路径，同样使用 `executeRequestPipeline()` 的核心逻辑（或保留流式路径独立处理，因为流式不走完整管道）
- [x] 1.4 验证现有代理测试通过，确保行为无回归

## 2. 集合运行器后端服务

- [x] 2.1 创建 `src/services/runner.ts`，实现 `RunnerService`，包含 `collectRequests(tree)` 方法递归收集集合树中所有请求（DFS 顺序，按 sort_order 排序）
- [x] 2.2 实现 `RunnerService.run(collectionId, environmentId, signal)` 方法，循环调用 `executeRequestPipeline()` 执行每个请求，累积 `runtimeVars`，通过回调函数推送事件
- [x] 2.3 实现 SSE 事件协议：`runner:start`、`request:start`、`request:complete`、`runner:done`，`request:complete` 包含测试结果、脚本日志、错误信息
- [x] 2.4 实现停止机制：通过 `AbortSignal` 检测客户端断开，在每次请求执行前检查 `signal.aborted`，中止后推送 `runner:done`
- [x] 2.5 实现失败继续策略：请求失败时标记错误并继续后续请求
- [x] 2.6 确保运行器中每个请求执行后记录历史（调用 HistoryService）

## 3. 集合运行器路由

- [x] 3.1 创建 `src/routes/runner.ts`，实现 `POST /api/runners/run` 端点，返回 SSE 流
- [x] 3.2 在 `src/index.ts` 中注册 runner 路由

## 4. 运行器前端 UI

- [x] 4.1 创建 `src/public/js/components/runner-panel.js`，实现运行器 Modal 面板基础结构（集合名称、进度条、结果列表容器、停止按钮、汇总统计栏）
- [x] 4.2 实现 SSE 连接管理：调用 `POST /api/runners/run`，监听 SSE 事件，解析并更新 UI
- [x] 4.3 实现进度条实时更新（已完成/总请求数）
- [x] 4.4 实现逐请求结果列表渲染：状态图标（✅/❌/⏳/○）、方法、URL 路径、状态码、耗时、测试通过/失败数
- [x] 4.5 实现请求结果展开/折叠：点击请求展开显示测试断言列表和脚本控制台输出
- [x] 4.6 实现停止按钮：关闭 SSE 连接（AbortController），面板显示"已停止"状态
- [x] 4.7 实现运行完成状态：汇总统计（X passed, Y failed | 总耗时 Zms），停止按钮变为"关闭"按钮

## 5. 侧边栏集成

- [x] 5.1 在 `src/public/js/components/sidebar.js` 的 `createTreeItem()` 中为含请求的集合添加 ▶ 运行按钮
- [x] 5.2 空集合不显示运行按钮（需要检查集合及其子集合是否有请求）

## 6. 前端 API 和入口集成

- [x] 6.1 在 `src/public/js/api.js` 中新增 `runCollection(collectionId, environmentId, callbacks)` 方法，管理 SSE 连接和 AbortController
- [x] 6.2 在 `src/public/js/app.js` 中引入 `runner-panel.js`
- [x] 6.3 在 `src/public/js/app.js` 中通过 ESM `import` 引入 `runner-panel.js`（项目使用 ESM 模块架构，`index.html` 仅需 `app.js` 入口，无需额外 `<script>` 标签）
