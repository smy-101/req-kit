## 1. 基础设施

- [x] 1.1 创建 `tests/e2e/helpers/wait.ts`，定义共享等待 helper 函数（`waitForResponse`、`waitForModal`、`waitForModalClose`、`sendRequestAndWait`、`waitForPanelLoad`）
- [x] 1.2 验证所有现有测试仍然通过（`bun run test:e2e` 基线确认）

## 2. 消除 waitForTimeout — 高频文件（每文件 ≥7 处）

- [x] 2.1 `variable-autocomplete.spec.ts`（14 处）
- [x] 2.2 `response-search-nav.spec.ts`（14 处）
- [x] 2.3 `variable-resolution.spec.ts`（12 处）
- [x] 2.4 `history-load-verify.spec.ts`（11 处）
- [x] 2.5 `env-unsaved.spec.ts`（10 处）
- [x] 2.6 `scripts.spec.ts`（7 处）
- [x] 2.7 `response-extras.spec.ts`（7 处）

## 3. 消除 waitForTimeout — 中频文件（每文件 3-6 处）

- [x] 3.1 `management-advanced.spec.ts`（6 处）+ `auth.spec.ts`（6 处）
- [x] 3.2 `tab-advanced.spec.ts`（5 处）+ `save-update.spec.ts`（5 处）+ `history-pagination.spec.ts`（5 处）+ `edge-cases.spec.ts`（5 处）
- [x] 3.3 `panel-resizer.spec.ts`（4 处）+ `history-advanced.spec.ts`（4 处）+ `cookie-advanced.spec.ts`（4 处）+ `collection-context-menu.spec.ts`（4 处）
- [x] 3.4 `save-dialog-advanced.spec.ts`（3 处）+ `runner-stop.spec.ts`（3 处）+ `follow-redirects.spec.ts`（3 处）+ `request-options.spec.ts`（3 处）+ `body-types.spec.ts`（3 处）

## 4. 消除 waitForTimeout — 低频文件（每文件 1-2 处）

- [x] 4.1 `collection-advanced.spec.ts`（2 处）+ `request.spec.ts`（2 处）+ `request-timeout.spec.ts`（2 处）+ `headers-params.spec.ts`（2 处）+ `response-advanced.spec.ts`（2 处）+ `save-load.spec.ts`（2 处）
- [x] 4.2 `runner-advanced.spec.ts`（1 处）+ `request-cancellation.spec.ts`（1 处）+ `runner.spec.ts`（1 处）+ `variables.spec.ts`（1 处）+ `collection-variables.spec.ts`（1 处）+ `import-export.spec.ts`（1 处）+ `environment-advanced.spec.ts`（1 处）+ `environment.spec.ts`（1 处）+ `cookies.spec.ts`（1 处）+ `collection.spec.ts`（1 处）+ `http-methods.spec.ts`（1 处）+ `options-method.spec.ts`（1 处）+ `export.spec.ts`（1 处）+ `keyboard-shortcuts.spec.ts`（1 处）+ `response-format-switching.spec.ts`（1 处）

## 5. 消除条件断言守卫

- [x] 5.1 `cookie-advanced.spec.ts` — 移除 `if (hasCookies)` 条件守卫（2 处），改为确定性断言
- [x] 5.2 `response-extras.spec.ts` — 移除 `if (await prettyTab.isVisible())`、`if (await previewTab.isVisible())`、`if (await imagePreview.isVisible(...).catch(...))` 条件守卫（3 处）
- [x] 5.3 `response-search-nav.spec.ts` — 移除 `if (totalMatch && parseInt(totalMatch) > 1)` 条件守卫（2 处）

## 6. 添加 beforeEach 导航重置

- [x] 6.1 为以下文件添加 `beforeEach` 导航：`auth.spec.ts`、`body-types.spec.ts`、`collection-advanced.spec.ts`、`collection-context-menu.spec.ts`、`collection.spec.ts`、`collection-variables.spec.ts`、`cookies.spec.ts`、`environment-advanced.spec.ts`、`environment.spec.ts`、`env-unsaved.spec.ts`、`headers-params.spec.ts`、`management-advanced.spec.ts`、`request-options.spec.ts`、`request.spec.ts`、`request-timeout.spec.ts`、`response-advanced.spec.ts`、`response-extras.spec.ts`、`response-format-switching.spec.ts`、`response-search-nav.spec.ts`、`runner-advanced.spec.ts`、`runner.spec.ts`、`runner-stop.spec.ts`、`save-dialog-advanced.spec.ts`、`save-load.spec.ts`、`save-update.spec.ts`、`scripts.spec.ts`、`tab-advanced.spec.ts`、`variable-autocomplete.spec.ts`、`variable-resolution.spec.ts`、`variables.spec.ts`

## 7. 验证

- [x] 7.1 全量运行 E2E 测试确认所有修改通过（194 passed, 0 failed, 0 flaky）
- [x] 7.2 `grep -rn "waitForTimeout" tests/e2e/` 确认零残留
- [x] 7.3 `grep -rn "if.*isVisible\|if.*hasCookies\|if.*totalMatch" tests/e2e/` 确认条件断言零残留
