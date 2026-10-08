# API 契约

本页描述当前 API 契约。文档元数据配置为下一版本新增能力，框架与 CLI 需要一起升级；v0.4.0 用户参照下方迁移说明。已有 v0.3 应用按文末迁移清单升级。

`m.Meta`、成对的 `*Req/*Res` 和字段标签声明 HTTP 契约。运行时与 CLI 使用 `net/mhttp/contract` 的同一个编译器。CLI 发现 DTO 后编译临时 Go 程序，因此 API 包必须可编译，生成过程会执行其依赖的 `init`；API 包应只放类型和无副作用的契约定义。

## 字段规则

| 声明 | 职责 |
| --- | --- |
| `m.Meta` | method、path、group、operation_id、status、summary、tag、dc、body、envelope、unknown |
| `path/query/header/form/json` | 唯一输入来源和名称；`query` 与 `form` 分开 |
| `field:"required"` | 字段必须出现，允许符合值约束的零值 |
| `field:"nullable"` | 请求字段允许显式 null；类型必须可表示 nil |
| `field:"inline"` | 匿名值结构体展开，只用于字段复用 |
| `binding` | required、min、max、gte、lte、len、oneof、email、url、uri、uuid |
| `default` | 输入缺省时填充的 JSON 标量值，随后执行约束 |
| `schema` | format、enum、数值/长度范围、default、example、readOnly、writeOnly 等文档补充 |
| `dc` | 字段描述 |

请求字段默认可选、拒绝 null，路径字段必填。缺省字段跳过值校验；显式 `0`、`false`、空字符串执行值校验。`binding:"required"` 同时要求出现和非零；指针检查解引用后的值，集合检查长度。使用 `field:"required"` 表达必须传入的布尔值和可为零的数值。

对象出现后校验成员；集合自动逐项校验嵌套对象。`binding:"dive,..."` 给集合元素声明值约束。`binding:"omitempty"` 退出新契约，迁移时删除。`json:",omitempty"` 只决定响应序列化。请求默认值使用 `default`；`schema` 的 default 只是文档，框架只对 `default` 执行填充。

每个 `dive` 将后续规则作用于下一层集合元素。集合中的指针元素允许 null，当前层的 `required` 要求该元素非 null、解引用后的值非零。以 `[]*[]string` 为例，`dive,dive,required` 允许 `[null]` 和 `[[]]`，要求实际出现的字符串非空；`dive,required,dive,required` 同时要求每个内层集合非 null、非空。元素值约束（如 `oneof`）在非 null 时执行。

匿名值结构体通过 `field:"inline"` 展开，展开节点只声明 inline。可选对象使用具名指针。同一来源下重名报错。请求根字段指定一个来源，JSON 成员指定 JSON 名称。支持标量、time.Time、指针、切片/数组、字符串键 map 和嵌套结构体。自定义 JSON 编解码类型需要独立适配，不从任意编解码方法推导契约。

响应字段是否必有由 JSON 序列化规则决定：有 omitempty 的字段可缺省，指针和切片/map 可输出 null。响应 schema 约束由业务保证，框架不重新校验每个成功响应。

## 执行与业务边界

路由中间件在绑定校验之前运行。需要认证优先的接口，在中间件调用 `Next` 前认证并按需 Abort；资源授权、事务、幂等和业务校验位于应用层。框架校验错误保留字段路径、规则和参数，业务通过 `errors.As` 映射成 Problem Details。

原始字段存在性随请求保留，业务可区分 PATCH 字段的缺省、null 和实际值。默认值填充保持原始存在性记录。

成功状态默认 200，支持 201、202、204。204 只约束响应体；请求体由输入字段决定。`envelope` 默认 none，可声明 maltose。响应中间件与文档使用这一声明。

## 产物与一致性

CLI 生成文档与 `.manifest.json` 清单；清单包含格式版本、按 operation 排序的契约指纹、最终文档的 SHA-256。Server 从文件或 embed 字节加载二者，启动时比较实际已绑定契约及文档摘要。摘要用于检测产物错配，HTTP 行为由端到端测试验证。

扩展器通过受限添加接口补充 security scheme、operation security、错误响应、成功响应头及 `x-*` 扩展。请求参数仍由 DTO 声明，业务请求头可用 inline 结构体复用。生成的路由、参数、body 和成功响应结构由框架所有。

CI 重新生成并执行 `--check`，检查文档和清单；随后验证客户端生成及编译。

## 验收矩阵

- 分页：缺省应用默认值；0、负数、非数字按约束失败。
- JSON：缺省/null/零值；嵌套对象、集合成员；未知字段策略；单个 JSON 值。
- 路由：group、path 参数、query、header、form、JSON；201 和 204。
- 扩展：Session Cookie、Problem Details、ETag、Set-Cookie；新增扩展无法覆盖生成契约。
- 一致性：3.0/3.1、重复生成字节一致、过期 DTO、错配清单、篡改文档、文件/embed。
- 业务接入：认证先于参数校验；直接响应；TypeScript/Go 客户端可消费。

## 定义与加载

```go
type ListReq struct {
    m.Meta `method:"GET" group:"/api/v1" path:"/products" operation_id:"listProducts"`
    Page int `query:"page" default:"1" binding:"min=1"`
}
type ListRes struct {
    Items []Product `json:"items"`
}
```

```go
//go:embed openapi.yaml
var document []byte
//go:embed openapi.yaml.manifest.json
var manifest []byte

func buildServer() (*mhttp.Server, error) {
    s := mhttp.New()
    s.Group("/api/v1", func(g *mhttp.RouterGroup) { g.Bind(controller) })
    if err := s.LoadOpenAPI(document, manifest); err != nil { return nil, err }
    if err := s.Prepare(context.Background()); err != nil { return nil, err }
    return s, nil
}
```

文件部署可设置 `openapi_file`，框架在 Prepare/Start 时读取文档与同名清单。`openapi_path` 提供加载的原始文档字节；`swagger_path` 引用该入口。Swagger 配置需同时提供 `openapi_path`。Server 在启动时核对清单与实际绑定路由，文档请求期间直接返回缓存字节。

### 业务扩展

```go
package apidocs

func Configure(e *contract.Extensions) error {
    if err := e.SecurityScheme("session", map[string]any{
        "type": "apiKey", "in": "cookie", "name": "session",
    }); err != nil { return err }
    if err := e.Security("listProducts", []map[string][]string{{"session": {}}}); err != nil { return err }
    if err := e.ResponseHeader("listProducts", "ETag", "资源版本", map[string]any{"type": "string"}); err != nil { return err }
    return e.ErrorResponse("listProducts", 401, "需要登录", "application/problem+json", contract.TypeOf[Problem]())
}
```

运行 `maltose gen openapi --extensions example.com/app/apidocs`。`Extension(operationID, "x-permission", value)` 添加业务元数据；operationID 为空时添加文档级扩展。

### 文档元数据

接口的路由、参数与响应来自 `m.Meta + Req/Res`；标题、联系人、服务器地址和标签说明由应用的 `apidocs.Configure` 声明。元数据通过官方生成链写入产物。

基本信息可直接通过 CLI 传入：

```bash
maltose gen openapi -s api -o cmd/openapi.yaml \
  --openapi-version 3.1.0 --title "Example API" --api-version 0.1.0
```

`--openapi-version` 表示 OpenAPI 规范版本（3.0.0 / 3.1.0）；`--api-version` 写入 `info.version`，表示应用接口文档版本。两者独立于框架版本。

完整元数据沿用 `--extensions`：

```go
package apidocs

import "github.com/graingo/maltose/net/mhttp/contract"

func Configure(e *contract.Extensions) error {
    if err := e.Info(contract.Info{
        Title: "Example API",
        Version: "0.1.0",
        Description: "应用接口文档",
        Contact: &contract.Contact{Name: "API Team", Email: "api@example.com"},
        License: &contract.License{Name: "MIT", URL: "https://example.com/license"},
    }); err != nil { return err }
    if err := e.Server(contract.Server{URL: "/", Description: "当前服务"}); err != nil { return err }
    if err := e.Tag(contract.Tag{Name: "Products", Description: "产品管理"}); err != nil { return err }
    return e.ExternalDocs(contract.ExternalDocs{URL: "https://example.com/docs"})
}
```

```bash
maltose gen openapi -s api -o cmd/openapi.yaml --extensions example.com/app/apidocs
maltose gen openapi -s api -o cmd/openapi.yaml --extensions example.com/app/apidocs --check
```

配置规则：

- CLI 的 title/api-version 转换为同一套 `Extensions.Info` 调用。各次调用补充非空字段，相同字段值一致时接受，值冲突时返回错误。Contact、License 分别作为完整声明比较。
- 标题和版本在配置完成后补齐默认值 `API`、`1.0.0`。仅配置 description/contact 时可省略标题和版本。空字符串表示省略，纯空白标题或版本报错。
- `Server`、`Tag` 按声明顺序输出；重复 server URL 或 tag name 报错。标签说明写入顶层 tags；接口归属标签仍通过 `m.Meta tag` 声明。
- Server URL 支持相对地址和标准变量，例如 `Server{URL: "https://{host}/api", Variables: map[string]ServerVariable{"host": {Default: "api.example.com"}}}`。声明枚举时 default 必须属于 enum。
- `ExternalDocs` 只声明一次，也可通过 `Tag.ExternalDocs` 提供标签文档链接。License 使用 3.0/3.1 共有的 name/url 字段。
- 输入会深拷贝；框架在生成结束前校验完整文档。元数据变更更新 manifest 文档摘要，operation 指纹保持不变。

修改元数据后重新生成并提交文档、manifest；CI 使用相同参数执行 `--check`，检查过程保持文件内容。手工修改产物会使文档与清单错配。

Go 调用方通过 `Generate(operations, Options{Version: "3.1.0", Format: "yaml"}, Configure)` 生成。`Options` 只负责输出设置；v0.4.0 的 `Options.Title` 已移除，标题迁移至 `Extensions.Info(Info{Title: ...})`。新版 CLI 和框架配套使用，临时生成程序直接使用新版 API。

### 校验错误与存在性

```go
s.Use(func(r *mhttp.Request) {
    r.Next()
    if len(r.Errors) == 0 { return }
    var failure *contract.ValidationError
    if errors.As(r.Errors.Last().Err, &failure) {
        r.JSON(422, failure) // 可在此转换为应用自己的 Problem Details。
    }
})
```

在 Controller 中通过 `mhttp.RequestFromCtx(ctx).Presence("json.profile")` 读取原始状态：`contract.Missing`、`contract.Null`、`contract.Present`。数组成员路径如 `json.items[0].name`，map 成员如 `json.labels["key"]`。

## 从 v0.3 迁移

1. 将 query 字段的 `form` 改为 `query`，路径字段的 `uri` 改为 `path`。一个字段指定一个来源。
2. 删除 `binding:"omitempty"`。可选字段缺省跳过约束，显式零值执行约束。默认值移到 `default`。
3. 需要对象出现时使用 `field:"required"`；需要标量非零或集合非空时使用 `binding:"required"`。后者对指针检查解引用后的值。
4. 匿名值结构体添加 `field:"inline"`；可选匿名指针改为具名指针。
5. 将 RouterGroup 的完整前缀写入 `m.Meta group`。需要信封的接口声明 `envelope:"maltose"`。
6. 将自定义 validator 规则放到 Controller/应用校验入口。结构约束使用支持的 binding 标签；业务负责文档补充声明的执行。
7. 移除为严格 JSON 编写的 DTO `UnmarshalJSON`；默认 unknown=reject，允许未知字段时声明 `unknown:"allow"`。
8. 重新生成并加载文档和清单；CI 执行 `--check`，验证下游客户端。

当前明确支持 JSON 对象和 URL encoded form body。multipart、任意自定义 JSON/Text 编解码、请求中的 interface、非字符串 map 键、字节切片不进入自动契约；文件与流式接口使用普通 Handler。字节内容可声明为 base64 字符串。

OpenAPI format 是格式提示，具体 validator 的所有边界与业务状态无法由文档证明。指纹覆盖声明和类型图，业务鉴权、数据库约束与自定义校验仍由 HTTP/集成测试覆盖。

响应中的 `any` 表示自由 JSON 值，可用于 Problem Details 的 `params`。数组成员的文档约束使用 `schema:"items.enum=read|write"`、`schema:"items.format=uuid"`；普通 `enum` 约束标量字段。运行时数组成员约束使用 `binding:"dive,oneof=read write"`。
