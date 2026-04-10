## Why

req-kit 后端当前缺乏统一的错误处理和输入校验机制。`c.req.json()` 全线无 try-catch，URL 参数 `parseInt` 不校验 NaN，DB 层零错误处理导致 DELETE ALL + INSERT 中途失败时数据丢失。没有全局错误中间件，异常响应格式不一致（Hono 默认格式 vs `{ error: string }`）。这些缺陷在日常使用中可能不会暴露，但会在边界情况（畸形请求、并发操作、磁盘满等）下导致静默故障或不可预测的行为。

## What Changes

- 引入 Zod 作为运行时输入校验库，覆盖所有接受 JSON body 的路由和 URL/query 参数
- 添加 Hono 全局错误中间件 `app.onError()`，统一错误响应格式
- 包装 `c.req.json()` 为安全的 `parseBody()` 工具函数，统一处理 JSON 解析错误和 Zod 校验错误
- 对 DB 层的批量操作（env variables、global variables）添加事务保护，防止部分写入导致数据丢失
- 将 `catch (err: any)` 统一改为 `catch (err: unknown)`，配合类型守卫

## 非目标

- 不改变现有 API 的业务逻辑或响应数据结构（成功响应保持不变）
- 不重构 `routes/proxy.ts` 的架构分层问题（属于独立 change）
- 不处理前端状态管理和组件耦合问题
- 不添加国际化或错误码体系
- 不引入 logging 或监控

## Capabilities

### New Capabilities
- `input-validation`: Zod 校验层 — 所有路由入参（JSON body、URL params、query params）的运行时类型校验和错误格式化
- `error-middleware`: 全局错误处理 — 统一错误响应格式、未捕获异常兜底、JSON 解析错误处理

### Modified Capabilities

## Impact

- **新增依赖**: `zod` (生产依赖)
- **后端代码**: 所有 route 文件需要适配新的校验函数；`src/index.ts` 添加错误中间件；`src/db/index.ts` 添加事务支持
- **API 行为**: 畸形请求从 500/不可预测变为明确的 400 错误 + 校验详情，对正常使用无影响
- **测试**: 现有测试应全部通过；需新增校验和错误处理的单元测试
