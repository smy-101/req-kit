## Purpose

SSE（Server-Sent Events）流解析器，封装 SSE 协议的 buffer 管理、行分割、event/data 字段解析，处理跨 chunk 数据拼接。

## Requirements

### Requirement: SSE 流解析器
`sse-parser.js` SHALL 导出一个 `parseSSEStream(reader, callbacks)` 函数，封装 SSE 协议的 buffer 管理、行分割、event/data 字段解析。

`callbacks` 对象 SHALL 支持以下字段（均为可选函数）：
- `onEvent(event, data)`: 收到完整 SSE 事件时调用
- `onError(error)`: 流读取出错时调用

#### Scenario: 解析标准 SSE 事件
- **WHEN** 流数据为 `event: headers\ndata: {"status":200}\n\n`
- **THEN** `onEvent('headers', {"status":200})` 被调用一次

#### Scenario: 跨 chunk 的事件拼接
- **WHEN** 第一个 chunk 为 `event: hea`，第二个 chunk 为 `ders\ndata: {}\n\n`
- **THEN** `onEvent('headers', {})` 被正确调用（buffer 正确拼接跨 chunk 的行）

#### Scenario: 忽略非 event/data 行
- **WHEN** 流数据包含空行和注释行（以 `:` 开头）
- **THEN** 这些行被跳过，不影响事件解析

#### Scenario: 流读取错误
- **WHEN** reader.read() 抛出非 AbortError 异常
- **THEN** `onError(error)` 被调用

#### Scenario: AbortError 不触发 onError
- **WHEN** reader.read() 抛出 AbortError（用户取消）
- **THEN** `onError` 不被调用，函数正常返回
