# E2E 测试优化设计文档

**日期**: 2026-04-12
**目标**: 结构优化（文件合并、引入 POM、修复不稳定模式）+ 全面覆盖提升
**工作方式**: 分两批进行——第一批结构优化，第二批覆盖提升

---

## 当前状态

- 26 个 spec 文件，~170 测试用例，~4,459 行代码
- 核心流程覆盖良好，但存在文件重叠、选择器散落、不稳定模式等问题
- 覆盖缺口：Body 发送验证、导入边界、Runner 重试、并发请求、错误恢复等

---

## 第一批：结构优化

### 1. 文件合并

合并前 26 个文件 → 合并后约 16 个文件：

| 合并前 | 合并后 | 说明 |
|--------|--------|------|
| `request.spec.ts` + `request-basic.spec.ts` + `headers-params.spec.ts` | `request.spec.ts` | 基本请求 + 方法/重定向/超时/取消 + 请求头/参数 |
| `response-advanced.spec.ts` + `response-extras.spec.ts` + `response-format-switching.spec.ts` + `response-search-nav.spec.ts` | `response.spec.ts` | 响应格式/搜索/状态码/cookies 去重合并 |
| `app.spec.ts` + `edge-cases.spec.ts` | `app.spec.ts` | 主题持久化、侧边栏折叠归入应用基础功能 |
| `management-advanced.spec.ts` 拆分 | → `cookies.spec.ts` + `variables.spec.ts` | Cookie 高级管理归 cookies，变量编辑删除归 variables |
| `environment.spec.ts` + `env-unsaved.spec.ts` | `environment.spec.ts` | 未保存警告是环境管理子功能 |

**不变文件**: `auth.spec.ts`, `body-types.spec.ts`, `collection.spec.ts`, `cookies.spec.ts`, `history.spec.ts`, `import-export.spec.ts`, `keyboard-shortcuts.spec.ts`, `panel-resizer.spec.ts`, `runner.spec.ts`, `save-load.spec.ts`, `scripts.spec.ts`, `tabs.spec.ts`, `variable-autocomplete.spec.ts`, `variable-resolution.spec.ts`, `variables.spec.ts`

### 2. Page Object Model

创建 `tests/e2e/pages/` 目录，包含以下页面对象：

#### RequestPage
封装：URL 输入框、方法选择器、发送按钮、请求选项（超时/重定向开关）、请求体编辑器（JSON/Text/XML/Form/Multipart/Binary/GraphQL）、请求头 KV 编辑器、查询参数 KV 编辑器

#### ResponsePage
封装：响应体/头/Cookies/测试结果标签页切换、格式切换（Pretty/Raw/Preview）、搜索输入/导航（上一个/下一个/清除/计数）、响应状态码显示

#### AuthPage
封装：认证面板展开、类型切换（None/Bearer/Basic/API Key）、各类型输入字段、发送时认证注入验证

#### CollectionPage
封装：集合创建/删除/重命名、请求右键菜单（复制/curl 导入）、集合变量编辑器打开/保存、请求拖拽排序（待覆盖）

#### EnvironmentPage
封装：环境管理弹窗、环境创建/删除/重命名/切换、变量编辑/删除、未保存警告检测

#### VariablePage
封装：全局变量弹窗打开/创建/编辑/删除、变量预览面板、自动补全触发/键盘导航/选择、变量作用域显示

#### HistoryPage
封装：面板展开/折叠、搜索过滤、方法/状态码过滤、分页加载更多、点击加载请求

#### RunnerPage
封装：Runner 面板打开/关闭、运行/停止、结果展开/折叠、重试配置、多请求运行（待覆盖）

#### TabBar
封装：标签创建/切换/关闭、脏检测指示、关闭确认处理、中间键关闭

#### AppPage
封装：页面导航、侧边栏切换、主题切换、键盘快捷键触发、面板拖拽调整

**设计原则**：
- 每个页面对象接收 `Page` 实例
- 保留 `helpers/wait.ts` 作为底层等待工具
- 支持链式调用（返回 `this`）
- 选择器作为私有属性集中管理

### 3. 不稳定模式修复

| 问题 | 出现位置 | 修复策略 |
|------|---------|---------|
| `evaluate(el => el.click())` 绕过 | environment.spec, env-unsaved.spec 等 | 调查前端事件委托问题，用 Playwright `force: true` + 显式等待或修复前端 |
| 条件断言 `if (cookieName) {...}` | management-advanced.spec | 重写为确定性 setup |
| 负面超时 `toHaveText('', {timeout: 3000})` | edge-cases.spec | 改用 `waitForResponse` 或明确状态断言 |
| DOM 直接操作 `el.checked = false` | response-extras.spec | 用 Playwright `setChecked()` 或 `.click()` |
| 响应搜索重复测试 | response-advanced vs response-search-nav | 合并去重 |

### 4. 清理和规范

- 移除合并后的重复测试用例
- 统一 describe/test 命名规范（中文）
- 移除多余的超时覆盖（仅 runner 保留 60s）
- 确保 `helpers/mock.ts` 被所有需要 mock URL 的测试使用

---

## 第二批：覆盖提升

### 新增测试用例

#### Body 类型发送验证（补充 body-types.spec.ts）
- Form URL Encoded: 填写表单字段 → 发送 → 验证 mock 服务器收到的 Content-Type 和 body
- Multipart: 添加字段 → 发送 → 验证 mock 收到 multipart 内容
- Binary: 上传文件 → 发送 → 验证 mock 收到二进制数据
- GraphQL Variables: 填写 query + variables → 发送 → 验证请求体包含 variables 字段
- GraphQL Operation Name: 填写 operationName → 验证请求体

#### 导入边界情况（补充 import-export.spec.ts）
- 导入无效 JSON → 验证错误提示
- 导入空内容 → 验证错误提示
- 导入畸形 curl（缺少 URL）→ 验证错误提示
- 导出 → 验证剪贴板 JSON 包含正确的集合/请求结构

#### Runner 完善（补充 runner.spec.ts）
- 多请求集合运行 → 验证每个请求结果
- 触发重试（设置重试次数 + mock 返回失败）→ 验证重试执行
- 停止运行 → 验证已完成请求保留结果，未执行的跳过

#### 高级交互和边界
- 拖拽排序：拖拽请求到新位置 → 验证顺序变化
- 并发请求：多标签页同时发送 → 验证各自独立响应
- 错误恢复：mock 服务器超时/连接重置 → 验证错误提示和 UI 状态恢复
- 环境删除级联：删除环境 → 验证关联变量清除，使用该环境变量的请求显示未替换文本
- 禁用请求头验证：禁用某头 → 发送 → 验证 mock 未收到该头
- Cookie 标签页渲染：mock 返回 Set-Cookie → 验证 Cookie 标签页显示域名/值
- 变量循环引用：定义 `a = "prefix_{{b}}"`, `b = "suffix"` → 验证不无限循环

---

## 不在范围内

- 无障碍性测试（键盘导航、ARIA、屏幕阅读器）
- 性能/负载测试（大响应体）
- 后端 API 直接验证（由 integration tests 覆盖）
- 输入验证/XSS/SQL 注入测试
