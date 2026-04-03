## 1. 项目基础设施

- [x] 1.1 创建 `src/db/schema.sql`，包含所有建表语句（environments, env_variables, collections, saved_requests, history）
- [x] 1.2 创建 `src/db/index.ts`，实现 Database 类（初始化连接、执行 schema 迁移、`query`/`run` 方法），编写红绿测试验证建表和基本 CRUD
- [x] 1.3 配置 Hono 静态文件服务（serveStatic 中间件），创建 `src/public/` 目录结构（css/、js/components/、js/utils/）

## 2. 代理服务（核心）

- [x] 2.1 创建 `src/services/proxy.ts`，实现 ProxyService：接收请求参数、发起 fetch 到目标、返回响应。编写红绿测试验证 GET/POST/PUT/DELETE 等方法转发
- [x] 2.2 编写红绿测试验证代理错误处理（目标不可达返回 502、缺少 url 返回 400、超时返回 504）
- [x] 2.3 实现代理响应大小限制（50MB 截断）和超时（30 秒），编写红绿测试验证
- [x] 2.4 实现流式代理（SSE）：headers → chunk → done 事件序列。编写红绿测试验证 SSE 事件格式和顺序
- [x] 2.5 创建 `src/routes/proxy.ts`，注册 `POST /api/proxy` 路由，集成 ProxyService。编写路由级集成测试

## 3. 请求历史

- [x] 3.1 创建 `src/services/history.ts`，实现 HistoryService：create、list（分页）、getById、deleteById、deleteAll。编写红绿测试验证每个方法
- [x] 3.2 编写红绿测试验证分页逻辑（page/limit 参数、总数计算、空列表）
- [x] 3.3 创建 `src/routes/history.ts`，注册 `GET /api/history`、`GET /api/history/:id`、`DELETE /api/history/:id`、`DELETE /api/history` 路由。编写路由级集成测试
- [x] 3.4 在 ProxyService 中集成历史记录：代理请求完成后自动调用 HistoryService.create

## 4. 集合管理

- [x] 4.1 创建 `src/services/collection.ts`，实现 CollectionService：创建集合/文件夹、更新、删除（级联）、移动。编写红绿测试验证 CRUD 和级联删除
- [x] 4.2 实现保存请求的 CRUD：addRequest、updateRequest、deleteRequest。编写红绿测试验证
- [x] 4.3 实现获取集合树（递归查询 parent_id 构建树形结构）。编写红绿测试验证树形输出
- [x] 4.4 创建 `src/routes/collections.ts`，注册所有集合路由。编写路由级集成测试验证请求参数校验和响应格式

## 5. 环境变量与模板替换

- [x] 5.1 创建 `src/services/environment.ts`，实现 EnvService：CRUD 环境和变量、批量替换变量。编写红绿测试验证 CRUD 和级联删除
- [x] 5.2 实现 `{{variable}}` 模板替换函数，支持在 URL、Headers、Params、Body 中替换。编写红绿测试验证替换、未匹配保持原样、仅替换 enabled 变量
- [x] 5.3 创建 `src/routes/environments.ts`，注册所有环境变量路由。编写路由级集成测试
- [x] 5.4 在代理流程中集成模板替换：代理请求前根据当前激活环境替换变量

## 6. 认证注入

- [x] 6.1 实现认证注入逻辑：Bearer Token、Basic Auth、API Key（header/query）、none。编写红绿测试验证每种认证类型的头/参数注入
- [x] 6.2 在代理流程中集成认证注入：根据保存请求的 auth_type 和 auth_config 自动注入

## 7. 预请求脚本

- [x] 7.1 创建 `src/services/script.ts`，实现 ScriptService：Bun VM 沙箱初始化、受限上下文构建、脚本执行。编写红绿测试验证 setHeader/setBody/setParam 操作
- [x] 7.2 编写红绿测试验证沙箱安全：禁止 require/import/process/eval/Function，访问禁止 API 时返回错误
- [x] 7.3 实现脚本超时（5 秒）和日志收集（console.log）。编写红绿测试验证超时终止和日志输出
- [x] 7.4 在代理流程中集成脚本执行：代理请求前执行预请求脚本，将脚本日志附加到代理响应

## 8. 导入导出

- [x] 8.1 创建 `src/services/import-export.ts`，实现 curl 命令解析（提取 method、url、headers、body）。编写红绿测试验证各种 curl 格式
- [x] 8.2 实现 Postman Collection v2.1 导入（解析 item 结构、创建集合和请求）。编写红绿测试验证导入
- [x] 8.3 实现集合导出为 Postman Collection v2.1 格式。编写红绿测试验证输出格式
- [x] 8.4 实现请求导出为 curl 命令。编写红绿测试验证 GET/POST curl 输出
- [x] 8.5 创建 `src/routes/import-export.ts`，注册所有导入导出路由。编写路由级集成测试

## 9. 前端 — 基础 UI 框架

- [x] 9.1 创建 `src/public/index.html` 主页面骨架：侧边栏 + 主编辑区布局
- [x] 9.2 创建 `src/public/css/style.css` 基础样式：布局、配色、组件样式
- [x] 9.3 实现 `src/public/js/store.js`：事件驱动状态管理器（on/emit/setState）
- [x] 9.4 实现 `src/public/js/api.js`：后端 API 调用封装（sendRequest、getHistory、getCollections 等）

## 10. 前端 — 核心组件

- [x] 10.1 实现 `src/public/js/components/url-bar.js`：URL 输入框 + Method 下拉选择 + Send 按钮
- [x] 10.2 实现 `src/public/js/components/tab-panel.js`：Headers / Params / Body / Auth 选项卡切换
- [x] 10.3 实现 `src/public/js/components/headers-editor.js`：Key-Value 对编辑器（增删改）
- [x] 10.4 实现 `src/public/js/components/body-editor.js`：请求体编辑器（JSON 格式化）
- [x] 10.5 实现 `src/public/js/components/response-viewer.js`：响应展示（状态码、响应头、格式化响应体、耗时、大小）

## 11. 前端 — 侧边栏与集合

- [x] 11.1 实现 `src/public/js/components/sidebar.js`：集合树（展开/折叠、嵌套文件夹）
- [x] 11.2 实现保存请求到集合的对话框
- [x] 11.3 实现从集合加载请求到编辑器

## 12. 前端 — 环境与认证

- [x] 12.1 实现 `src/public/js/components/env-manager.js`：环境变量管理面板（增删改环境、编辑变量、切换当前环境）
- [x] 12.2 实现 `src/public/js/components/auth-panel.js`：认证配置面板（Bearer/Basic/API Key/None 切换）

## 13. 前端 — 导入导出与脚本

- [x] 13.1 实现 `src/public/js/components/import-export.js`：导入导出对话框（curl 导入、Postman Collection 导入/导出、curl 导出）
- [x] 13.2 实现 `src/public/js/components/script-editor.js`：预请求脚本编辑器
- [x] 13.3 实现 `src/public/js/utils/json-format.js`：JSON 语法高亮和格式化
- [x] 13.4 实现 `src/public/js/utils/curl-parser.js`：前端 curl 预览/校验
- [x] 13.5 实现 `src/public/js/utils/template.js`：前端模板变量高亮提示

## 14. 应用入口集成

- [x] 14.1 创建 `src/public/js/app.js`：初始化 Store、注册所有组件、绑定事件流
- [x] 14.2 更新 `src/index.ts`：注册所有路由、初始化数据库、启动 Hono 服务
- [x] 14.3 端到端验证：打开浏览器 → 发送请求 → 查看响应 → 保存到集合 → 切换环境 → 导出 curl
