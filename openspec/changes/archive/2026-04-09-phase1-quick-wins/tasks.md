## 1. 键盘快捷键

- [x] 1.1 在 `app.js` 中添加 Ctrl+S / Cmd+S 保存快捷键（调用 sidebar 的保存逻辑，`e.preventDefault()` 拦截浏览器默认行为）
- [x] 1.2 在 `app.js` 中添加 Ctrl+Tab / Ctrl+Shift+Tab 标签切换快捷键（跳过 input/textarea 焦点场景）
- [x] 1.3 在 `app.js` 中添加 Ctrl+Shift+N 新建请求快捷键（触发集合选择器）
- [x] 1.4 在 store 中添加 `switchToNextTab()` 和 `switchToPrevTab()` 方法，支持循环切换

## 2. 深色/浅色主题切换

- [x] 2.1 在 `style.css` 中定义 `[data-theme="light"]` 选择器，覆盖所有 CSS 变量为浅色值
- [x] 2.2 检查并修复硬编码颜色（如有），确保所有组件通过 CSS 变量控制颜色
- [x] 2.3 创建 `js/components/theme-switcher.js` 组件：切换按钮 UI + `data-theme` 属性切换 + `localStorage` 持久化
- [x] 2.4 在 `index.html` 的 `<head>` 中添加内联脚本，在页面渲染前读取 localStorage 并设置 `data-theme`（避免闪烁）
- [x] 2.5 在 `app.js` 中导入 theme-switcher 组件

## 3. 请求失败重试 — 后端

- [x] 3.1 修改 `RunnerService.run()` 方法签名，接受 `retryCount` 和 `retryDelayMs` 参数（默认 0 和 1000）
- [x] 3.2 在请求执行循环中实现重试逻辑：仅对网络错误、超时、HTTP 5xx 重试，等待 `retryDelayMs` 后重试，推送 `request:retry` 回调
- [x] 3.3 修改 `RunnerCallbacks` 接口，添加 `onRequestRetry` 回调（包含 attempt 和 maxRetries）
- [x] 3.4 在 `request:complete` 回调数据中添加 `retryCount` 字段
- [x] 3.5 修改 `src/routes/runner.ts`，从请求 body 中解析 `retry_count` 和 `retry_delay_ms` 并传递给 RunnerService，添加 `request:retry` SSE 事件推送

## 4. 请求失败重试 — 前端

- [x] 4.1 修改 `runner-panel.js`，添加重试配置 UI（重试次数 0-5、重试间隔 500-10000ms）
- [x] 4.2 修改 `runner-panel.js`，将重试配置参数传入 API 请求
- [x] 4.3 修改 `runner-panel.js`，处理 `request:retry` SSE 事件（显示 🔄 图标和重试次数）
- [x] 4.4 修改 `runner-panel.js`，在结果列表中显示重试标记（↻N）

## 5. 测试

- [x] 5.1 为键盘快捷键编写测试（保存、标签切换、新建请求）
- [x] 5.2 为请求重试逻辑编写单元测试（重试触发条件、重试次数、重试间隔、4xx 不重试）
- [x] 5.3 为主题切换编写测试（localStorage 持久化、data-theme 切换）
