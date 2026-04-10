## Context

req-kit 后端基于 Bun + Hono + bun:sqlite，当前有 8 个路由文件、7 个服务文件。所有路由的 `c.req.json()` 调用（14 处）无 JSON 解析错误处理，URL 参数 `parseInt`（17 处）不校验 NaN，query 参数（6 处）无类型校验。Database 类无事务方法，3 个服务方法使用 DELETE ALL + INSERT 模式且无事务保护。无全局错误中间件，错误响应格式不完全一致。

现有依赖仅 `hono`（生产）和 `@types/bun`（开发）。

## Goals / Non-Goals

**Goals:**

- 所有路由入参（JSON body、URL params、query params）都有运行时校验，非法输入返回明确的 400 错误
- 统一错误响应格式：`{ error: string, details?: string[] }`
- DB 批量操作使用事务保护，防止部分写入
- `catch (err: any)` 统一改为 `unknown`

**Non-Goals:**

- 不重构 proxy.ts 的架构分层
- 不改变成功响应的数据结构
- 不引入错误码体系或国际化
- 不处理前端代码

## Decisions

### 1. 选择 Zod 作为校验库

**选择**: Zod

**备选方案**:
- Valibot — 更轻量，但生态较小
- 手写校验函数 — 无额外依赖，但重复代码多、类型推导差
- TypeBox — JSON Schema 基础，与 Zod 功能相当但 API 风格不同

**理由**: Zod 是 TypeScript 生态中最主流的运行时校验库，与 Hono 有官方集成 (`@hono/zod-validator`)，社区资源丰富。bun 对 ESM 支持好，Zod 的 tree-shaking 可控。虽然 req-kit 目前依赖极少，但 Zod 是投入产出比最高的选择。

### 2. 不使用 @hono/zod-validator，自建轻量包装

**选择**: 自建 `parseBody()` 和 `parseParams()` 工具函数

**备选方案**:
- `@hono/zod-validator` — Hono 官方 Zod 中间件
- 手写每个路由的 try-catch

**理由**: `@hono/zod-validator` 引入额外的中间件概念和依赖。req-kit 的路由是工厂函数模式（`createXxxRoutes(service)`），中间件注入不够自然。自建工具函数更贴合现有代码风格，且可以同时处理 JSON 解析错误 + Zod 校验错误，一个函数解决两个问题。

```
// 目标 API
const body = await parseBody(c, CreateCollectionSchema);  // 合并 JSON 解析 + 校验
const id = parseParam(c, 'id');                           // parseInt + NaN 校验
const { page, limit } = parseQuery(c, PaginationSchema);  // query 参数校验
```

### 3. 工具函数放在 `src/lib/` 目录

**选择**: 新建 `src/lib/validation.ts`

**理由**: 现有代码按 `db/`、`services/`、`routes/` 分层，校验工具不属于任何一层。`src/lib/` 作为横切工具目录，未来可以放其他共享工具（如 `src/lib/errors.ts`）。

### 4. 错误中间件实现方式

**选择**: `app.onError()` 注册全局错误处理

**实现**: 在 `src/lib/error-handler.ts` 中导出 `errorHandler` 函数，在 `src/index.ts` 中所有路由注册之后通过 `app.onError(errorHandler)` 注册：

### 5. DB 事务 — 利用 bun:sqlite 内置的 `db.transaction()`

**选择**: 在 `Database` 类上添加 `transaction<T>(fn: () => T): T` 方法，底层调用 `this.sqliteDb.transaction(fn)`

**理由**: bun:sqlite 原生支持 `db.transaction()`，无需额外库。包装一层即可暴露给 service 使用。

### 6. 错误类设计

**选择**: 自定义 `ValidationError` 类继承 `Error`，携带 `issues: string[]` 字段

```
class ValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) { super('请求参数无效'); this.issues = issues; }
}
```

`parseBody()` 和 `parseParams()` 在校验失败时抛出 `ValidationError`，由全局 `app.onError()` 统一捕获。

### 7. 校验策略 — 仅校验路由边界，不侵入 service 层

**选择**: Zod schema 仅在路由层使用，service 层保持现有的 return-value 错误模式

**理由**: service 层的错误模式（返回 boolean/null 表示 not found）已经工作良好且测试充分。在校验层拦截非法输入后，service 层收到的数据已经是合法的。不需要在 service 层重复校验。

## Risks / Trade-offs

**[新增依赖]** → Zod 是 req-kit 第一个非框架生产依赖。缓解：Zod 体积小（~13KB gzip），且是 TypeScript 生态标准库，长期维护有保障。

**[parseBody 改变错误行为]** → 之前畸形 JSON 可能触发 Hono 默认 500，现在统一为 400。缓解：这是正确的行为变化，前端无需改动（错误展示逻辑已是通用的）。

**[事务引入锁竞争]** → SQLite 单写者模型下事务可能增加写锁持有时间。缓解：req-kit 是单用户工具，并发写极低；事务包裹的 DELETE+INSERT 操作本身很快。

**[catch (err: unknown) 需要类型守卫]** → 改为 unknown 后，访问 err.message 需要类型检查。缓解：提取一个 `getErrorMessage(err: unknown): string` 工具函数复用。
