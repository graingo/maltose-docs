# TraceID 注入和获取

在 Maltose 中，请求进入 `mhttp` 后会自动创建链路上下文。大多数场景下不需要手动生成 TraceID，只需要在需要的时候从 `context.Context` 里取出即可。

## 获取 TraceID 和 SpanID

`mtrace` 当前公开的读取方法是：

- `mtrace.GetTraceID(ctx)`
- `mtrace.GetSpanID(ctx)`

```go
package main

import (
    "context"
    "fmt"

    "github.com/graingo/maltose/net/mtrace"
)

func PrintTrace(ctx context.Context) {
    fmt.Println("trace:", mtrace.GetTraceID(ctx))
    fmt.Println("span:", mtrace.GetSpanID(ctx))
}
```

## 在 HTTP 处理器中使用

```go
package main

import (
    "net/http"

    "github.com/graingo/maltose/net/mhttp"
    "github.com/graingo/maltose/net/mtrace"
)

func handler(r *mhttp.Request) {
    traceID := mtrace.GetTraceID(r.Request.Context())

    r.Header("X-Trace-ID", traceID)
    r.JSON(http.StatusOK, map[string]any{
        "message":  "success",
        "trace_id": traceID,
    })
}
```

## 日志会自动带上链路字段

`mlog` 会从上下文里自动提取链路信息，不需要手动拼接。

```go
package main

import (
    "github.com/graingo/maltose/net/mhttp"
    "github.com/graingo/maltose/os/mlog"
)

func handler(r *mhttp.Request) {
    mlog.Infow(r.Request.Context(), "processing request")
}
```

日志字段名是 `trace.id` 和 `span.id`：

```json
{
  "level": "info",
  "msg": "processing request",
  "trace.id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span.id": "8c6b7e8f0a1d9b3a"
}
```

## 统一回传 TraceID

如果你希望所有响应都带上 `X-Trace-ID`，可以写一个简单中间件：

```go
func TraceIDHeaderMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        traceID := mtrace.GetTraceID(r.Request.Context())
        if traceID != "" {
            r.Header("X-Trace-ID", traceID)
        }
        r.Next()
    }
}
```

## 错误响应中附带 TraceID

```go
func failHandler(r *mhttp.Request) {
    traceID := mtrace.GetTraceID(r.Request.Context())

    r.JSON(http.StatusInternalServerError, map[string]any{
        "error":    "internal server error",
        "trace_id": traceID,
    })
}
```

## 最佳实践

- 业务代码统一从 `ctx` 或 `r.Request.Context()` 获取 TraceID。
- 记录日志时直接把上下文传给 `mlog`，不要手动重复组装 `trace_id` 字段。
- 对外暴露 TraceID 时，优先放到响应头，必要时再放入响应体。
