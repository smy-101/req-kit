## 1. 基础设施搭建

- [x] 1.1 安装 zod 依赖 (`bun add zod`)
- [x] 1.2 创建 `src/lib/` 目录和 `src/lib/validation.ts` — 实现 `ValidationError` 类、`parseBody()`、`parseParam()`、`parseQuery()`、`getErrorMessage()` 工具函数
- [x] 1.3 在 `src/db/index.ts` 的 Database 类上添加 `transaction<T>(fn: () => T): T` 方法，底层调用 bun:sqlite 的 `this.sqliteDb.transaction(fn)`

## 2. 全局错误中间件

- [x] 2.1 在 `src/index.ts` 中注册 `app.onError()` 全局错误处理 — 捕获 ValidationError 返回 400 + details，捕获其他异常返回 500 + console.error

## 3. 路由校验适配

- [x] 3.1 `src/routes/collections.ts` — 定义 Zod schema，所有 `c.req.json()` 改用 `parseBody()`，所有 `c.req.param()` 改用 `parseParam()`，移除手动校验代码
- [x] 3.2 `src/routes/environments.ts` — 同上适配
- [x] 3.3 `src/routes/global-variables.ts` — 同上适配
- [x] 3.4 `src/routes/history.ts` — 定义 query 参数 Zod schema，`c.req.query()` 改用 `parseQuery()`，`c.req.param()` 改用 `parseParam()`
- [x] 3.5 `src/routes/import-export.ts` — 同上适配
- [x] 3.6 `src/routes/proxy.ts` — 适配 `c.req.json()` 为 `parseBody()`
- [x] 3.7 `src/routes/runner.ts` — 同上适配
- [x] 3.8 `src/routes/cookies.ts` — 适配 `c.req.param()` 为 `parseParam()`

## 4. DB 事务保护

- [x] 4.1 `src/services/environment.ts` — `replaceVariables()` 使用 `db.transaction()` 包裹 DELETE + INSERT
- [x] 4.2 `src/services/variable.ts` — `replaceGlobal()` 和 `replaceForCollection()` 使用 `db.transaction()` 包裹 DELETE + INSERT

## 5. catch (err: any) 改造

- [x] 5.1 将所有 `catch (err: any)` 改为 `catch (err: unknown)`，使用 `getErrorMessage()` 提取错误消息（涉及 proxy.ts、script.ts、runner.ts 等）

## 6. 测试

- [x] 6.1 为 `src/lib/validation.ts` 编写单元测试 — 覆盖 parseBody/parseParam/parseQuery 的正常和异常路径
- [x] 6.2 为全局错误中间件编写集成测试 — 验证 ValidationError 返回 400、未预期异常返回 500
- [x] 6.3 为 DB 事务方法编写单元测试 — 验证事务提交和回滚行为
- [x] 6.4 运行全量测试确保现有 261 个测试不受影响
