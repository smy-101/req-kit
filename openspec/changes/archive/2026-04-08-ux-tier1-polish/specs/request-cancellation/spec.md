## ADDED Requirements

### Requirement: 发送中请求可取消
系统 SHALL 在请求进行中将 Send 按钮变为 Cancel 按钮。用户点击 Cancel 后，请求 SHALL 被立即中止，响应区域显示"请求已取消"提示。

#### Scenario: 用户取消进行中的请求
- **WHEN** 用户发送请求后、响应返回前点击 Cancel 按钮
- **THEN** 请求被中止，Send 按钮恢复为可点击状态，响应区域显示"请求已取消"

#### Scenario: 请求正常完成不显示 Cancel
- **WHEN** 请求在响应返回后
- **THEN** Send 按钮恢复为 "Send" 状态，Cancel 不可用

#### Scenario: 请求出错后 Cancel 恢复
- **WHEN** 请求因网络错误或超时失败
- **THEN** Send 按钮恢复为 "Send" 状态
