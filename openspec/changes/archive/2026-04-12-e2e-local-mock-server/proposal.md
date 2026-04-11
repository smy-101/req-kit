## Why

E2E 测试几乎全部依赖 `httpbin.org` 外部服务（涉及 30+ 个测试文件、100+ 处引用）。httpbin.org 不稳定或响应慢时会导致测试随机失败，且增加了测试执行时间（网络延迟）。需要用本地 mock 服务器替代，使 E2E 测试 100% 确定性、快速、离线可运行。

## What Changes

- 新增本地 mock HTTP 服务器（Bun serve），覆盖 httpbin.org 所有在 E2E 测试中使用的端点
- 在 `globalSetup` 中启动 mock 服务器，`globalTeardown` 中关闭
- 所有 E2E 测试文件中的 `https://httpbin.org/...` 替换为 `http://localhost:<mock-port>/...`
- 新增 `MOCK_BASE_URL` 常量统一管理 mock 地址，避免硬编码

## Capabilities

### New Capabilities

- `e2e-mock-server`: 本地 mock HTTP 服务器，模拟 httpbin.org 端点，用于 E2E 测试

### Modified Capabilities

（无现有 spec 需要修改）

## 非目标

- 不替换单元测试或集成测试中的任何依赖
- 不实现 httpbin.org 的全部端点，仅覆盖 E2E 测试实际使用的端点
- 不引入 Playwright 的内置 request mock（`page.route()`），因为 req-kit 的代理架构要求真实 HTTP 请求
- 不修改 Playwright 配置中的浏览器项目（Chromium only 策略不变）

## Impact

- **新增文件**: `tests/e2e/mock-server.ts`（mock 服务器实现）
- **修改文件**: `tests/e2e/global-setup.ts`（启动 mock 服务器）、`tests/e2e/global-teardown.ts`（关闭 mock 服务器）、所有 30+ 个 E2E spec 文件（替换 URL）
- **依赖**: 无新增外部依赖，使用 Bun 内置 `Bun.serve`
- **端口**: mock 服务器使用固定端口 4000（与主应用 3999 不冲突）
