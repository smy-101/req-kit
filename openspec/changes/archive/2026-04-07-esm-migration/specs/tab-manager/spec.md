## MODIFIED Requirements

### Requirement: Tab 创建
系统 SHALL 在首次加载时自动创建一个空白 Tab。用户 SHALL 能通过点击 "+" 按钮创建新的空白 Tab。每个新 Tab SHALL 获得唯一 ID，初始状态为 GET 方法、空 URL、空 headers/params/body、无 auth、无 script、无 response。

store SHALL 通过 ES Module `export` 导出，消费方通过 `import { store } from '../store.js'` 获取，而非全局变量访问。

#### Scenario: 首次加载自动创建 Tab
- **WHEN** 页面加载完成，app.js 通过 import 触发 store.js 执行
- **THEN** store 自动创建一个空白 Tab 并将其设为活跃 Tab

#### Scenario: 点击加号创建新 Tab
- **WHEN** 用户点击 Tab Bar 上的 "+" 按钮
- **THEN** 系统创建一个新的空白 Tab 并自动切换到该 Tab
