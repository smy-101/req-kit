## Context

req-kit 是一个功能完整的 API 测试工具，当前处于可正常使用状态。代码审查发现 5 处明显粗糙点：生产日志噪音、CSS 重复和硬编码、类型不一致、死代码。这些是纯代码质量问题，不涉及架构或功能变更。

## Goals / Non-Goals

**Goals:**
- 消除生产环境中的调试日志
- 保持 CSS 代码唯一性和 design system 一致性
- 消除前端的类型不一致隐患
- 清理未被引用的死代码

**Non-Goals:**
- 不引入新功能或重构
- 不修改 API 接口
- 不修改数据库 schema
- 不改变任何用户可见行为

## Decisions

### 1. 移除 proxy console.log 而非替换为条件日志

**选择**: 直接删除 `console.log('[proxy] resolved url: ...')`
**备选**: 用 `if (process.env.DEBUG)` 包裹
**理由**: Bun/Hono 生态中通常由上层中间件处理请求日志。这个 console.log 是临时调试遗留，项目没有 debug 日志体系，引入条件日志反而增加复杂度。

### 2. 硬编码颜色替换为 design tokens

**选择**: `#22c55e` → `var(--green)`, `#ef4444` → `var(--red)`
**理由**: 项目已有完善的 CSS 变量体系（`--green`, `--red` 等），直接复用即可。

### 3. enabled 字段统一为布尔值

**选择**: 前端统一发送 `true`/`false`，后端 SQLite 会自动处理布尔与数字的映射。
**理由**: JS 端保持布尔语义更符合直觉。后端 `bun:sqlite` 的 `INSERT` 本身就接受布尔值存为 0/1。

### 4. 删除 TemplateHighlighter 而非标注 TODO

**选择**: 直接删除 `template.js` 中整个 `TemplateHighlighter` 对象
**备选**: 加 `// TODO: wire this up` 注释
**理由**: 如果未来需要变量高亮功能，重新实现比维护未验证的死代码更可靠。Git 历史中可随时找回。

## Risks / Trade-offs

- **TemplateHighlighter 被删除**: 如果有其他代码动态引用它，会导致运行时错误 → 已通过全局搜索确认无任何引用，风险为零
- **enabled 布尔值兼容性**: 后端接收布尔值 → `bun:sqlite` 将 `true`/`false` 自动转为 `1`/`0` 存储在 INTEGER 列中，与现有数据完全兼容
