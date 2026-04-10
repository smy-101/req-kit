## ADDED Requirements

### Requirement: 历史表索引

系统 SHALL 在 `history` 表的 `created_at` 列上创建索引，以优化按时间排序和清理查询的性能。

#### Scenario: 索引在数据库初始化时创建
- **WHEN** 应用启动并执行 schema 迁移
- **THEN** `history` 表上存在 `idx_history_created_at` 索引

#### Scenario: 索引幂等创建
- **WHEN** 应用重启，schema 再次执行
- **THEN** 使用 `CREATE INDEX IF NOT EXISTS`，不会报错或重复创建
