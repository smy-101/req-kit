## Why

当前 E2E 测试存在三类稳定性问题：(1) 大量 `waitForTimeout` 硬等待导致测试在慢机器上 flaky、在快机器上浪费时间；(2) 条件断言（`if` 块包裹）静默跳过验证，掩盖真实失败；(3) 缺少 `beforeEach` 状态清理，测试间存在隐式状态依赖。这些问题在 CI 环境和并行执行下尤为严重，直接降低测试可信度。

## What Changes

- 将所有 `waitForTimeout` 调用替换为 Playwright 条件等待（`expect().toBeVisible()`、`waitForSelector`、`waitFor` 等）
- 移除条件断言中的 `if` 守卫，改为确定性 `expect` 断言，让测试在真正失败时正确报错
- 为需要的测试文件添加 `beforeEach` 导航和状态重置逻辑
- 将高频重复的等待模式抽取为共享 helper 函数

## 非目标

- 不引入 Page Object Model（留给后续阶段）
- 不修改测试覆盖范围（不新增测试用例）
- 不修改 mock server 或应用代码
- 不修改 Playwright 配置（超时、重试、并行策略）

## Capabilities

### New Capabilities

### Modified Capabilities

（无 spec 级别行为变更，仅改进测试实现质量）

## Impact

- **受影响代码**: `tests/e2e/` 下所有 42 个测试文件
- **新增文件**: `tests/e2e/helpers/wait.ts`（共享等待 helper）
- **依赖**: 无外部依赖变更
