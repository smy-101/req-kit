## ADDED Requirements

### Requirement: JSON body 校验
所有接受 JSON body 的路由 SHALL 使用 Zod schema 对请求体进行运行时校验。校验失败时 SHALL 返回 HTTP 400，响应体格式为 `{ error: '请求参数无效', details: string[] }`。

#### Scenario: 畸形 JSON 请求体
- **WHEN** 客户端发送非 JSON 格式的 body（如 `name=abc`）
- **THEN** 返回 HTTP 400，响应体包含 `error: '请求参数无效'`，`details` 数组包含 JSON 解析错误信息

#### Scenario: JSON body 字段类型不匹配
- **WHEN** 客户端发送 `{"name": 123}` 到 `POST /api/collections`
- **THEN** 返回 HTTP 400，响应体包含 `error: '请求参数无效'`，`details` 指出 `name` 应为字符串

#### Scenario: JSON body 缺少必填字段
- **WHEN** 客户端发送 `{}` 到 `POST /api/collections`
- **THEN** 返回 HTTP 400，响应体包含 `error: '请求参数无效'`，`details` 指出缺少 `name` 字段

#### Scenario: 合法 JSON body 通过校验
- **WHEN** 客户端发送合法的 JSON body（如 `{"name": "新集合"}` 到 `POST /api/collections`）
- **THEN** 校验通过，请求正常处理

### Requirement: URL 参数校验
所有使用 `c.req.param('id')` 的路由 SHALL 将参数解析为整数并校验其有效性。无效参数 SHALL 返回 HTTP 400。

#### Scenario: URL 参数为非数字字符串
- **WHEN** 请求 `DELETE /api/collections/abc`
- **THEN** 返回 HTTP 400，响应体包含 `error: '请求参数无效'`，`details` 指出 `id` 不是有效的数字

#### Scenario: URL 参数为合法数字
- **WHEN** 请求 `DELETE /api/collections/42`
- **THEN** 校验通过，参数值为整数 42，请求正常处理

### Requirement: Query 参数校验
使用 `c.req.query()` 的路由 SHALL 使用 Zod schema 对 query 参数进行类型校验和默认值填充。

#### Scenario: Query 参数类型不合法
- **WHEN** 请求 `GET /api/history?page=abc&limit=-1`
- **THEN** 返回 HTTP 400，响应体包含 `error: '请求参数无效'`，`details` 指出参数类型错误

#### Scenario: Query 参数省略时使用默认值
- **WHEN** 请求 `GET /api/history`（不传 page 和 limit）
- **THEN** 校验通过，使用默认值（page=1, limit=20），请求正常处理

### Requirement: 各路由 Zod Schema 定义
每个路由文件 SHALL 在文件顶部定义该路由使用的 Zod schema，schema SHALL 与现有 `c.req.json<T>()` 的泛型类型保持一致。

多个路由文件共享相同 schema 时（如 `ReplaceVariablesSchema`），SHALL 将共享 schema 提取到 `lib/validation.ts` 中统一导出，各路由文件通过 import 引用，消除重复定义。

#### Scenario: Schema 覆盖所有路由
- **WHEN** 检查所有 8 个路由文件
- **THEN** 每个 `c.req.json()` 调用都有对应的 Zod schema，每个 URL 参数和 query 参数都有校验逻辑

#### Scenario: ReplaceVariablesSchema 统一导出
- **WHEN** `global-variables.ts`、`collections.ts`、`environments.ts` 需要使用 `ReplaceVariablesSchema`
- **THEN** 三个文件均从 `lib/validation.ts` import 该 schema，不存在重复定义

### Requirement: parseBody / parseParams / parseQuery 工具函数
系统 SHALL 提供 `parseBody(c, schema)`、`parseParam(c, name)`、`parseQuery(c, schema)` 三个工具函数，分别处理 JSON body 解析+校验、URL 参数解析+校验、query 参数校验。

#### Scenario: parseBody 同时处理 JSON 解析和 Zod 校验
- **WHEN** `parseBody(c, schema)` 收到畸形 JSON
- **THEN** 抛出 `ValidationError`，issues 包含 JSON 解析错误信息

#### Scenario: parseBody 在 Zod 校验失败时抛出 ValidationError
- **WHEN** `parseBody(c, schema)` 收到合法 JSON 但不符合 schema
- **THEN** 抛出 `ValidationError`，issues 包含 Zod 的路径和消息

#### Scenario: parseParam 对 NaN 返回错误
- **WHEN** `parseParam(c, 'id')` 收到非数字参数
- **THEN** 抛出 `ValidationError`，issues 包含参数名和原始值
