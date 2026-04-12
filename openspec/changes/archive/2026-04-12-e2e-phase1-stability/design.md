## Context

当前 E2E 测试套件（42 个文件、180+ 用例）使用 Playwright 测试一个纯 Vanilla JS 前端 + Hono 后端的 API 测试工具。测试通过 `globalSetup` 启动 mock server（端口 4000）和应用 server（端口 3999），所有测试共享同一个 `test.db`。

核心问题：
- **硬等待泛滥**: `waitForTimeout` 在几乎所有测试文件中使用，总计 80+ 处
- **静默失败**: 5+ 个文件使用 `if` 条件包裹断言，测试永远"通过"
- **无状态隔离**: 大部分测试没有 `beforeEach` 清理，依赖隐式导航重置

## Goals / Non-Goals

**Goals:**
- 消除所有 `waitForTimeout` 调用，替换为确定性条件等待
- 消除所有条件断言守卫（`if` 包裹），改为直接 `expect`
- 为需要状态重置的测试添加 `beforeEach` 导航
- 抽取高频等待模式为共享 helper，减少重复代码

**Non-Goals:**
- 不引入 Page Object Model
- 不新增测试用例或覆盖新功能
- 不修改 Playwright 配置（超时、重试、并行策略）
- 不修改 mock server 或应用源代码

## Decisions

### 1. 等待策略：Playwright 内置条件等待

**选择**: 使用 `expect(locator).toBeVisible()` / `expect(locator).toHaveText()` / `page.waitForSelector()` 替代所有 `waitForTimeout`

**替代方案**:
- `page.waitForFunction()`: 过于底层，调试困难
- 自定义 retry 轮询: 重复造轮子

**理由**: Playwright 的 auto-retry 机制本身就是为 DOM 变更设计的，天然处理异步渲染。对于无法用 locator 等待的场景（如 store 事件触发的副作用），使用 `page.waitForSelector` 配合 `state: 'attached'`。

### 2. 条件断言替换：确定性 expect

**选择**: 将 `if (await el.isVisible()) { expect(...) }` 替换为 `await expect(el).toBeVisible()`；将 `if (hasValue) { expect(...) }` 替换为先断言存在再断言值

**替代方案**:
- soft assertions: Playwright 不原生支持
- try/catch 包裹: 反模式，隐藏真实错误

**理由**: 测试失败应该被暴露而非静默跳过。如果某个元素确实可能不出现，那应该是两个独立测试（一个验证出现条件，一个验证不出现条件）。

### 3. 共享 helper 抽取策略

**选择**: 在 `tests/e2e/helpers/wait.ts` 中创建高频等待 helper 函数

**高频模式**:
- `waitForResponse()` — 等待响应面板出现并加载完成
- `waitForModal()` — 等待模态框打开/关闭
- `waitForToast()` — 等待 toast 通知出现并消失
- `sendRequestAndWait()` — 点击发送并等待响应
- `waitForPanelLoad()` — 等待侧边栏面板加载

**替代方案**:
- Playwright custom fixture: 过重，需要修改所有测试文件签名
- 全局 `page.waitForTimeout` 覆盖: 危险，掩盖问题

### 4. beforeEach 导航策略

**选择**: 对有状态依赖的测试文件添加 `test.beforeEach(async ({ page }) => { await page.goto('/'); })` 导航重置

**不添加 beforeEach 的文件**: 已经在每个 test 内部执行 `page.goto('/')` 的文件（如 `app.spec.ts`、`tabs.spec.ts`）

**理由**: `page.goto('/')` 本身就是轻量操作（SPA 无刷新），且能确保每次测试从干净页面状态开始。

## Risks / Trade-offs

- **[风险] 某些等待场景难以用 locator 表达** → 对于 store 驱动的 UI 更新，使用 `waitForSelector` 配合 CSS 选择器作为兜底，而非回退到 `waitForTimeout`
- **[风险] 移除条件断言后部分测试可能暴露真实 bug** → 这是期望行为，记录在 tasks 中作为已知可能发现的问题
- **[风险] 替换量大（42 文件、80+ 处 waitForTimeout）** → 按文件分批处理，每批替换后运行测试验证
- **[权衡] 共享 helper 增加间接层** → 仅抽取真正高频（3+ 处）的模式，避免过度抽象
