## Purpose

多格式响应展示能力，根据 Content-Type 自动选择展示格式（Pretty/Raw/Preview），支持 XML pretty print、HTML sandbox 预览、Image 预览等。

## Requirements

### Requirement: 多格式响应展示
系统 SHALL 根据响应 Content-Type 自动选择合适的展示格式，并提供格式切换 tab：Pretty、Raw、Preview。

#### Scenario: JSON 响应默认 Pretty 展示
- **WHEN** 响应 Content-Type 包含 "json"
- **THEN** 默认显示 Pretty tab，JSON 格式化并语法高亮

#### Scenario: XML 响应 Pretty 展示
- **WHEN** 响应 Content-Type 包含 "xml"
- **THEN** 默认显示 Pretty tab，XML 缩进格式化并语法高亮

#### Scenario: HTML 响应 Preview 展示
- **WHEN** 响应 Content-Type 包含 "html"
- **THEN** 默认显示 Preview tab，使用 sandbox iframe 渲染 HTML

#### Scenario: 图片响应预览
- **WHEN** 响应 Content-Type 为 image/* 类型
- **THEN** 显示图片预览和尺寸/大小信息

#### Scenario: 其他类型默认 Raw
- **WHEN** 响应 Content-Type 不是 json/xml/html/image
- **THEN** 默认显示 Raw tab，纯文本展示

### Requirement: 手动切换格式
用户 SHALL 能手动在 Pretty、Raw、Preview 之间切换，不受自动检测结果限制。

#### Scenario: 用户手动切换格式
- **WHEN** 用户点击格式 tab 中的 Raw
- **THEN** 响应以纯文本展示，无任何格式化

### Requirement: HTML Preview 安全沙箱
HTML Preview SHALL 在 sandbox iframe 中渲染，禁止执行脚本和同源访问。

#### Scenario: HTML 包含 script 标签
- **WHEN** 响应 HTML 包含 `<script>` 标签
- **THEN** iframe 中不执行任何脚本
