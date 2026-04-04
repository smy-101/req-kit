## Context

req-kit 当前的代理管线支持前置脚本（在请求发送前执行），用于动态修改请求。后置脚本将补全管线的另一半——在收到响应后执行，用于验证响应、提取变量、构建自动化测试。

当前 `ScriptService` 使用 `node:vm` 的 `runInNewContext` 执行用户脚本，沙箱已包含 `variables`、`environment`、`console` 等对象。后置脚本可以复用同一套 VM 基础设施，只需替换 `request` 对象为 `response` 对象，并新增 `tests` 断言收集器。

代理管线当前顺序：模板替换 → 前置脚本 → Auth → 发送 → 记录历史。后置脚本插入在"发送"和"记录历史"之间。

## Goals / Non-Goals

**Goals:**
- 支持后置脚本在响应到达后执行，可访问完整的响应数据
- 提供简洁的断言 API（`tests["名称"] = 表达式`）
- 支持从响应中提取变量（`variables.set()`）并传递给后续请求
- 前端请求面板新增独立 tab 编写后置脚本
- 前端响应面板展示断言结果（通过/失败统计）
- 保存的请求和历史记录中持久化后置脚本

**Non-Goals:**
- 不支持 Postman 的 `pm.test()` + Chai 链式断言风格（过于复杂）
- 不支持 SSE 流式模式下的后置脚本执行（响应体不完整）
- 不实现集合批量运行器（独立功能，后续单独做）
- 不支持 `postman.setNextRequest()` 流程控制（属于集合运行器范畴）
- 不支持异步后置脚本（`async/await`、`setTimeout`）

## Decisions

### 1. 断言 API 风格：简洁赋值式

**选择**: `tests["断言名称"] = 表达式`（返回布尔值）

**备选方案**:
- Postman 的 `pm.test("name", fn)` + Chai 风格 — 功能强大但引入学习成本和依赖
- `assert(条件, "消息")` 风格 — 缺少命名，批量运行时难以区分

**理由**: 与前置脚本的 `variables.set()` 风格一致，零学习成本。用户一眼就会用。底层用 `Proxy` 捕获赋值，收集到 `Record<string, boolean>` 中。

### 2. ScriptService 新增独立方法

**选择**: 新增 `executePostScript()` 方法，不复用 `execute()`

**理由**: 两个方法的沙箱对象完全不同（`request` vs `response`），返回值也不同（`ScriptResult` vs `PostScriptResult`）。强行复用会引入条件分支，不如独立方法清晰。

### 3. UI 布局：请求面板加独立 "Tests" tab

**选择**: 在现有 5 个 tab（Headers/Params/Body/Auth/Script）后新增第 6 个 "Tests" tab

**备选方案**: 在 Script tab 内用子标签切换前置/后置

**理由**: 前置脚本和后置脚本的用途完全不同（修改请求 vs 验证响应），放在同一个 tab 内容易混淆。6 个 tab 视觉上完全放得下。

### 4. SSE 流式模式不支持后置脚本

**选择**: 流式模式下静默忽略 `post_response_script`，不报错

**理由**: 流式响应体是逐块到达的，后置脚本无法拿到完整 body。强行支持需要缓冲全部数据，失去了流式模式的意义。静默忽略比报错更友好。

## Risks / Trade-offs

- **[大响应体的 JSON 解析]** → 后置脚本中 `response.json()` 对超大响应（接近 50MB）可能很慢。缓解：文档中提示用户避免对大响应调用 `json()`，脚本本身有 5 秒超时保护。
- **[前端 tab 数量增多]** → 6 个 tab 在窄屏下可能拥挤。缓解：tab 文字已很短（Headers/Params/Body/Auth/Script/Tests），实际空间足够；如需优化可后续用图标。
- **[断言 API 不可扩展]** → 简单赋值式无法提供详细错误信息。缓解：当前优先简洁；后续如需增强，可以在 `tests` 的 `Proxy` 中扩展为支持 `{ passed: boolean, message?: string }`。
