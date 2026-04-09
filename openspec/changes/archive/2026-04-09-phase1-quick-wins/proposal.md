## Why

日常使用 req-kit 进行 API 测试时，三个高频痛点反复出现：操作效率低（缺少键盘快捷键）、长时间使用眼睛疲劳（无深色主题）、集合运行器遇到偶发失败只能手动重跑（无自动重试）。这三个问题改动量小但使用频率极高，优先解决可以立刻提升日常开发体验。

## What Changes

- **键盘快捷键体系**：新增 Ctrl+S 保存请求、Ctrl+N 新建标签、Ctrl+W 关闭标签、Ctrl+Tab/Ctrl+Shift+Tab 切换标签、Ctrl+Shift+N 新建请求等快捷键，形成完整的快捷键系统。
- **深色/浅色主题切换**：基于 CSS 变量实现双主题，支持一键切换，持久化用户偏好到 localStorage。
- **请求失败自动重试**：集合运行器中的请求失败时支持自动重试，可配置重试次数和间隔，避免偶发网络问题导致整个运行失败。

## 非目标

- 不做快捷键自定义绑定
- 不做主题自定义（仅提供预设的深色/浅色两套）
- 不做单次请求的重试（仅集合运行器场景）
- 不做指数退避等复杂重试策略

## Capabilities

### New Capabilities
- `keyboard-shortcuts`: 完整的键盘快捷键体系，覆盖标签管理、请求保存、面板切换等高频操作
- `theme-switcher`: 深色/浅色主题切换，基于 CSS 变量，偏好持久化
- `request-retry`: 集合运行器中请求失败后的自动重试机制

### Modified Capabilities
- `collection-runner`: 运行器后端增加重试逻辑，支持配置重试次数和间隔
- `runner-ui`: 运行器 UI 展示重试状态和次数

## Impact

- **前端**：`js/app.js`（快捷键注册）、新增 `js/components/theme-switcher.js`、`js/components/runner-panel.js`（重试状态展示）、全局 CSS 文件（CSS 变量 + 主题样式）
- **后端**：`src/services/runner.ts`（重试逻辑）、`src/routes/runner.ts`（重试配置参数）
- **数据库**：无 schema 变更（重试配置通过请求参数传递）
