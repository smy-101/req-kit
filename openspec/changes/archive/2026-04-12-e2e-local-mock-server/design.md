## Context

当前 E2E 测试使用 Playwright 测试真实 req-kit 应用（端口 3999），所有 HTTP 请求测试依赖 `https://httpbin.org` 外部服务。httpbin.org 共被 30+ 个 spec 文件、100+ 处引用。

现有架构：
- `global-setup.ts` — 清理 DB、杀旧进程、启动主应用、写 PID
- `global-teardown.ts` — 读 PID、杀主应用、清理 DB
- 所有 spec 文件直接硬编码 `https://httpbin.org/...` URL

## Goals / Non-Goals

**Goals:**
- mock 服务器覆盖 httpbin.org 在 E2E 测试中使用的所有端点
- mock 服务器与主应用并行启动/关闭，生命周期由 globalSetup/globalTeardown 管理
- 所有 spec 文件使用统一常量引用 mock 地址，消除硬编码
- 测试离线可运行、执行速度提升、零随机失败

**Non-Goals:**
- 不使用 `page.route()` 拦截（req-kit 代理架构要求真实 HTTP 流量）
- 不实现 httpbin.org 完整 API，仅覆盖实际使用的端点
- 不改变 Playwright 配置（超时、重试、浏览器项目等保持不变）

## Decisions

### 1. 独立 Bun.serve 进程 vs 内联启动

**选择**: 在 `global-setup.ts` 中用 `Bun.spawn` 启动独立 mock 服务器进程。

**理由**: 与主应用启动方式一致（主应用也是 `Bun.spawn` 启动），隔离性好，mock 服务器崩溃不影响 globalSetup 进程。替代方案是在 globalSetup 中直接 `Bun.serve()` 内联启动，但这样需要管理额外的异步生命周期，且 globalSetup 的 `setup()` 函数执行完毕后服务器可能被 GC。

### 2. 端口选择

**选择**: 固定端口 4000。

**理由**: 与主应用端口 3999 不冲突，无需动态分配。E2E 测试只在 CI/本地运行，端口冲突概率极低。替代方案是端口 0 动态分配，但需要通过环境变量或文件传递端口号给测试文件，增加复杂度。

### 3. Mock URL 管理方式

**选择**: 在 `tests/e2e/helpers/mock.ts` 中导出 `MOCK_BASE_URL` 常量，所有 spec 文件从此导入。

**理由**: 集中管理，改端口只需改一处。替代方案是使用环境变量 `process.env.MOCK_BASE_URL`，但 Playwright 的 `testDir` 下文件运行在 Worker 进程中，环境变量传递链路较长。

### 4. 路由匹配方式

**选择**: 手写路由匹配（URL pattern → handler 映射），不引入 Hono 路由。

**理由**: mock 服务器只需要 ~15 个端点，手写路由足够简单，零依赖。引入 Hono 会让 mock 服务器与主应用耦合。

## Risks / Trade-offs

- **[风险] 端口 4000 被占用** → 在 globalSetup 中先 `fuser -k 4000/tcp` 清理，与主应用端口 3999 的处理方式一致
- **[风险] mock 响应与 httpbin.org 行为不完全一致** → 仅保证 E2E 测试验证的字段一致，不追求 1:1 复刻
- **[权衡] 固定端口 vs 动态端口** → 固定端口更简单，但理论上 CI 环境可能冲突；可通过 `fuser` 预清理缓解
- **[权衡] mock 服务器是纯 Bun API** → 不使用 Hono，意味着路由匹配逻辑是手写的，但如果端点数量可控（<20），维护成本可接受
