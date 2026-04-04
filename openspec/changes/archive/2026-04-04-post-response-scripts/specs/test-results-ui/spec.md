## ADDED Requirements

### Requirement: 测试结果展示

响应面板 SHALL 新增 "Test Results" tab，当响应中包含 `script_tests` 字段时展示断言结果。

每个断言 SHALL 显示名称和通过/失败状态（绿色对勾 / 红色叉号）。

底部 SHALL 显示汇总统计：`X passed, Y failed`。

当无断言结果时（未编写后置脚本或脚本未设置 tests），该 tab SHALL 显示提示文字"暂无测试结果"。

#### Scenario: 展示通过的断言
- **WHEN** 响应包含 `"script_tests": { "状态码是 200": true, "有用户ID": true }`
- **THEN** Test Results tab 显示两条绿色对勾的断言，底部显示 "2 passed, 0 failed"

#### Scenario: 展示混合通过和失败的断言
- **WHEN** 响应包含 `"script_tests": { "状态码是 200": true, "响应时间<100ms": false }`
- **THEN** Test Results tab 显示一条绿色对勾和一条红色叉号，底部显示 "1 passed, 1 failed"

#### Scenario: 无测试结果时的空状态
- **WHEN** 响应中不包含 `script_tests` 字段
- **THEN** Test Results tab 显示提示文字"暂无测试结果"

#### Scenario: 后置脚本日志展示
- **WHEN** 响应包含 `"post_script_logs": ["Status: 200", "Body length: 1234"]`
- **THEN** Test Results tab 在断言列表下方展示日志输出区域
