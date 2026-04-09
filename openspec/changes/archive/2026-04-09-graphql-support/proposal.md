## Why

req-kit 目前只支持 REST API 调试，缺少 GraphQL 支持。个人开发中经常需要调试 GraphQL 接口，当前只能用 JSON body type 手动拼装 `{ query, variables }` 格式，体验较差。

## What Changes

- Body 编辑器新增 "GraphQL" 类型选项
- GraphQL body 编辑器提供 query textarea 和 variables textarea 两个输入区域
- 发送请求时自动将 query + variables 包装为 `{ query, variables, operationName }` JSON body
- 支持保存和加载 GraphQL 请求（复用现有 saved_requests 结构）
- 集合运行器中的 GraphQL 请求正确执行

## 非目标

- 不引入 CodeMirror 或其他编辑器库，纯 textarea 实现
- 不实现 GraphQL schema introspection 或自动补全
- 不实现 Schema Explorer 面板
- 后端 proxy 无需改动，透传 JSON body

## Capabilities

### New Capabilities
- `graphql-body`: GraphQL 请求体编辑器，包含 query 和 variables 输入区域，发送时自动序列化为 JSON

### Modified Capabilities
（无现有 capability 的需求级别变更）

## Impact

- **前端**: `body-editor.js` 新增 GraphQL 编辑器 UI 和序列化逻辑
- **后端**: 无改动，proxy 直接透传
- **数据库**: 无改动，body 字段存储 `JSON.stringify({ query, variables, operationName })`
- **依赖**: 无新依赖
