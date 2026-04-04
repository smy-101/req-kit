## Why

当前环境变量编辑体验差：点击 Edit 才能看到变量，保存后编辑器消失需要重新打开，切换环境编辑需要反复操作。环境列表和变量编辑器挤在同一个 Modal 中，空间利用率低。需要一种更高效的左右分栏布局来改善编辑流程。

## What Changes

- 将环境管理 Modal 重构为左右分栏布局：左侧环境列表，右侧变量编辑器
- 点击左侧环境名即可切换，右侧立即显示对应变量
- 切换环境时若有未保存修改，弹窗确认（保存/丢弃/取消）
- 环境重命名在 Modal 内操作
- 删除环境保留确认弹窗，无 undo
- 变量 Key 重复时显示警告提示
- 保存变量后编辑器不重建，保持编辑状态
- 优化后端 N+1 查询（`getAllEnvironments`）

## Capabilities

### New Capabilities

- `env-split-panel-ui`: 环境管理左右分栏 UI 交互，包含环境列表、变量编辑器、未保存修改确认、重复 Key 检测

### Modified Capabilities

- `environments`: 优化 `getAllEnvironments` 查询性能（消除 N+1）

## Impact

- **前端**: `env-manager.js` 重写（Modal 布局和交互逻辑），`style.css` 新增分栏布局样式
- **后端**: `environment.ts` 的 `getAllEnvironments` 查询优化
- **API**: 无新增或变更的端点
- **其他组件**: `variable-preview.js`、`variable-autocomplete.js` 等不受影响

## 非目标

- 不实现单变量 CRUD（仍保持全量替换策略）
- 不支持变量行拖拽排序
- 不统一三个作用域的变量编辑器组件（全局、环境、集合各自独立）
- 不修改全局变量或集合变量的 UI
- 不添加环境导入/导出功能
