## ADDED Requirements

### Requirement: 全局错误中间件
系统 SHALL 在 `src/index.ts` 中注册 Hono 全局错误中间件 `app.onError()`，捕获所有未处理的异常并返回统一的 JSON 错误响应。

#### Scenario: ValidationError 被全局中间件捕获
- **WHEN** 路由抛出 `ValidationError`（issues: ['name 必须是字符串']）
- **THEN** 全局中间件返回 HTTP 400，响应体为 `{ error: '请求参数无效', details: ['name 必须是字符串'] }`

#### Scenario: 未预期的异常被全局中间件兜底
- **WHEN** 任何路由或服务抛出非 `ValidationError` 的异常
- **THEN** 全局中间件返回 HTTP 500，响应体为 `{ error: '服务器内部错误' }`，同时在服务端 `console.error` 输出错误详情

### Requirement: 统一错误响应格式
所有错误响应 SHALL 使用 `{ error: string, details?: string[] }` 格式。`error` 为人类可读的错误摘要，`details` 为可选的详细错误列表。

#### Scenario: 校验错误包含 details
- **WHEN** 返回 400 校验错误
- **THEN** 响应体包含 `error` 字段和 `details` 数组

#### Scenario: 业务错误不含 details
- **WHEN** 返回 404 业务错误（如 '集合不存在'）
- **THEN** 响应体包含 `error: '集合不存在'`，不包含 `details` 字段

### Requirement: DB 事务保护
Database 类 SHALL 提供 `transaction<T>(fn: () => T): T` 方法，使用 bun:sqlite 内置事务支持。执行批量 DELETE + INSERT 的 service 方法 SHALL 使用事务包裹，确保操作的原子性。

#### Scenario: 事务内操作成功
- **WHEN** `replaceVariables()` 在事务内执行 DELETE + 多条 INSERT 且全部成功
- **THEN** 所有变更提交，返回更新后的变量列表

#### Scenario: 事务内操作部分失败
- **WHEN** `replaceVariables()` 在事务内 DELETE 成功但某条 INSERT 失败（如约束违反）
- **THEN** 整个事务回滚，数据恢复到 DELETE 之前的状态

#### Scenario: transaction 方法可嵌套使用
- **WHEN** service 方法调用 `db.transaction()` 且内部无嵌套事务
- **THEN** 事务正常执行并提交

### Requirement: catch (err: unknown) 统一改造
所有 `catch (err: any)` SHALL 改为 `catch (err: unknown)`。访问错误属性时 SHALL 使用类型守卫函数 `getErrorMessage(err: unknown): string`。

#### Scenario: 类型守卫正确提取错误消息
- **WHEN** 捕获到的 err 是标准 Error 实例
- **THEN** `getErrorMessage(err)` 返回 `err.message`

#### Scenario: 类型守卫处理非 Error 类型
- **WHEN** 捕获到的 err 是字符串 `'some error'`
- **THEN** `getErrorMessage(err)` 返回 `'some error'`

#### Scenario: 类型守卫处理 null/undefined
- **WHEN** 捕获到的 err 是 `null`
- **THEN** `getErrorMessage(err)` 返回 `'未知错误'`
