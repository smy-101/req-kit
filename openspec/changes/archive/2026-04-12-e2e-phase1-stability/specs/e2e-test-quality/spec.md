## ADDED Requirements

### Requirement: 禁止使用 waitForTimeout 进行同步等待

E2E 测试代码中 SHALL NOT 包含任何 `waitForTimeout` 调用。所有等待 MUST 使用 Playwright 的条件等待机制（`expect().toBeVisible()`、`expect().toHaveText()`、`page.waitForSelector()`、`page.waitForFunction()` 等）。

#### Scenario: 替换等待发送请求后的响应
- **WHEN** 测试需要等待请求发送并收到响应
- **THEN** MUST 使用 `expect(responsePanel).toBeVisible()` 或 `waitForSelector` 等待响应面板出现，而非 `waitForTimeout(500)`

#### Scenario: 替换等待模态框打开
- **WHEN** 测试需要等待模态框完全打开并可交互
- **THEN** MUST 使用 `expect(modalOverlay).toBeVisible()` 等待模态框出现，而非 `waitForTimeout(300)`

#### Scenario: 替换等待 UI 状态更新
- **WHEN** 测试需要等待 UI 元素文本或状态变化（如按钮文字从"发送"变为"取消"）
- **THEN** MUST 使用 `expect(locator).toHaveText()` 等待文本变化，而非 `waitForTimeout(300)`

### Requirement: 共享等待 helper 函数

高频等待模式 MUST 抽取到 `tests/e2e/helpers/wait.ts` 中作为可复用函数，避免在各测试文件中重复相同的等待逻辑。

#### Scenario: 发送请求并等待响应 helper
- **WHEN** 测试需要执行"点击发送按钮 + 等待响应面板出现"这一组合操作
- **THEN** MUST 使用 `sendRequestAndWait(page)` helper 函数，而非在每个测试中重复编写等待逻辑

#### Scenario: 等待模态框 helper
- **WHEN** 测试需要等待模态框打开或关闭
- **THEN** MUST 使用 `waitForModal(page)` / `waitForModalClose(page)` helper 函数

### Requirement: 禁止使用条件断言守卫

E2E 测试代码中 SHALL NOT 使用 `if` 条件包裹 `expect` 断言来静默跳过验证。所有断言 MUST 是确定性的——测试要么通过要么明确失败。

#### Scenario: 元素可见性断言
- **WHEN** 测试需要验证某个元素可见
- **THEN** MUST 直接使用 `expect(locator).toBeVisible()`，而非 `if (await locator.isVisible()) { expect(...) }`

#### Scenario: 值存在性断言
- **WHEN** 测试需要验证某个值存在且正确
- **THEN** MUST 先用 `expect(locator).toBeVisible()` 断言存在，再断言值，而非 `if (value) { expect(value).toBe(...) }`

### Requirement: 测试文件状态隔离

需要在干净状态下运行的测试文件 MUST 在 `beforeEach` 中执行 `page.goto('/')` 进行导航重置，确保每个测试用例从已知的页面状态开始。

#### Scenario: 有状态操作的测试文件
- **WHEN** 测试文件中的测试会修改应用状态（创建环境、添加变量、保存请求等）
- **THEN** MUST 在 `test.beforeEach` 中调用 `page.goto('/')` 重置页面状态

#### Scenario: 已有内部导航的测试
- **WHEN** 测试文件中每个 test 已经在内部调用 `page.goto('/')`
- **THEN** 不需要额外添加 `beforeEach`，避免重复导航
