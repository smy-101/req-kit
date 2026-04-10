## Context

`history` 表当前无索引、无清理机制。每次代理请求完成后 `HistoryService.create()` 写入一条记录，数据无限增长。查询使用 `ORDER BY created_at DESC` 但 `created_at` 无索引，随数据量增大查询变慢。前端已实现分页加载（每页 20 条），但数据库层面缺乏对总数据量的控制。

## Goals / Non-Goals

**Goals:**
- 防止 history 表无限增长，自动保持合理数据量
- 添加 `created_at` 索引提升排序和清理查询性能
- 提供手动清理能力
- 清理操作对正常请求流程零感知

**Non-Goals:**
- 不实现基于时间窗口的清理策略
- 不实现历史归档或导出功能
- 不修改现有分页查询逻辑

## Decisions

### D1: 清理策略 — 最大保留条数

**选择**: 配置化最大保留条数（默认 500），超出时删除最旧记录。

**备选方案**:
- 基于时间窗口（如保留 30 天）→ 不可预测，高频使用者在几天内就可能积累大量数据
- 按数据库文件大小限制 → 实现复杂，需定期检查文件大小

**理由**: 条数上限直观、可预测、实现简单。500 条对单用户 API 测试工具足够，且对 SQLite 查询性能无压力。

### D2: 清理时机 — 写入后触发

**选择**: 在 `HistoryService.create()` 返回前调用 `cleanup()`。

**备选方案**:
- 定时清理（setInterval）→ 增加复杂度，且清理时机不可控
- 每次查询前清理 → 影响查询响应时间

**理由**: 写入后触发最自然——"新记录进来了，看看要不要清理"。开销可控：一次 `COUNT(*)` + 按需 `DELETE`，均在有索引的 `created_at` 上操作。

### D3: 清理实现 — 单条 DELETE 循环 vs 子查询

**选择**: 使用 `DELETE FROM history WHERE id IN (SELECT id FROM history ORDER BY created_at ASC LIMIT ?)` 一次性删除。

**备选方案**:
- 循环逐条删除 → 多次 I/O，性能差

**理由**: 单条 SQL，SQLite 原子执行，性能最优。

### D4: 手动清理 API

**选择**: 新增 `DELETE /api/history/cleanup` 端点，可选 `limit` 参数（默认清理到最大保留条数），返回删除数量。

**备选方案**:
- 复用 `DELETE /api/history`（清空全部）→ 语义不同，清空 vs 清理到阈值

**理由**: 保留现有"清空全部"端点不变，新增"清理"端点提供更细粒度控制。

### D5: 前端清理提示

**选择**: 自动清理时，API 响应中携带 `cleaned` 字段表示本次清理的条数。前端收到后显示 toast 提示。

**理由**: 用户无需感知自动清理，但偶尔知道"系统帮你清理了 N 条旧记录"有助于建立信任感。

### D6: 索引策略

**选择**: 在 `created_at` 上创建索引（`CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at)`）。

**理由**: `ORDER BY created_at DESC` 和清理时的 `ORDER BY created_at ASC` 都依赖此列。单个索引即可覆盖两个方向的排序（SQLite B-tree 双向遍历）。

## Risks / Trade-offs

- **[清理延迟]** 每次写入多一次 COUNT + 可能的 DELETE → 代价极低（毫秒级），可接受
- **[配置灵活性]** 最大条数硬编码为 500 → 足够大多数场景；后续需要时可通过环境变量暴露
- **[索引空间]** 新增索引增加约 10-15% 存储开销 → history 表本身不大，可忽略
