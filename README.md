# req-kit

自托管 API 测试工具，类似 Postman 核心功能。纯 HTML + Vanilla JS 前端，Hono 后端代理，SQLite 持久化，零外部前端依赖。

## 功能

- **多 Tab 请求** — 同时打开多个请求，每个 Tab 独立持有完整的请求配置和响应数据，切换时不丢失状态
- **代理转发** — 通过服务端代理绕过 CORS，支持 GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS
- **流式传输** — SSE 流式代理，实时接收大响应体
- **请求历史** — 自动记录所有请求，分页浏览、查看详情、删除
- **集合管理** — 树形文件夹结构，保存/加载/组织请求
- **四级变量系统** — 全局 → 环境 → 集合 → 运行时，`{{variable}}` 模板自动替换，带自动补全和预览面板
- **认证注入** — Bearer Token / Basic Auth / API Key 自动注入
- **预请求脚本** — 在 VM 沙箱中执行 JavaScript，支持 setHeader/setBody/setParam 及变量读写
- **导入导出** — curl 命令和 Postman Collection v2.1 格式

## 技术栈

- **运行时**: Bun
- **后端**: Hono
- **数据库**: bun:sqlite
- **前端**: 纯 HTML + Vanilla JS + CSS

## 快速开始

```sh
bun install
bun run dev
```

打开 http://localhost:3000

## 变量系统

req-kit 提供四级作用域变量，在请求发送前自动替换 URL、Headers、Query Params 和 Body 中的 `{{变量名}}` 占位符。

### 四级作用域与优先级

按优先级从低到高：

| 作用域 | 说明 | 作用范围 | 管理位置 |
|--------|------|----------|----------|
| **Global**（全局） | 应用级变量，所有请求共享 | 始终生效 | URL 栏眼睛图标 → 管理全局变量 |
| **Environment**（环境） | 按环境分组，切换环境时变量随之切换 | 当前激活的环境 | 侧边栏环境管理 |
| **Collection**（集合） | 绑定到根集合，该集合下所有请求生效 | 当前请求所属的根集合 | 集合右键菜单 → 编辑集合变量 |
| **Runtime**（运行时） | 预请求脚本通过 `variables.set()` 动态设置 | 仅当前请求 | 预请求脚本中设置 |

**覆盖规则**：当多个作用域定义了同名变量时，高优先级作用域的值覆盖低优先级的。例如在集合变量中定义 `host=http://localhost:3000`，在环境变量中定义 `host=https://api.example.com`，实际使用环境变量的值。

### 变量引用语法

在 URL、Headers、Query Params、Body 中使用双花括号包裹变量名：

```
GET {{host}}/api/users/{{userId}}
Authorization: Bearer {{token}}
Content-Type: {{contentType}}
```

变量名仅支持字母、数字和下划线（`\w+`）。未匹配到任何作用域的变量会保留原始 `{{xxx}}` 文本不替换。

### 全局变量

全局变量不依赖任何环境或集合，对所有请求始终生效（除非被更高优先级覆盖）。

**管理方式**：
- 点击 URL 栏右侧眼睛图标 → 底部「管理全局变量」按钮
- 支持添加、编辑、启用/禁用变量
- 禁用的变量不参与替换

### 环境变量

环境变量按环境分组管理，适合区分开发/测试/生产等不同环境。

**使用方式**：
1. 在侧边栏创建环境并添加变量
2. 从环境选择下拉框切换当前环境
3. 切换环境后，引用该环境变量的请求会自动使用新的值

**示例**：创建「开发」和「生产」两个环境，各自定义 `baseUrl`、`token` 等变量，一键切换即可切换请求目标。

### 集合变量

集合变量绑定到**根集合**（即集合树中最顶层的节点），该集合及其所有子文件夹中的请求共享这些变量。

**管理方式**：
- 右键点击集合 → 编辑集合变量
- 支持添加、编辑、启用/禁用变量

**注意**：即使请求保存在子文件夹中，集合变量也是从根集合读取的。

### 运行时变量

运行时变量由预请求脚本在执行时动态设置，生命周期仅限当前请求。优先级最高，可以覆盖任何作用域的同名变量。

**在脚本中设置**：

```javascript
// 设置一个变量，可在后续请求中通过 {{token}} 引用
variables.set("token", "动态获取的值");

// 设置时间戳
variables.set("timestamp", new Date().getTime().toString());
```

**在脚本中读取**：

```javascript
// 读取任意作用域的变量（按优先级从高到低查找）
const host = variables.get("host");
```

### 预请求脚本中的变量 API

预请求脚本运行在 VM 沙箱中，提供以下变量相关 API：

| API | 说明 |
|-----|------|
| `variables.get(key)` | 获取变量值，按 Runtime → Collection → Environment → Global 优先级查找 |
| `variables.set(key, value)` | 设置运行时变量（最高优先级），当前请求生效 |
| `environment` | 只读对象，包含当前环境所有变量 |

`environment` 是一个快照，在脚本中修改它不会影响环境变量的持久化值。

### 变量自动补全

在 URL 栏、Headers 编辑器、Body 编辑器中输入 `{{` 后，会自动弹出变量补全列表：

- 列表显示所有作用域的已启用变量
- 每个变量右侧标注来源作用域（Global / Environment / Collection / Runtime）
- 输入 `{{abc` 可以按变量名过滤
- 使用 `↑` `↓` 选择，`Enter` 或 `Tab` 确认，`Esc` 取消
- 同名变量只显示优先级最高的作用域

### 变量预览面板

点击 URL 栏右侧眼睛图标，打开变量预览面板：

- 按 Runtime → Collection → Environment → Global 分组展示所有变量
- 被覆盖的变量会标记「被覆盖」标签，显示为灰色
- 支持搜索过滤变量
- 底部提供「管理全局变量」快捷入口

### 替换流程

发送请求时，变量替换按以下顺序执行：

1. **模板替换** — 解析 URL、Headers、Params、Body 中的 `{{变量}}`，按作用域优先级查找值
2. **脚本执行** — 运行预请求脚本，脚本可通过 `variables.set()` 添加运行时变量
3. **二次替换** — 脚本产生的运行时变量再次替换 URL、Headers、Params、Body
4. **认证注入** — 注入 Bearer / Basic / API Key 认证头
5. **代理转发** — 发送最终请求

### 使用示例

**场景：多环境 API 测试**

1. 创建环境「开发」，添加变量 `baseUrl = http://localhost:3000`、`token = dev-token-123`
2. 创建环境「生产」，添加变量 `baseUrl = https://api.example.com`、`token = prod-token-456`
3. 在请求 URL 中使用 `{{baseUrl}}/api/users`，Header 中使用 `Authorization: Bearer {{token}}`
4. 切换环境即可一键切换目标服务器和认证信息

**场景：动态签名**

```javascript
// 预请求脚本中生成签名
const timestamp = new Date().getTime().toString();
const secret = variables.get("apiSecret");
const sign = computeHMAC(timestamp, secret); // 自定义签名逻辑

variables.set("timestamp", timestamp);
variables.set("signature", sign);
```

然后在 Headers 中引用：
```
X-Timestamp: {{timestamp}}
X-Signature: {{signature}}
```

## 项目结构

```
src/
├── index.ts                  # Hono 应用入口
├── db/
│   ├── schema.sql            # 建表语句
│   └── index.ts              # SQLite 初始化与封装
├── services/
│   ├── proxy.ts              # 流式代理转发
│   ├── history.ts            # 历史记录管理
│   ├── collection.ts         # 集合与文件夹管理
│   ├── environment.ts        # 环境变量与模板替换
│   ├── variable.ts           # 四级变量解析（全局/环境/集合/运行时）
│   ├── auth.ts               # 认证注入
│   ├── script.ts             # VM 沙箱脚本执行
│   └── import-export.ts      # 导入导出转换
├── routes/
│   ├── proxy.ts              # POST /api/proxy
│   ├── history.ts            # /api/history CRUD
│   ├── collections.ts        # /api/collections CRUD + 集合变量
│   ├── environments.ts       # /api/environments CRUD
│   ├── global-variables.ts   # /api/global-variables CRUD
│   └── import-export.ts      # /api/import, /api/export
└── public/                   # 静态前端文件
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js            # 入口
        ├── store.js          # 事件驱动状态管理（多 Tab）
        ├── api.js            # 后端 API 封装
        ├── components/       # UI 组件
        │   ├── tab-bar.js    # 多 Tab 栏
        │   ├── sidebar.js    # 侧边栏集合树
        │   ├── variable-autocomplete.js  # 变量自动补全
        │   ├── variable-preview.js      # 变量预览面板
        │   ├── collection-var-editor.js # 集合变量编辑器
        │   ├── global-var-modal.js      # 全局变量管理弹窗
        │   └── ...           # 其他组件
        └── utils/            # 工具函数
```

## API 路由

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/proxy` | 代理转发（支持 SSE 流式） |
| GET | `/api/history` | 分页获取历史 |
| GET | `/api/history/:id` | 获取历史详情 |
| DELETE | `/api/history/:id` | 删除单条历史 |
| DELETE | `/api/history` | 清空历史 |
| GET | `/api/collections` | 获取集合树 |
| POST | `/api/collections` | 创建集合/文件夹 |
| PUT | `/api/collections/:id` | 更新集合 |
| DELETE | `/api/collections/:id` | 删除集合（级联） |
| PATCH | `/api/collections/:id/move` | 移动集合 |
| POST | `/api/collections/:id/requests` | 添加请求 |
| PUT | `/api/collections/:id/requests/:rid` | 更新请求 |
| DELETE | `/api/collections/:id/requests/:rid` | 删除请求 |
| GET | `/api/collections/:id/variables` | 获取集合变量 |
| PUT | `/api/collections/:id/variables` | 批量替换集合变量 |
| GET | `/api/global-variables` | 获取全局变量 |
| PUT | `/api/global-variables` | 批量替换全局变量 |
| GET | `/api/environments` | 获取所有环境 |
| POST | `/api/environments` | 创建环境 |
| PUT | `/api/environments/:id` | 更新环境 |
| DELETE | `/api/environments/:id` | 删除环境（级联） |
| PUT | `/api/environments/:id/variables` | 批量更新变量 |
| POST | `/api/import` | 导入 curl / Postman Collection |
| GET | `/api/export/collections/:id` | 导出为 Postman Collection v2.1 |
| GET | `/api/export/requests/:id/curl` | 导出为 curl 命令 |
