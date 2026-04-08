## MODIFIED Requirements

### Requirement: 代理请求支持自定义选项
ProxyService.sendRequest SHALL 接受可选的 timeout 和 followRedirects 参数。当提供 timeout 时，使用该值替代默认 30000ms。当 followRedirects 为 false 时，fetch 请求 SHALL 使用 `redirect: 'manual'`。

#### Scenario: 自定义超时
- **WHEN** 前端传入 timeout: 5000
- **THEN** ProxyService 使用 5000ms 作为 AbortController 超时时间

#### Scenario: 禁用重定向跟随
- **WHEN** 前端传入 followRedirects: false
- **THEN** ProxyService 使用 `redirect: 'manual'` 发送 fetch 请求，返回重定向响应本身

#### Scenario: 未提供选项使用默认值
- **WHEN** 前端未传入 timeout 或 followRedirects
- **THEN** 使用默认超时 30000ms 和 redirect: 'follow'
