## Context

req-kit 的 body-editor.js 当前支持 7 种 body 类型：JSON、Text、XML、Form URL Encoded、Multipart Form Data、Binary、None。用户选择类型后，textarea 或专用编辑器渲染对应输入区域。

GraphQL 请求本质上是一个 POST 请求，body 为 `application/json`，包含 `{ query, variables, operationName }` 字段。目前用户只能手动用 JSON 类型拼装，体验差。

## Goals / Non-Goals

**Goals:**
- body-editor 新增 GraphQL 类型，提供 query 和 variables 两个 textarea
- 发送时自动序列化为 `{ query, variables, operationName }` JSON body
- 正确保存/加载 GraphQL 请求（复用现有 body 字段）
- Format Variables 按钮对 variables textarea 进行 JSON 格式化缩进

**Non-Goals:**
- 不引入任何前端编辑器库
- 不实现 schema introspection、自动补全
- 不改动后端 proxy 逻辑
- 不改动数据库 schema

## Decisions

### 1. 数据存储：复用 body 字段，存储序列化 JSON

**选择**: body 字段存储 `JSON.stringify({ query, variables, operationName })`

**替代方案**: 新增 `graphql_query`、`graphql_variables` 列到 saved_requests 表

**理由**: 零 migration 成本，完全兼容现有数据结构。body_type 字段值为 `graphql` 即可区分。读取时判断 body_type，如果是 graphql 则 JSON.parse 后拆分到两个 textarea。

### 2. 发送逻辑：前端序列化，后端无感

**选择**: 在前端发送请求前，将 query + variables 拼装为 JSON body，设置 Content-Type 为 application/json，通过现有 proxy 路由发送。

**理由**: 后端 proxy 已经支持透传 JSON body，无需任何改动。所有 GraphQL 特定逻辑集中在前端。

### 3. variables 编辑器

**选择**: variables textarea 中输入纯 JSON，发送前解析并合并到请求体。

**理由**: 与 Postman/Insomnia 的 GraphQL variables 编辑器行为一致。用户输入 `{"id": 1}` 而非 `"variables": {"id": 1}`。

## Risks / Trade-offs

- **[纯 textarea 无语法高亮]** → 嵌套大括号可读性较差，但符合项目零依赖原则，未来可按需升级为 CodeMirror
- **[body 字段存 JSON 字符串]** → 变量替换可能误替换 query 中的 `{{}}`，需要在 GraphQL 模式下对 variables textarea 做模板替换，query textarea 不做替换（GraphQL 语法中 `{{` 是合法的）
