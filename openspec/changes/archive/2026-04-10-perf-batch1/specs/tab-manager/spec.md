## MODIFIED Requirements

### Requirement: Tab 创建
系统 SHALL 在首次加载时自动创建一个空白 Tab。用户 SHALL 能通过点击 "+" 按钮创建新的空白 Tab。每个新 Tab SHALL 获得唯一 ID，初始状态为 GET 方法、空 URL、空 headers/params/body、无 auth、无 script、无 response。

store SHALL 通过 ES Module `export` 导出，消费方通过 `import { store } from '../store.js'` 获取，而非全局变量访问。

store SHALL 仅发射有订阅者的事件。已确认无订阅者的事件（如 `tab:update`）SHALL 被移除，避免无效的事件分发开销。

#### Scenario: 首次加载自动创建 Tab
- **WHEN** 页面加载完成，app.js 通过 import 触发 store.js 执行
- **THEN** store 自动创建一个空白 Tab 并将其设为活跃 Tab

#### Scenario: 点击加号创建新 Tab
- **WHEN** 用户点击 Tab Bar 上的 "+" 按钮
- **THEN** 系统创建一个新的空白 Tab 并自动切换到该 Tab

### Requirement: Tab 切换
系统 SHALL 允许用户通过点击 Tab 头部切换活跃 Tab。切换 Tab 时 SHALL 立即恢复该 Tab 的全部状态（method、url、headers、params、body、auth、script、response）。切换 Tab SHALL 不丢失任何 Tab 的未保存编辑内容。

#### Scenario: 点击切换 Tab
- **WHEN** 用户点击一个非活跃的 Tab
- **THEN** 当前 Tab 的编辑状态被保留，目标 Tab 的状态被恢复到所有组件中，目标 Tab 变为活跃状态

#### Scenario: 切换后恢复编辑内容
- **WHEN** 用户在 Tab A 编辑了 URL 和 body，切换到 Tab B，再切换回 Tab A
- **THEN** Tab A 的 URL 和 body 内容与离开时完全一致

## ADDED Requirements

### Requirement: setState 合并调用
当组件需要在短时间内更新多个 tab 字段时（如请求完成后同时设置 runtimeVars、scriptTests、response），SHALL 将多次 `setState` 调用合并为一次，减少事件发射次数。

#### Scenario: 请求完成后单次 setState
- **WHEN** 代理请求完成，需要同时更新 runtimeVars、scriptTests 和 response
- **THEN** 使用单次 `setState` 调用设置所有字段，仅触发一轮事件链（change + tab:title-change）

#### Scenario: body type 切换单次 setState
- **WHEN** 用户切换 body type 为 multipart 且需要重置 multipartParts
- **THEN** 使用单次 `setState` 调用同时设置 bodyType 和 multipartParts
