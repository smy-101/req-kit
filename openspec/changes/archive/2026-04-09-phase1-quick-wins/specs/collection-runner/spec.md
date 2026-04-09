## MODIFIED Requirements

### Requirement: 集合运行器后端服务

系统 SHALL 提供 `POST /api/runners/run` 端点，接受 `{ collection_id, environment_id, retry_count, retry_delay_ms }` 请求体，返回 SSE (`text/event-stream`) 流，按 DFS 顺序执行集合内所有请求。

系统 SHALL 在执行前通过 `CollectionService.getTree()` 获取集合树，然后递归遍历收集所有请求，按 `sort_order` 排序。遍历顺序为 DFS（先深度到子集合，再处理当前集合的请求）。

系统 SHALL 在每个请求执行前通过 SSE 推送 `request:start` 事件，执行后推送 `request:complete` 事件。

系统 SHALL 维护一个运行时变量对象 `runtimeVars`，在每个请求执行后将该请求的 `scriptVariables` 和 `postScriptVariables` 合并到 `runtimeVars` 中，并作为下一个请求的变量解析上下文。

请求执行失败时（网络错误、超时、脚本异常），系统 SHALL 标记该请求为失败并继续执行后续请求。

所有请求执行完毕后，系统 SHALL 推送 `runner:done` 事件，包含汇总统计（passed、failed、total、totalTime）。

系统 SHALL 支持通过关闭 SSE 连接来停止运行。后端在每次请求执行前检查连接状态，如果客户端已断开则停止执行并发送 `runner:done` 事件（标记剩余请求为 skipped）。

系统 SHALL 对每个请求执行完整的代理管道：变量模板替换 → 前置脚本 → 认证注入 → Cookie 注入 → 代理转发 → Cookie 提取 → 后置脚本 → 历史记录。

系统 SHALL 在 SSE 开始时推送 `runner:start` 事件，包含总请求数。

系统 SHALL 在请求失败时根据 `retry_count` 和 `retry_delay_ms` 配置进行自动重试。仅网络错误、连接超时、HTTP 5xx 触发重试。重试期间推送 `request:retry` 事件。

#### Scenario: 成功运行包含多个请求的集合

- **WHEN** 客户端发送 `POST /api/runners/run`，body 为 `{ "collection_id": 1, "environment_id": 2 }`，集合 1 包含 3 个请求
- **THEN** 系统返回 SSE 流，依次推送 `runner:start { totalRequests: 3 }`，然后 3 组 `request:start` + `request:complete` 事件，最后 `runner:done { passed: 3, failed: 0, total: 3, totalTime: 500 }`

#### Scenario: DFS 遍历嵌套集合

- **WHEN** 集合 A 包含子集合 B（含请求 R1），集合 A 自身包含请求 R2、R3
- **THEN** 执行顺序为 R1 → R2 → R3

#### Scenario: 请求间变量传递

- **WHEN** 请求 R1 的后置脚本执行 `variables.set('token', 'abc123')`，请求 R2 的 URL 为 `{{baseUrl}}/profile`
- **THEN** R2 执行时 `runtimeVars` 包含 `{ token: 'abc123' }`，变量模板 `{{baseUrl}}` 和 `{{token}}` 均可正确解析

#### Scenario: 某个请求失败后继续执行

- **WHEN** 集合包含 3 个请求，第 2 个请求因网络错误失败
- **THEN** 系统推送第 2 个请求的 `request:complete` 事件（包含 `error` 字段），继续执行第 3 个请求，最终 `runner:done` 为 `{ passed: 2, failed: 1, total: 3 }`

#### Scenario: 前置脚本执行失败

- **WHEN** 请求的前置脚本抛出异常
- **THEN** 系统推送该请求的 `request:complete` 事件（包含 `error` 字段，`failed` 计数），继续执行后续请求

#### Scenario: 用户停止运行

- **WHEN** 客户端在执行第 2 个请求时关闭 SSE 连接
- **THEN** 后端检测到连接断开，停止执行剩余请求，推送 `runner:done`（已完成的计入统计，未执行的不计入）

#### Scenario: 集合为空

- **WHEN** 客户端请求运行一个不包含任何请求的集合
- **THEN** 系统推送 `runner:start { totalRequests: 0 }` 和 `runner:done { passed: 0, failed: 0, total: 0, totalTime: 0 }`

#### Scenario: 运行器使用当前活跃环境

- **WHEN** 客户端发送 `POST /api/runners/run`，body 为 `{ "collection_id": 1, "environment_id": 2 }`
- **THEN** 所有请求的变量解析使用 environment_id 2 对应的环境变量

#### Scenario: 带重试配置运行

- **WHEN** 客户端发送 `POST /api/runners/run`，body 为 `{ "collection_id": 1, "retry_count": 2, "retry_delay_ms": 2000 }`
- **THEN** 运行器使用重试次数 2、重试间隔 2000ms 执行所有请求

### Requirement: 代理管道共享函数

系统 SHALL 从 `POST /api/proxy` 路由中提取核心请求执行逻辑为共享函数 `executeRequestPipeline()`，供单次代理请求和集合运行器共同调用。

`executeRequestPipeline()` SHALL 接受请求参数（url、method、headers、params、body、body_type、auth_type、auth_config、pre_request_script、post_response_script）和变量解析上下文（runtimeVars、collectionId、environmentId），返回执行结果对象（status、headers、body、time、size、scriptTests、scriptLogs、postScriptLogs、scriptVariables、postScriptVariables、setCookies、error）。

提取后 `POST /api/proxy` 的行为 SHALL 与提取前完全一致。

#### Scenario: 提取后单次代理行为不变

- **WHEN** 客户端发送 `POST /api/proxy`（提取管道函数后）
- **THEN** 响应格式、内容、HTTP 状态码与提取前完全一致

#### Scenario: 运行器调用共享管道

- **WHEN** RunnerService 调用 `executeRequestPipeline()` 执行一个请求
- **THEN** 返回结果包含完整的 status、body、headers、time、size、scriptTests、scriptVariables 等字段
