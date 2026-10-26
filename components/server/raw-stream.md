# 原始 HTTP 流

本能力从 v0.5.2 起提供。框架与 CLI 使用配套版本，升级后重新生成 OpenAPI 文档和 manifest。已有 JSON/form 契约保持原有行为。

```bash
go get github.com/graingo/maltose@v0.5.2
go install github.com/graingo/maltose/cmd/maltose@v0.5.2
```

上传文件和下载文件通过普通 HTTP 请求传输二进制字节。`m.Meta` 声明传输模式，Req/Res 的 `io.ReadCloser` 字段承载流资源。Controller、OpenAPI 和 manifest 使用同一份契约。

框架负责 HTTP 传输：声明媒体类型、绑定参数、传递请求流、发送响应流并管理输出资源。文件路径、对象存储、上传意图、权限和租约由业务实现。原始流是显式启用的传输模式，JSON/form 接口继续使用原有绑定与响应流程。

## 声明

```go
import (
    "io"
    "github.com/graingo/maltose/frame/m"
)

type UploadReq struct {
    m.Meta `method:"PUT" path:"/files/:id" body:"raw" consumes:"application/octet-stream"`
    ID string `path:"id" binding:"uuid"`
    Body io.ReadCloser `stream:"body" field:"required"`
}
type UploadRes struct {
    Size int64 `json:"size" field:"required"`
}

type DownloadReq struct {
    m.Meta `method:"GET" path:"/files/:id" response:"raw" produces:"application/octet-stream"`
    ID string `path:"id" binding:"uuid"`
}
type DownloadRes struct {
    Body io.ReadCloser `stream:"body"`
}
```

| 声明 | 含义 |
| --- | --- |
| `body:"raw"` | 请求体为原始字节流 |
| `consumes` | 原始请求媒体类型；省略时为 `application/octet-stream` |
| `response:"raw"` | 成功响应为原始字节流 |
| `produces` | 原始成功响应媒体类型；省略时为 `application/octet-stream` |
| `stream:"body"` | 根 DTO 中唯一的 `io.ReadCloser` 流字段 |
| 流字段 `field:"required"` | 请求体必须出现；空文件有效 |
| 流字段 `dc` | 请求体说明 |

请求和响应可以分别启用，也可在同一接口组合启用。`path/query/header` 继续正常绑定和校验。媒体类型声明使用具体类型，例如 `application/octet-stream`、`image/png`，声明中省略参数和通配符；入站 Content-Type 可以带参数。

原始请求体与 JSON/form 字段互斥。流字段直接放在根 Req/Res 中，使用精确的 `io.ReadCloser` 类型；只接受 `stream`、`field:"required"` 和 `dc` 契约标签。流资源按身份传递，nullable、默认值、binding、schema、匿名 inline 和 JSON 编码均不参与流处理。

原始响应仅声明一个流字段，使用默认 `envelope:"none"`，成功状态支持 200、201、202。HEAD、204、JSON 成员和 maltose 信封与原始响应冲突，编译时报错。原始响应始终返回非 nil 的流，空文件可返回 `io.NopCloser(strings.NewReader(""))`。

## 请求存在性与绑定

绑定器检查 Content-Type、path/query/header，读取请求内容的次数为零。Controller 得到的 `Body` 与应用中间件处理后的 `r.Request.Body` 为同一资源；日志中间件即使启用正文日志，也会跳过原始上传和下载的正文采集。

请求携带 Content-Type、非零长度（含 Go 请求中的未知长度）或 Transfer-Encoding 时，视为体已出现。大小限制等 Body 包装器保持这份存在性。`Content-Type: application/octet-stream` 加零长度表示一个有效空文件。体缺省且未声明 required 时，流为 `http.NoBody`；required 的缺省体返回字段校验错误。存在性可用 `Presence("stream.body")` 查询。实际请求体缺少或不匹配 Content-Type 时，返回 `*contract.DecodeError`，Status 为 415。

应用鉴权和 CSRF 中间件在调用 `Next()` 前完成拒绝。全局 JSON 守卫应按 `r.RawRequestMediaType()` 分流，为原始体应用上传策略。

```go
func (c *Controller) Upload(ctx context.Context, req *UploadReq) (*UploadRes, error) {
    // 在此完成资源授权后，再把 req.Body 流式写入临时文件或对象存储。
    n, err := io.Copy(destination, req.Body)
    if err != nil { return nil, err }
    return &UploadRes{Size: n}, nil
}
```

## 资源、限制与取消

入站请求体由 `net/http` 在请求结束时关闭，应用在请求生命周期内同步消费。绑定器保持资源身份和关闭职责。返回成功响应流后，所有权交给框架：正常结束、复制失败、取消和后续中间件退出都会释放资源，一次响应中只调用一次 Close。Controller 同时返回 error 时，应用释放自己打开的输出资源。

输出流的 Close 应能与 Read 并发，并能解除阻塞中的 Read；文件、网络 Body 或合适的适配器可以满足这个要求。框架使用请求 context 检查取消，并在取消时调用输出流的 Close。自定义 Reader 的阻塞行为由实现负责。

大小和超时是应用策略：

```go
s.Use(func(r *mhttp.Request) {
    if r.RawRequestMediaType() != "" {
        r.Request.Body = http.MaxBytesReader(r.Writer, r.Request.Body, uploadLimit)
    }
    ctx, cancel := context.WithTimeout(r.Request.Context(), uploadTimeout)
    defer cancel()
    r.Request = r.Request.WithContext(ctx)
    deadline, _ := ctx.Deadline()
    transport := r.ResponseController()
    if err := transport.SetReadDeadline(deadline); err != nil {
        r.Error(err); r.Abort(); return
    }
    if err := transport.SetWriteDeadline(deadline); err != nil {
        r.Error(err); r.Abort(); return
    }
    r.Next()
})
```

`ResponseController()` 暴露标准 HTTP 传输的读写期限和双向控制，穿过 Gin 与框架日志包装。外部 ResponseWriter 包装应实现标准 `Unwrap() http.ResponseWriter`，以保留这些能力；应用处理不支持的控制返回值。

context 负责取消信号，网络期限负责解除阻塞 I/O；上例使用同一截止时间。需要提前主动取消时，可通过 `context.AfterFunc` 把读写期限设为当前时间，退出中间件前同步等待已启动的回调结束。完整示例包含此实现。上传超限保留 `*http.MaxBytesError`，由业务错误中间件映射为 413；超时、取消和存储错误也由业务映射。

原始请求与响应组合使用时，框架启用 HTTP/1 全双工，避免标准服务端排空尚未消费的请求体。自定义 HTTP/1 ResponseWriter 需保留该控制，不支持时在提交响应前返回错误。标准 HTTP/2 本身支持双向传输。代理、客户端的缓冲策略由部署环境决定。

## 下载与失败边界

```go
func (c *Controller) Download(ctx context.Context, req *DownloadReq) (*DownloadRes, error) {
    body, err := storage.Open(ctx, req.ID)
    if err != nil { return nil, err }
    r := mhttp.RequestFromCtx(ctx)
    r.Header("Content-Disposition", `attachment; filename="download.bin"`)
    return &DownloadRes{Body: body}, nil
}
```

成功状态和 Content-Type 由契约提供。应用可以设置 Content-Disposition、ETag、Content-Length 等 Header，并用 `Extensions.ResponseHeader` 声明它们。长度未知时省略 Content-Length；声明长度时应与实际字节数一致。

流响应在 Controller 返回后、应用中间件的 `Next()` 返回前完成写入。框架默认响应器和 `MiddlewareResponse()` 识别已写入状态，成功响应仅输出一次。下载按有界缓冲分段写出并 flush；流内容保持原始字节。

写入和 Flush 经过当前 ResponseWriter 链。缓冲或压缩中间件的 `Flush()` 应先发送自身缓冲，再调用下一层 Flush；需要报告包装层自身失败时，提供 `FlushError() error`。框架保留底层写入与 Flush 的首次失败，即使包装层只提供无错误返回值的 `Flush()`，后续成功操作也会保留这次传输失败。`ResponseController()` 用于直接操作传输期限与双向控制；响应缓冲由当前 Writer 的 Flush 管理。

框架在提交响应前进行一次有界预读。返回 error 或首个字节读取失败时，错误进入应用错误中间件，应用仍可返回业务 JSON/Problem Details。Controller 内设置的 Header 属于成功响应；准备失败且尚未提交时，框架恢复调用 Controller 前的 Header，保留中间件的请求标识等信息。Controller 或预读发生 panic 时，同样先恢复 Header，再交给现有 `WithPanicHandler` 处理。错误处理器设置错误专用 Header 并写入错误响应。

提交响应后的读、写、flush、长度校验或 Close 错误记录为 `*mhttp.StreamError`，其中 `Written` 是已交给 ResponseWriter 的字节数，`Cause` 保留错误链；它不代表客户端已收到全部字节。应用可以在 `Next()` 后通过 `r.Errors` 记录审计与指标。此时只记录错误，保持响应字节不变。框架随后通过 `http.ErrAbortHandler` 终止 HTTP/1 连接或 HTTP/2 流，客户端把截断作为失败处理。若声明的完整长度已经交付，随后发生的 Close 错误可能仅能通过服务端观测。

```go
s.Use(func(r *mhttp.Request) {
    r.Next()
    if r.Writer.Written() || len(r.Errors) == 0 { return }
    // 将 r.Errors.Last().Err 转换为应用自己的错误契约。
    r.JSON(500, problem)
})
```

## 生成与接入

继续使用 `maltose gen openapi` 与 `--check`。OpenAPI 3.0/3.1 都生成指定媒体类型的 `type: string, format: binary`，请求 required、参数、成功状态、业务响应头和错误扩展保持一致。流模式、媒体类型与流字段声明进入 operation 指纹；变化后重新生成文档和 manifest。

新增传输字段在普通契约中保持省略，因此已有 JSON/form/none 的行为、presence/nullable、文档和指纹保持不变。CLI 调用应用依赖的共享编译器，业务接入时固定框架与 CLI 的配套版本。

契约流接口通过现有 `Bind(controller)` 注册。普通 Handler 仍可自行处理 HTTP，但自动文档与一致性检查以 Req/Res 控制器契约为入口。

完整可运行上传/下载及生成命令见框架仓库 `examples/raw-stream/README.md`。示例使用临时目录、32 MiB 上限、Bearer 鉴权和 30 秒期限，退出时清理文件。上传意图、租约、权限、对象存储和证据关联由业务项目实现。
