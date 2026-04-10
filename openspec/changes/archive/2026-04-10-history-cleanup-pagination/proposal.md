## Why

历史记录表会无限增长，没有任何清理机制。随着使用时间增加，数据库体积膨胀、查询变慢、内存占用上升。同时缺少数据库索引，分页查询在数据量增大后会明显变慢。

## What Changes

- 为 `history` 表添加 `created_at` 索引，提升排序和清理查询性能
- 实现自动清理策略：可配置最大保留条数，超出时自动删除最旧的记录
- 清理在每次写入新记录后触发，保持 O(1) 的内存和时间开销
- 提供手动清理的 API 端点和前端按钮
- 前端历史面板增加"已清理 N 条旧记录"的提示

## 非目标

- 不做基于时间窗口（如"保留 30 天"）的清理——条数上限更直观可控
- 不做历史记录归档/导出功能
- 不改变现有的分页查询逻辑和前端"加载更多"交互
- 不做前端 UI 测试（scope 单独控制）

## Capabilities

### New Capabilities

- `history-cleanup`: 历史记录自动清理——最大保留条数配置、写入后触发清理、手动清理 API

### Modified Capabilities

- `history`: 为 `created_at` 添加索引，service 层增加清理调用

## Impact

- **数据库**: `schema.sql` 新增 `CREATE INDEX` 语句（`IF NOT EXISTS`，无破坏性）
- **后端**: `HistoryService` 新增 `cleanup()` 方法，`create()` 后调用；`HistoryRoute` 新增手动清理端点
- **前端**: `history-panel.js` 增加清理提示 toast；`api.js` 新增手动清理 API 调用
- **测试**: 单元测试和集成测试覆盖清理逻辑
- **无 API 破坏性变更**: 新增端点，不修改现有端点签名
