## Context

当前环境变量管理使用单一 Modal，环境列表和变量编辑器垂直排列。编辑流程：点 Edit → 编辑 → Save → Modal 重建 → 编辑器消失。后端 `getAllEnvironments` 存在 N+1 查询问题。

前端技术栈为纯 HTML + Vanilla JS，无框架，使用事件驱动 Store 管理状态。所有 Modal 共用 `#modal-overlay` + `#modal` 容器。

## Goals / Non-Goals

**Goals:**

- 将环境管理 Modal 改为左右分栏布局，左侧环境列表，右侧变量编辑器
- 点击左侧环境名立即切换，右侧即时显示变量
- 保存变量后不重建 Modal，保持编辑状态连续性
- 切换环境时检测未保存修改，弹窗确认
- 变量 Key 重复时显示警告
- 优化后端 `getAllEnvironments` 消除 N+1 查询

**Non-Goals:**

- 不改变 API 端点设计（仍使用全量替换策略 `PUT .../variables`）
- 不统一三个作用域的变量编辑器
- 不支持变量行拖拽排序
- 不修改全局变量或集合变量的 UI

## Decisions

### 1. 分栏布局实现方式

**决定**：使用 CSS Flexbox 实现左右分栏，Modal 容器内分为 `.env-panel-left` 和 `.env-panel-right`。

**理由**：项目无 CSS 框架，现有 CSS 使用 Flexbox 布局（如 `.kv-row`），保持一致性。不需要 Grid，因为只有两列且不需要复杂对齐。

**替代方案**：
- CSS Grid：可以但过度设计，两列布局 Flexbox 足够
- 两阶段 Modal（先选环境，再打开编辑 Modal）：交互层级更深，不符合目标

### 2. 未保存修改检测策略

**决定**：在 `env-manager.js` 中维护一个 `dirty` 标志。变量 key/value/enabled 的 `input`/`change` 事件设置 `dirty = true`。保存成功后重置为 `false`。切换环境前检查 `dirty`。

**理由**：最简单可靠的方式。不需要深比较对象，只需一个布尔值。

### 3. 确认弹窗交互

**决定**：复用现有 `Dialogs` 组件，提供三个选项：保存、丢弃、取消。

**理由**：与项目现有删除确认弹窗风格一致。三选项覆盖所有合理用户意图。

### 4. N+1 查询优化

**决定**：将 `getAllEnvironments` 改为先查所有环境，再一次性查所有变量，在 JS 层按 `environment_id` 分组。

```sql
SELECT * FROM environments ORDER BY id;
SELECT * FROM env_variables ORDER BY environment_id;
```

**理由**：两次查询而非 N+1 次。避免 JOIN 是因为需要嵌套结构（环境对象包含变量数组），JOIN 需要在 JS 层展平，不如两次查询直观。

**替代方案**：
- SQL JOIN：一次查询但需要 JS 层去重合并，代码可读性差
- 保持 N+1：环境数量通常不多（<20），性能影响有限，但既然要重构就一并优化

### 5. 重复 Key 检测

**决定**：在前端渲染时检测。每次 `renderVars()` 时扫描当前变量数组，对重复的 Key 行添加警告样式。后端不改动。

**理由**：这是 UX 问题而非数据完整性问题。后端全量替换策略下重复 Key 在解析时取第一个匹配，前端提示即可。

## Risks / Trade-offs

- **[Modal 宽度增加]** 分栏布局需要更宽的 Modal → 设置 `min-width: 600px`，确保两侧内容可读
- **[dirty 检测有盲区]** 用户输入后又删回原值，dirty 仍为 true → 可接受，宁误报不漏报
- **[样式兼容]** 现有 `.env-item` 等样式需要适配左侧面板 → 重写相关 CSS，不影响其他组件
