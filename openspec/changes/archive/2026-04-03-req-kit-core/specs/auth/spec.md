## ADDED Requirements

### Requirement: Bearer Token 认证

系统 SHALL 支持在代理请求中自动注入 `Authorization: Bearer <token>` 请求头。当保存的请求 `auth_type` 为 `bearer` 时，代理 SHALL 从 `auth_config.token` 中读取 token 值。

#### Scenario: 自动注入 Bearer Token
- **WHEN** 保存的请求 `auth_type` 为 `"bearer"`，`auth_config` 为 `{ "token": "my-secret-token" }`
- **THEN** 代理请求自动添加 `Authorization: Bearer my-secret-token` 请求头

### Requirement: Basic Auth 认证

系统 SHALL 支持在代理请求中自动注入 `Authorization: Basic <encoded>` 请求头。当 `auth_type` 为 `basic` 时，代理 SHALL 从 `auth_config.username` 和 `auth_config.password` 读取凭据，Base64 编码后注入。

#### Scenario: 自动注入 Basic Auth
- **WHEN** 保存的请求 `auth_type` 为 `"basic"`，`auth_config` 为 `{ "username": "admin", "password": "pass123" }`
- **THEN** 代理请求自动添加 `Authorization: Basic YWRtaW46cGFzczEyMw==` 请求头

### Requirement: API Key 认证

系统 SHALL 支持在代理请求中注入 API Key。当 `auth_type` 为 `apikey` 时，代理 SHALL 从 `auth_config` 中读取 `key`、`value`、`in`（`header` 或 `query`），根据 `in` 决定注入位置。

#### Scenario: API Key 注入到 Header
- **WHEN** `auth_type` 为 `"apikey"`，`auth_config` 为 `{ "key": "X-API-Key", "value": "abc123", "in": "header" }`
- **THEN** 代理请求添加 `X-API-Key: abc123` 请求头

#### Scenario: API Key 注入到 Query
- **WHEN** `auth_type` 为 `"apikey"`，`auth_config` 为 `{ "key": "api_key", "value": "abc123", "in": "query" }`
- **THEN** 代理请求 URL 追加 `?api_key=abc123` 查询参数

### Requirement: 认证类型为 none

当 `auth_type` 为 `none` 或未设置时，系统 SHALL 不注入任何认证信息。

#### Scenario: 无认证
- **WHEN** 保存的请求 `auth_type` 为 `"none"`
- **THEN** 代理请求不注入任何认证头或参数
