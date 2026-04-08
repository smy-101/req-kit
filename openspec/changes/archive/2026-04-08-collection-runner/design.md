## Context

req-kit 的代理管道（`routes/proxy.ts`）目前是单次请求的完整闭环：变量替换 → 前置脚本 → 认证注入 → Cookie 注入 → 代理转发 → Cookie 提取 → 后置脚本 → 历史记录。变量传递链在前端完成——`url-bar.js` 将脚本设置的变量合并到 `store.runtimeVars`，下次请求自动携带。

集合运行器需要将这个循环搬到后端，在服务端连续执行多个请求，实现请求间的变量传递。

现有基础设施：
- `CollectionService.getTree()` 已能返回嵌套的集合+请求树
- `VariableService` 已支持 4 级作用域变量解析
- `ScriptService` 已支持 `variables.set()` 在前置/后置脚本中设置运行时变量
- SSE 流式推送已在流式代理中实现，有成熟的模式可复用

## Goals / Non-Goals

**Goals:**
- 按 DFS 顺序执行集合内所有请求，支持变量在请求间传递
- 通过 SSE 实时推送每个请求的执行进度和结果
- 提供运行器面板 UI，展示进度、逐请求结果和测试断言汇总
- 支持用户随时停止正在运行的集合
- 复用现有代理管道逻辑，避免代码重复

**Non-Goals:**
- 运行结果持久化到数据库
- 请求间延迟/等待配置
- 并行执行请求
- 选择性运行部分请求
- CI/CD 命令行运行器

## Decisions

### 1. 管道复用：提取共享函数而非调用自身

**选择**: 从 `routes/proxy.ts` 中提取 `executeRequestPipeline()` 函数，供 `/api/proxy` 路由和 `RunnerService` 共同调用。

**备选方案**:
- A) RunnerService 直接调用 `POST /api/proxy`（HTTP 自调用）— 引入不必要的网络开销，且无法精确控制变量传递
- B) 完全复制管道代码到 RunnerService — 代码重复，维护成本高
- C) 提取共享函数 ✅ — 最小改动，最大复用

**理由**: 选项 C 保持单一职责，`executeRequestPipeline()` 是纯逻辑函数，输入请求上下文，输出执行结果。路由层只负责 HTTP 协议适配。

### 2. 通信方式：SSE 实时推送

**选择**: `POST /api/runners/run` 返回 `text/event-stream`，逐请求推送事件。

**理由**: 项目已在流式代理中使用 SSE，模式成熟。SSE 比 WebSocket 简单，单向推送足够满足进度更新需求。

**事件协议**:
```
runner:start     → { totalRequests: N }
request:start    → { index, name, method, url }
request:complete → { index, name, method, url, status, time, size, tests, scriptLogs, postScriptLogs, passed, failed, error? }
runner:done      → { passed, failed, total, totalTime }
```

### 3. 失败策略：默认继续执行

**选择**: 请求失败（网络错误、超时、脚本异常）时标记为失败并继续执行后续请求。用户可通过停止按钮中止整个运行。

**理由**: 运行器的核心价值是看到全貌。遇到错误就停止会丢失后续请求的测试信息。用户始终可以通过停止按钮主动中止。

### 4. 变量传递：运行时变量累积

**选择**: 维护一个 `runtimeVars` 对象，每个请求执行后将其 `scriptVariables` 和 `postScriptVariables` 合并进去，作为下一个请求的 `runtimeVars` 上下文。

**实现**: `executeRequestPipeline()` 返回 `scriptVariables` 和 `postScriptVariables`，`RunnerService` 在循环中累积合并。

### 5. 前端 UI：Modal 面板

**选择**: 使用 Modal 而非新页面或侧边栏面板。

**理由**: 运行器是临时性操作，Modal 不影响主工作区布局。参考 Postman 的 Collection Runner 也使用独立面板。面板内容：进度条 + 逐请求结果列表 + 可展开的测试详情 + 停止按钮 + 汇总统计。

### 6. 停止机制：AbortController

**选择**: 使用 `AbortController` 中止 SSE 连接。后端在每次请求执行前检查 `signal.aborted`，如果已中止则跳过剩余请求并发送 `runner:done` 事件。

**理由**: SSE 天然支持客户端断开连接。`AbortController` 是标准 API，与现有请求取消模式一致。

## Risks / Trade-offs

- **[长运行集合]** → 集合中请求过多时运行时间可能很长。缓解：SSE 实时推送让用户随时看到进度，停止按钮可随时中止。
- **[变量污染]** → 前一个请求的变量可能意外影响后续请求。缓解：这是设计意图（请求间变量传递），用户需自行管理变量命名。运行器使用独立的 `runtimeVars`，不影响前端 store 中的全局运行时变量。
- **[管道提取的回归风险]** → 从 proxy.ts 提取共享函数可能引入 bug。缓解：现有单请求代理行为不变，只是代码组织方式改变。可通过运行现有测试验证。
- **[无持久化]** → 运行结果不保存，关闭面板后丢失。缓解：这是 MVP 的有意取舍，后续可作为增量功能添加。
