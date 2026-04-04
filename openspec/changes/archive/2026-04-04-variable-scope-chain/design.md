## Context

req-kit 当前的变量系统是单层扁平结构：`environments` + `env_variables`，模板替换仅通过 `EnvService.replaceTemplateValues(text, environmentId)` 从当前激活环境中查找变量。所有变量操作（CRUD、模板替换）都集中在 `EnvService` 中。

现有代码关键点：
- 模板替换发生在 `routes/proxy.ts` 的请求管道中，目前只传 `environment_id`
- `ScriptService` 沙箱已注入 `environment` 对象，但为只读
- `ImportExportService` 支持 Postman v2.1 集合格式的导入导出
- 前端 `env-manager.js` 管理环境变量的 UI，`store.js` 维护全局状态
- 数据库迁移通过 `db.migrate()` 读取 `schema.sql` 执行 DDL

## Goals / Non-Goals

**Goals:**

- 实现 Postman 标准的四级变量作用域：Global → Environment → Collection → Local (runtime)
- 同名变量高优先级覆盖低优先级（Local > Collection > Environment > Global）
- 集合变量跟随集合导入导出
- 全局变量独立管理，始终生效
- 临时变量（runtime）仅存于前端内存，可通过脚本设置
- 变量预览面板展示当前所有作用域的解析结果
- `{{` 自动补全，按作用域分组显示可用变量

**Non-Goals:**

- 文件夹级变量（Postman 没有）
- 变量版本控制或历史回溯
- Post-response script（后续独立 change）
- 加密变量存储
- 变量跨设备同步

## Decisions

### D1: 变量解析架构 — 扩展 EnvService vs 新建 VariableResolver

**选择：新建 `VariableService`，保留 `EnvService` 不变**

`EnvService` 保持现有的环境变量 CRUD 职责不变。新建 `VariableService` 负责全局变量、集合变量的 CRUD，以及统一的四级变量解析。

```
┌─────────────────────────────────────────────────┐
│                  VariableService                 │
│                                                 │
│  resolveVariables(text, context)                 │
│    context: {                                    │
│      runtimeVars: Record<string, string>         │
│      collectionId?: number                       │
│      environmentId?: number                      │
│    }                                             │
│                                                  │
│  查找顺序:                                       │
│    1. runtimeVars (前端传入的临时变量)             │
│    2. collectionVariables (DB 查询)               │
│    3. environmentVariables (调用 EnvService)      │
│    4. globalVariables (DB 查询)                   │
│                                                  │
│  + 全局变量 CRUD                                 │
│  + 集合变量 CRUD                                 │
└─────────────────────────────────────────────────┘
         │                    │
    ┌────┘                    └────┐
    ▼                              ▼
 EnvService                  Database
 (环境变量 CRUD)             (global_variables,
                              collection_variables)
```

**理由**：职责单一原则。EnvService 的环境变量逻辑已经稳定，不需要拆开重构。VariableService 作为编排层，组合各作用域的变量数据。这样改动面最小，也方便后续加新作用域。

**备选方案**：直接扩展 EnvService 为通用解析器 — 风险是改动量大，且混合了不同层次的职责。

### D2: 数据库 Schema — 两张新表

```sql
-- 全局变量（单行键值对，无外键）
CREATE TABLE IF NOT EXISTS global_variables (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    key     TEXT NOT NULL UNIQUE,
    value   TEXT,
    enabled INTEGER DEFAULT 1
);

-- 集合变量（绑定到集合，跟随集合级联删除）
CREATE TABLE IF NOT EXISTS collection_variables (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id  INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    key            TEXT NOT NULL,
    value          TEXT,
    enabled        INTEGER DEFAULT 1
);
```

- `global_variables.key` 设 UNIQUE，全局变量 key 唯一
- `collection_variables` 不设 UNIQUE 约束（不同集合可有同名变量）
- `collection_variables` 通过 FK cascade 跟随集合删除
- 新增索引：`CREATE INDEX IF NOT EXISTS idx_coll_vars_coll_id ON collection_variables(collection_id)`

### D3: Runtime 变量 — 纯前端内存

Runtime 变量存储在前端 `store.js` 的 `runtimeVars` 对象中。

```
store.setState({ runtimeVars: { token: 'abc123', userId: '42' } })
```

- 发送请求时，`runtimeVars` 作为 `runtime_vars` 字段传给后端
- 后端 `VariableService.resolveVariables()` 将其作为最高优先级
- 页面刷新丢失（与 Postman 行为一致）
- 不做 localStorage 持久化（runtime 变量的语义就是临时的）

### D4: 脚本沙箱扩展 — 注入变量操作 API

在 `ScriptService` 的沙箱中注入 `variables` 对象，对标 Postman 的 `pm.variables.set()`：

```javascript
// 沙箱中可用的 API
variables.get(key)          // 按作用域链查找，返回最高优先级的值
variables.set(key, value)   // 设置 runtime 变量
```

**对现有脚本的影响**：`environment` 对象保持只读不变，新增 `variables` 对象。向后兼容，旧脚本无需修改。

**返回值扩展**：`ScriptResult` 新增 `variables` 字段，包含脚本设置的 runtime 变量。前端接收后写入 `store.runtimeVars`。

### D5: 请求管道改动 — proxy.ts

当前请求管道：
```
environment_id → 模板替换 → 脚本执行 → 认证注入 → 代理转发
```

改为：
```
ProxyRequest 新增字段:
  - collection_id?: number      // 请求所属集合
  - runtime_vars?: Record<string, string>  // 前端传入的临时变量

管道流程:
  collection_id + runtime_vars + environment_id
    → VariableService.resolveVariables() 统一替换
    → ScriptService.execute() (沙箱注入 variables API)
    → 脚本返回的新 runtime_vars 合并到 store
    → 认证注入
    → 代理转发
```

### D6: 集合变量与集合树的追溯

集合变量存储在**根集合**级别。当请求位于子文件夹中时，需向上追溯到根集合（`parent_id IS NULL`）获取集合变量。

```typescript
getRootCollectionId(collectionId: number): number {
  // 向上追溯 parent_id 直到 parent_id IS NULL
  let current = collectionId;
  while (true) {
    const parent = db.queryOne('SELECT parent_id FROM collections WHERE id = ?', [current]);
    if (!parent || parent.parent_id == null) return current;
    current = parent.parent_id;
  }
}
```

**注意**：Postman 的集合变量也是绑定在集合级别的，不是文件夹级别。这与我们的设计一致。

### D7: 导入导出扩展

- 导出：`ImportExportService.exportPostmanCollection()` 需要同时导出集合变量
  - Postman v2.1 格式中，集合变量放在顶层 `variable` 字段
- 导入：解析 `variable` 字段，写入 `collection_variables` 表

### D8: 前端变量预览面板

新增 `variable-preview.js` 组件，右上角放置"眼睛"图标按钮。

```
┌─ 变量预览面板 ──────────────────────────────────┐
│                                                  │
│  🔍 搜索变量...                                  │
│                                                  │
│  ── Runtime (临时) ──────────────────────────    │
│  token         abc123                            │
│                                                  │
│  ── Collection: 用户管理 ──────────────────────  │
│  userId        42                                │
│                                                  │
│  ── Environment: 开发环境 ─────────────────────  │
│  baseUrl       http://localhost:8080             │
│  apiKey        sk-xxx                            │
│                                                  │
│  ── Global ────────────────────────────────────  │
│  timeout       5000                              │
│  (被覆盖)  baseUrl  https://prod.example.com     │
│                                                  │
└──────────────────────────────────────────────────┘
```

- 被覆盖的变量灰色显示，标注"被覆盖"
- 全局变量管理入口集成在此面板底部（或独立设置）

### D9: 变量自动补全

在 URL 栏、Headers 值、Body 编辑器中，当输入 `{{` 时触发补全弹窗：

```
用户输入: {{base
         ┌────────────────────────────┐
         │ 🌐 baseUrl    [Global]     │
         │ 📁 baseUrl    [Collection] │
         │ 🔧 baseUrl    [Environment]│
         └────────────────────────────┘
```

- 按作用域分组，标注来源
- 实现方式：监听 `input` 事件，检测 `{{` 模式，查询所有作用域变量后过滤

## Risks / Trade-offs

**[集合变量追溯性能]** → 每次请求都需向上追溯根集合 ID。缓解：请求本身已经知道 `collection_id`，追溯路径通常很短（1-3层），且可以在前端缓存根集合映射。也可在 `saved_requests` 表中冗余存储 `root_collection_id`，但当前阶段不需要。

**[模板替换正则]** → 当前 `\{\{(\w+)\}\}` 不支持带点号的 key（如 `config.timeout`）。Postman 支持 `{{key}}` 但不支持嵌套点号，保持一致即可。如需扩展，后续改为 `\{\{([a-zA-Z0-9_-]+)\}\}`。

**[并发变量修改]** → 多标签页同时修改 runtime 变量可能有竞争。因为 runtime 变量是前端内存状态，各标签页共享同一个 `store`，实际不存在并发问题。全局/集合/环境变量通过 DB 事务保证一致性。

**[向后兼容]** → `ProxyRequest` 新增 `collection_id` 和 `runtime_vars` 字段，都是可选的。不传时行为与现在完全一致（只从 environment 查找）。前端旧代码不发这两个字段也不会出错。

## Open Questions

- 全局变量管理入口放在哪里？建议放在变量预览面板底部，还是独立设置页面？
- 集合编辑器中的 Variables Tab 是否需要支持拖拽排序？（Postman 没有，建议不做）
