## ADDED Requirements

### Requirement: JSON 语法高亮
`syntax-highlight.js` SHALL 导出 `highlightJson(json)` 函数，对 JSON 字符串进行语法高亮，返回带 `<span>` 标签的 HTML 字符串。

#### Scenario: 高亮 JSON 各类型
- **WHEN** 输入为 `{"name": "test", "count": 42, "active": true, "value": null}`
- **THEN** key 用 `json-key` class、字符串用 `json-string`、数字用 `json-number`、布尔用 `json-bool`、null 用 `json-null` 的 span 包裹

### Requirement: XML 语法高亮
`syntax-highlight.js` SHALL 导出 `highlightXml(xml)` 函数，对 XML 字符串进行语法高亮，返回带 `<span>` 标签的 HTML 字符串。

#### Scenario: 高亮 XML 标签和属性
- **WHEN** 输入为 `<root attr="value"><child/></root>`
- **THEN** 标签名用 `xml-tag` class、属性名用 `xml-attr` class、属性值用 `xml-value` class 的 span 包裹

### Requirement: XML 格式化
`syntax-highlight.js` SHALL 导出 `formatXml(xml)` 函数，对 XML 字符串进行缩进格式化。

#### Scenario: 格式化扁平 XML
- **WHEN** 输入为 `<root><a>1</a><b>2</b></root>`
- **THEN** 输出为带 2 空格缩进的多行 XML
