## 1. Store 重构

- [x] 1.1 重构 `store.js` 状态结构：将 `state` 从扁平单请求改为 `tabs` 数组 + `activeTabId`，每个 Tab 对象包含完整的 method/url/headers/params/body/bodyType/authType/authConfig/preRequestScript/response/requestId/collectionId 字段
- [x] 1.2 在 store 中添加 Tab 管理方法：`createTab()`、`switchTab(id)`、`closeTab(id)`、`getActiveTab()`、`findTabByRequestId(requestId)`
- [x] 1.3 修改 `store.setState()` 使其仅更新当前活跃 Tab 的状态，并在更新时发出 `tab:update` 事件
- [x] 1.4 Tab 创建时自动生成唯一 ID（递增计数器即可），创建后发出 `tab:created` 事件
- [x] 1.5 Tab 关闭逻辑：关闭后激活相邻 Tab（优先右侧），若为最后一个 Tab 则自动创建新空白 Tab，发出 `tab:closed` 事件

## 2. Tab Bar UI 组件

- [x] 2.1 创建 `src/public/js/components/tab-bar.js`，渲染 Tab 列表（每个 Tab 显示标题 + 关闭按钮）和 "+" 新建按钮
- [x] 2.2 Tab 标题根据活跃 Tab 的 method 和 URL 动态生成：空 URL 显示 "New Request"，有 URL 显示 "METHOD /path"
- [x] 2.3 点击 Tab 切换活跃状态（更新 `activeTabId`，发出 `tab:switch` 事件，Tab 样式区分活跃/非活跃）
- [x] 2.4 点击 x 按钮关闭 Tab
- [x] 2.5 鼠标中键关闭 Tab
- [x] 2.6 Tab 超出容器宽度时支持水平滚动

## 3. HTML 结构

- [x] 3.1 在 `index.html` 的 `#main-content` 上方添加 Tab Bar 容器 `<div id="tab-bar"></div>`
- [x] 3.2 在 script 加载顺序中插入 `tab-bar.js`（在 store.js 之后，其他组件之前）

## 4. 组件适配

- [x] 4.1 修改 `url-bar.js`：从 `store.state.xxx` 改为 `store.getActiveTab().xxx`，监听 `tab:switch` 事件恢复 method 和 URL
- [x] 4.2 修改 `tab-panel.js`：监听 `tab:switch` 事件恢复活跃 Tab 状态
- [x] 4.3 修改 `headers-editor.js`：读写数据改为 `store.getActiveTab().headers`，Tab 切换时重新渲染行
- [x] 4.4 修改 `body-editor.js`：读写数据改为 `store.getActiveTab().body/bodyType`，Tab 切换时恢复内容
- [x] 4.5 修改 `auth-panel.js`：读写数据改为 `store.getActiveTab().authType/authConfig`，Tab 切换时恢复状态
- [x] 4.6 修改 `script-editor.js`：读写数据改为 `store.getActiveTab().preRequestScript`，Tab 切换时恢复内容
- [x] 4.7 修改 `response-viewer.js`：监听 `tab:switch` 恢复该 Tab 的响应数据（status/time/size/body/headers），若 Tab 无响应则显示空状态

## 5. Sidebar 集成

- [x] 5.1 修改 `sidebar.js` 的 `loadRequest` 逻辑：先通过 `store.findTabByRequestId(req.id)` 检查该请求是否已打开
- [x] 5.2 若已有对应 Tab 则 `switchTab` 切换过去，若无则 `createTab` 创建新 Tab 并加载请求配置
- [x] 5.3 每个新建的 Tab 通过 `requestId` 和 `collectionId` 字段关联到已保存请求，用于后续 save 更新

## 6. 快捷键

- [x] 6.1 修改 `app.js`：添加 Ctrl+W / Cmd+W 快捷键关闭当前活跃 Tab
- [x] 6.2 添加 Ctrl+T 快捷键创建新空白 Tab

## 7. CSS 样式

- [x] 7.1 在 `style.css` 中添加 Tab Bar 样式：固定高度、水平布局、活跃/非活跃/悬停状态、关闭按钮、"+" 按钮
- [x] 7.2 Tab 标题文字溢出时显示省略号，设置 max-width
- [x] 7.3 Tab Bar 整体风格与 "Midnight Forge" 主题一致
