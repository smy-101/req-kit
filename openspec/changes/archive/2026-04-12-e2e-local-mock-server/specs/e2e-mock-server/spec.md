## ADDED Requirements

### Requirement: Mock 服务器生命周期管理
Mock 服务器 SHALL 在 E2E 测试 globalSetup 阶段启动、globalTeardown 阶段关闭。Mock 服务器进程 PID SHALL 写入 `.mock-server.pid` 文件。Mock 服务器 SHALL 监听端口 4000。启动前 SHALL 清理端口 4000 上的残留进程。

#### Scenario: 正常启动和关闭
- **WHEN** 执行 `globalSetup`
- **THEN** mock 服务器在端口 4000 上可访问，PID 文件 `.mock-server.pid` 被创建

#### Scenario: 残留进程清理
- **WHEN** 上次测试异常退出后端口 4000 被占用
- **THEN** globalSetup 先杀掉残留进程再启动新的 mock 服务器

#### Scenario: 正常关闭
- **WHEN** 执行 `globalTeardown`
- **THEN** mock 服务器进程被终止，`.mock-server.pid` 文件被清理

### Requirement: Mock 服务器端点覆盖
Mock 服务器 SHALL 覆盖 E2E 测试中使用的所有 httpbin.org 端点。所有端点 SHALL 返回与 httpbin.org 兼容的响应格式（JSON），确保现有 E2E 测试断言通过。

#### Scenario: GET /get 端点
- **WHEN** 发送 GET 请求到 `/get`
- **THEN** 返回 JSON 包含 `method: "GET"`、`url` 字段和查询参数

#### Scenario: POST /post 端点
- **WHEN** 发送 POST 请求到 `/post`
- **THEN** 返回 JSON 包含 `method: "POST"` 和请求 body

#### Scenario: PUT /put 端点
- **WHEN** 发送 PUT 请求到 `/put`
- **THEN** 返回 JSON 包含 `method: "PUT"`

#### Scenario: PATCH /patch 端点
- **WHEN** 发送 PATCH 请求到 `/patch`
- **THEN** 返回 JSON 包含 `method: "PATCH"`

#### Scenario: DELETE /delete 端点
- **WHEN** 发送 DELETE 请求到 `/delete`
- **THEN** 返回 JSON 包含 `method: "DELETE"`

#### Scenario: OPTIONS /anything 端点
- **WHEN** 发送任意方法请求到 `/anything`
- **THEN** 返回 JSON 包含请求的 method、headers、body、url

#### Scenario: GET /json 端点
- **WHEN** 发送 GET 请求到 `/json`
- **THEN** 返回示例 JSON 对象（含 `slideshow` 等字段，兼容 httpbin 格式）

#### Scenario: GET /xml 端点
- **WHEN** 发送 GET 请求到 `/xml`
- **THEN** 返回 `Content-Type: application/xml` 的 XML 响应

#### Scenario: GET /html 端点
- **WHEN** 发送 GET 请求到 `/html`
- **THEN** 返回 `Content-Type: text/html` 的 HTML 响应

#### Scenario: GET /image/png 端点
- **WHEN** 发送 GET 请求到 `/image/png`
- **THEN** 返回 `Content-Type: image/png` 的 PNG 图片（有效 PNG 二进制数据）

#### Scenario: GET /uuid 端点
- **WHEN** 发送 GET 请求到 `/uuid`
- **THEN** 返回 JSON 包含 `uuid` 字段（UUID v4 格式）

#### Scenario: GET /status/:code 端点
- **WHEN** 发送 GET 请求到 `/status/404`
- **THEN** 返回 HTTP 状态码 404

#### Scenario: GET /status/500 端点
- **WHEN** 发送 GET 请求到 `/status/500`
- **THEN** 返回 HTTP 状态码 500

#### Scenario: GET /redirect/1 端点
- **WHEN** 发送 GET 请求到 `/redirect/1` 且 follow redirects 关闭
- **THEN** 返回 HTTP 状态码 302 和 `Location` 头

#### Scenario: GET /delay/:seconds 端点
- **WHEN** 发送 GET 请求到 `/delay/5`
- **THEN** 延迟 5 秒后返回响应

#### Scenario: GET /cookies/set 端点
- **WHEN** 发送 GET 请求到 `/cookies/set?k=v`
- **THEN** 返回 `Set-Cookie` 响应头，设置指定 cookie

#### Scenario: GET /response-headers 端点
- **WHEN** 发送 GET 请求到 `/response-headers?Set-Cookie=test1=value1`
- **THEN** 返回 `Set-Cookie` 响应头

### Requirement: Mock URL 统一管理
所有 E2E 测试文件 SHALL 从 `tests/e2e/helpers/mock.ts` 导入 `MOCK_BASE_URL` 常量，替代硬编码的 `https://httpbin.org`。`MOCK_BASE_URL` SHALL 默认为 `http://localhost:4000`。

#### Scenario: URL 常量导入
- **WHEN** E2E 测试文件需要构造请求 URL
- **THEN** 使用 `MOCK_BASE_URL + '/get'` 而非 `'https://httpbin.org/get'`

### Requirement: Mock 服务器健康检查
Mock 服务器 SHALL 在启动后响应健康检查请求，确保 globalSetup 能确认服务器就绪。

#### Scenario: 健康检查
- **WHEN** 向 mock 服务器发送 GET `/` 请求
- **THEN** 返回 HTTP 200
