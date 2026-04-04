## Why

req-kit 目前每次只能显示一个请求——切换请求会丢失上一个的状态。这是与 Postman/Insomnia 最基础的体验差距。日常调试 API 时，开发者经常需要在多个请求间快速切换（比如先登录拿 token，再调业务接口）。Tab 系统是这个工具从"能用"到"好用"的关键一步。

## What Changes

- 前端 Store 从单请求状态重构为多 Tab 状态：每个 Tab 独立持有 method/url/headers/params/body/auth/script/response
- 新增 Tab Bar UI 组件，支持创建、切换、关闭 Tab
- 关闭方式：点击 x 按钮、鼠标中键、Ctrl+W
- 从侧边栏点击已保存请求时，在新的 Tab 中打开
- 新增 "+" 按钮快速创建空白 Tab
- 初始启动时自动创建一个空白 Tab
- 关闭最后一个 Tab 时自动创建新的空白 Tab

## Capabilities

### New Capabilities
- `tab-manager`: 多 Tab 状态管理，包括 Tab 创建/切换/关闭/状态隔离

### Modified Capabilities
- `collections`: 点击侧边栏请求时改为在新 Tab 中打开，而非替换当前状态

## Impact

- **前端核心变更**: `store.js` 是影响最大的文件，状态结构从扁平单请求变为 Tab 数组
- **所有前端组件需适配**: url-bar、headers-editor、body-editor、auth-panel、script-editor、response-viewer 等组件需监听 Tab 切换事件并重新渲染
- **后端无影响**: Tab 系统纯粹是前端状态管理，不涉及任何 API 变更
- **index.html**: 新增 Tab Bar DOM 结构

## 非目标

- Tab 拖拽排序（后续版本考虑）
- Tab 持久化（关闭页面后恢复 Tab 状态）
- Tab 分组/颜色标记
- 跨设备 Tab 同步
