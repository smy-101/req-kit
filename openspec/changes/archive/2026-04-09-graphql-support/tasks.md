## 1. Body 编辑器 UI

- [x] 1.1 body-type-select 下拉框新增 "GraphQL" 选项
- [x] 1.2 新增 GraphQL 编辑器 DOM 结构：query textarea + operationName 输入框 + variables textarea，默认 hidden
- [x] 1.3 在 renderBodyEditor 中处理 graphql 类型：显示 GraphQL 编辑器，隐藏通用 textarea、multipart/binary 编辑器、Format 按钮

## 2. 请求发送序列化

- [x] 2.1 前端发送逻辑中判断 bodyType === 'graphql'，将 query/variables/operationName 序列化为 JSON body
- [x] 2.2 variables 为空时省略 variables 字段，operationName 为空时省略
- [x] 2.3 对 variables textarea 内容执行 `{{variable}}` 模板替换，query textarea 不替换

## 3. 保存与加载

- [x] 3.1 保存时将 GraphQL 请求序列化为 JSON 字符串存入 body 字段（body_type 为 "graphql"）
- [x] 3.2 加载 body_type 为 "graphql" 的请求时，反序列化 body 字段并分别填充 query、variables、operationName
- [x] 3.3 集合运行器中 GraphQL 请求正确序列化并发送

## 4. Store 状态管理

- [x] 4.1 store 中新增 graphqlQuery、graphqlVariables、graphqlOperationName 状态字段
- [x] 4.2 query/variables/operationName 输入事件绑定 store.setState
- [x] 4.3 tab:switch 事件中恢复 GraphQL 编辑器状态
