## 1. 数据库索引

- [x] 1.1 在 `schema.sql` 中添加 `CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at)`

## 2. 后端 Service 层

- [x] 2.1 `HistoryService` 新增 `MAX_HISTORY_COUNT` 常量（默认 500）和 `cleanup(maxCount?: number): number` 方法
- [x] 2.2 `cleanup()` 实现：COUNT 当前总数，若超出则 `DELETE FROM history WHERE id IN (SELECT id FROM history ORDER BY created_at ASC LIMIT ?)` 删除超出部分，返回删除条数
- [x] 2.3 修改 `create()` 方法：写入后调用 `cleanup()`，返回值从 `number` 改为 `{ id: number; cleaned: number }`

## 3. 后端 Route 层

- [x] 3.1 新增 `DELETE /api/history/cleanup` 端点，支持可选 `limit` 参数，返回 `{ deleted: number }`
- [x] 3.2 修改代理路由中 `HistoryService.create()` 的调用方，适配新的返回值类型 `{ id: number; cleaned: number }`

## 4. 前端

- [x] 4.1 `api.js` 新增 `cleanupHistory(limit?: number)` 方法
- [x] 4.2 `history-panel.js` 在收到代理响应时，若 `cleaned > 0` 则显示 toast 提示"已自动清理 N 条旧记录"

## 5. 测试

- [x] 5.1 单元测试：`cleanup()` 未超限不删除、超限删除正确数量、自定义上限
- [x] 5.2 单元测试：`create()` 返回值包含 `cleaned` 字段
- [x] 5.3 集成测试：`DELETE /api/history/cleanup` 端点——默认上限、自定义上限、无需清理
- [x] 5.4 单元测试：schema 迁移后索引存在
