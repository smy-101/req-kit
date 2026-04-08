## 1. 后端：Proxy 层扩展

- [x] 1.1 `ProxyRequest` 接口新增 `timeout?: number` 和 `follow_redirects?: boolean` 字段
- [x] 1.2 `ProxyService.sendRequest` 使用传入的 timeout 替代硬编码 30000；`follow_redirects: false` 时 fetch 使用 `redirect: 'manual'`
- [x] 1.3 `ProxyService.sendRequestStream` 同步支持 timeout 和 redirect 参数
- [x] 1.4 `routes/proxy.ts` 透传 `body.timeout` 和 `body.follow_redirects` 到 ProxyRequest

## 2. 后端：复制请求 API

- [x] 2.1 `CollectionService` 新增 `duplicateRequest(id)` 方法：读取原请求 → 创建副本（name + " (副本)"）
- [x] 2.2 `routes/collections.ts` 新增 `POST /api/collections/requests/:id/duplicate` 路由
- [x] 2.3 编写单元测试验证复制请求功能

## 3. 前端：Tab 状态扩展

- [x] 3.1 `store.js` 的 tab 默认状态新增 `dirty: false` 和 `options: { timeout: 30000, followRedirects: true }`
- [x] 3.2 新建 tab 不追踪 dirty；从已保存请求打开时 `savedRequestId` 标记为非空
- [x] 3.3 在 url-bar.js、headers-editor.js、body-editor.js、auth-panel.js、script-editor.js 等组件的 setState 处，增加 dirty 标记逻辑（仅当 tab 有 savedRequestId 时）

## 4. 前端：请求取消

- [x] 4.1 `api.js` 维护模块级 `AbortController`（`_currentController`），发送时创建新实例自动取消上一个未完成请求，`signal` 传入 `fetch`
- [x] 4.2 `url-bar.js` Cancel 按钮调用 `api.abortCurrent()` 中止请求，请求期间 Send 按钮变为 Cancel
- [x] 4.3 Send 按钮请求中显示 Cancel（SVG 图标 + 文字），点击调用 `controller.abort()`
- [x] 4.4 请求取消时响应区域显示"请求已取消"提示，按钮恢复 Send 状态

## 5. 前端：复制请求

- [x] 5.1 `sidebar.js` 已保存请求的操作菜单新增"复制"选项
- [x] 5.2 点击后调用 `POST /api/collections/requests/:id/duplicate`，刷新 sidebar

## 6. 前端：响应搜索

- [x] 6.1 `response-viewer.js` 响应区域上方增加搜索栏（默认隐藏，Ctrl+F 或点击图标展开）
- [x] 6.2 搜索栏包含：输入框、匹配计数（N/N）、上/下箭头、关闭按钮
- [x] 6.3 小响应模式：遍历 DOM 文本节点，用 `<mark>` 包裹匹配文本
- [x] 6.4 VirtualScroller 模式：render 方法中根据 searchTerm 对行内容做高亮匹配，上下箭头滚动定位

## 7. 前端：响应格式多样化

- [x] 7.1 响应 body 上方增加格式切换 tab（Pretty | Raw | Preview）
- [x] 7.2 XML pretty print：正则缩进格式化 + 语法高亮（标签、属性、值）
- [x] 7.3 HTML Preview：`<iframe sandbox="">` srcdoc 渲染，禁止脚本执行
- [x] 7.4 Image 预览：Content-Type 检测 image/* → `<img>` 展示 + 尺寸信息
- [x] 7.5 根据 Content-Type 自动选择默认 tab，用户可手动切换
- [x] 7.6 Raw 模式：纯文本展示，无格式化

## 8. 前端：未保存变更提示

- [x] 8.1 `tab-bar.js` 关闭 tab 前检查 dirty 标记
- [x] 8.2 dirty tab 显示 `●` 标记
- [x] 8.3 关闭 dirty tab 弹出确认模态框（"保存" / "不保存" / "取消"）
- [x] 8.4 保存请求后清除 dirty 标记

## 9. 前端：请求选项 UI

- [x] 9.1 新增 `request-options.js` 组件：可折叠面板（齿轮图标触发）
- [x] 9.2 超时输入（数字，默认 30000，范围 1000–300000）
- [x] 9.3 重定向跟随开关（默认开启）
- [x] 9.4 发送请求时将 options 传入 `api.sendRequest`（timeout + followRedirects）

## 10. 集成测试

- [x] 10.1 测试复制请求 API（创建副本 → 验证字段一致 → 名称含"副本"）
- [x] 10.2 测试自定义超时（设置 1s 超时 → 发送慢请求 → 验证超时错误）
- [x] 10.3 测试重定向控制（关闭跟随 → 请求重定向 URL → 验证返回 301）
