# TraceID 注入和获取

## 前言

在分布式系统中，链路追踪是一个非常重要的功能，它可以帮助我们理解请求在系统中的流转过程，定位性能瓶颈和排查错误。而 TraceID 是链路追踪中的核心概念，它用于标识一个完整的请求链路。在本章节中，我们将介绍如何在 Maltose 框架中注入和获取 TraceID，以及如何将 TraceID 与日志系统集成。

## TraceID 简介

TraceID 是一个全局唯一的标识符，用于标识一个完整的请求链路。在分布式系统中，一个请求可能会经过多个服务和组件，TraceID 可以帮助我们将这些分散的操作关联起来，形成一个完整的调用链。

在 OpenTelemetry 中，TraceID 是一个 16 字节（128 位）的标识符，通常表示为 32 个十六进制字符。例如：`4bf92f3577b34da6a3ce929d0e0e4736`。

## 自动注入 TraceID

在 Maltose 框架中，TraceID 的注入是自动完成的。当一个请求进入系统时，框架会自动创建一个 Span，并为其分配一个 TraceID。这个 TraceID 会随着请求在系统中流转，被传递给后续的操作和服务。

具体来说，Maltose 框架在以下场景中会自动注入 TraceID：

1. HTTP 请求：当一个 HTTP 请求进入系统时，框架会自动创建一个 Span，并为其分配一个 TraceID。
2. HTTP 客户端：当使用 HTTP 客户端发送请求时，框架会自动将当前上下文中的 TraceID 传递给目标服务。
3. 数据库操作：当执行数据库操作时，框架会自动将当前上下文中的 TraceID 与操作关联起来。
4. 缓存操作：当执行缓存操作时，框架会自动将当前上下文中的 TraceID 与操作关联起来。

## 获取 TraceID

在某些场景下，我们可能需要手动获取 TraceID，例如将 TraceID 添加到日志中，或者将 TraceID 返回给客户端。Maltose 框架提供了简便的方法来获取 TraceID。

### 从上下文中获取 TraceID

```go
package main

import (
    "context"
    "fmt"

    trace "github.com/graingo/maltose/net/mtrace"
)

func DoSomethingWithTraceID(ctx context.Context) {
    // 创建一个 Span
    ctx, span := trace.NewSpan(ctx, "example")
    defer span.End()

    // 获取 TraceID
    traceID := trace.TraceIDFromContext(ctx)

    fmt.Printf("TraceID: %s\n", traceID)
}
```

### 从 HTTP 请求中获取 TraceID

在 HTTP 处理器中，我们可以从请求上下文中获取 TraceID：

```go
package main

import (
    "fmt"
    "net/http"
    "github.com/graingo/maltose/net/mhttp"
    trace "github.com/graingo/maltose/net/mtrace"
)

func handler(c *mhttp.Context) {
    // 获取 TraceID
    traceID := trace.TraceIDFromContext(c.Request.Context())

    // 使用 TraceID
    fmt.Printf("TraceID: %s\n", traceID)

    // 返回 TraceID
    c.JSON(http.StatusOK, map[string]string{
        "trace_id": traceID,
    })
}
```

## 将 TraceID 注入到日志中

将 TraceID 注入到日志中是一个非常有用的实践，它可以帮助我们将日志与链路追踪关联起来，方便排查问题。Maltose 框架的日志系统已经与链路追踪集成，可以自动将 TraceID 注入到日志中。

### 使用 mlog 包

在使用日志系统时，直接调用 `mlog` 包的函数并传入上下文，日志组件会自动从上下文中提取 TraceID 并添加到日志记录中：

```go
package main

import (
    "context"

    "github.com/graingo/maltose/os/mlog"
    trace "github.com/graingo/maltose/net/mtrace"
)

func DoSomething(ctx context.Context) {
    // 创建一个 Span
    ctx, span := trace.NewSpan(ctx, "example")
    defer span.End()

    // 直接使用 mlog 包的函数，并传入上下文
    mlog.Info(ctx, "这是一条带有 TraceID 的日志")
}
```

输出的日志中会自动包含 TraceID：

```
2023-01-01T12:00:00.000Z INFO 这是一条带有 TraceID 的日志 trace_id=4bf92f3577b34da6a3ce929d0e0e4736
```

### 在 HTTP 处理器中使用

在 HTTP 处理器中，我们可以直接使用请求的上下文：

```go
package main

import (
    "github.com/graingo/maltose/net/mhttp"
    "github.com/graingo/maltose/os/mlog"
)

func handler(c *mhttp.Context) {
    // 使用请求上下文
    mlog.Info(c.Request.Context(), "处理请求")

    // 处理请求...
}
```

## 将 TraceID 返回给客户端

在某些场景下，我们可能需要将 TraceID 返回给客户端，以便客户端可以在报告问题时提供 TraceID，方便排查问题。

### 在响应头中返回 TraceID

```go
package main

import (
    "net/http"
    "github.com/graingo/maltose/net/mhttp"
    trace "github.com/graingo/maltose/net/mtrace"
)

func handler(c *mhttp.Context) {
    // 获取 TraceID
    traceID := trace.TraceIDFromContext(c.Request.Context())

    // 将 TraceID 添加到响应头中
    c.Header("X-Trace-ID", traceID)

    // 处理请求...
    c.JSON(http.StatusOK, map[string]string{
        "message": "success",
    })
}
```

### 在响应体中返回 TraceID

```go
package main

import (
    "net/http"
    "github.com/graingo/maltose/net/mhttp"
    trace "github.com/graingo/maltose/net/mtrace"
)

func handler(c *mhttp.Context) {
    // 获取 TraceID
    traceID := trace.TraceIDFromContext(c.Request.Context())

    // 处理请求...

    // 在响应体中返回 TraceID
    c.JSON(http.StatusOK, map[string]interface{}{
        "message":  "success",
        "trace_id": traceID,
    })
}
```

## 最佳实践

### 1. 在所有日志中包含 TraceID

由于 `mlog` 包的日志函数强制要求传入 `context` 参数，因此只要正确使用，就能确保所有日志都自动包含 TraceID。

### 2. 在错误响应中返回 TraceID

在返回错误响应时，包含 TraceID 可以帮助客户端报告问题：

```go
package main

import (
    "net/http"
    "github.com/graingo/maltose/net/mhttp"
    trace "github.com/graingo/maltose/net/mtrace"
)

func handler(c *mhttp.Context) {
    // 获取 TraceID
    traceID := trace.TraceIDFromContext(c.Request.Context())

    // 处理请求...
    if err != nil {
        // 在错误响应中返回 TraceID
        c.JSON(http.StatusInternalServerError, map[string]interface{}{
            "error":    err.Error(),
            "trace_id": traceID,
        })
        return
    }

    // 正常响应...
}
```

### 3. 使用中间件统一处理 TraceID

可以使用中间件统一处理 TraceID，例如将 TraceID 添加到所有响应的头部：

```go
package main

import (
    "github.com/graingo/maltose/net/mhttp"
    trace "github.com/graingo/maltose/net/mtrace"
)

func TraceIDMiddleware() mhttp.HandlerFunc {
    return func(c *mhttp.Context) {
        // 获取 TraceID
        traceID := trace.TraceIDFromContext(c.Request.Context())

        // 将 TraceID 添加到响应头中
        c.Header("X-Trace-ID", traceID)

        // 继续处理请求
        c.Next()
    }
}

// 使用中间件
app := mhttp.New()
app.Use(TraceIDMiddleware())
```

### 4. 在文档中说明 TraceID

在 API 文档中说明 TraceID 的用途和获取方式，以便客户端开发者了解如何使用 TraceID 报告问题：

# 错误处理

当发生错误时，API 会返回一个包含错误信息和 TraceID 的 JSON 响应：

```json
{
  "error": "发生了一个错误",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

请在报告问题时提供 TraceID，以便我们更快地定位和解决问题。

## 小结

在本章节中，我们介绍了如何在 Maltose 框架中注入和获取 TraceID，以及如何将 TraceID 与日志系统集成。通过这些实践，我们可以更好地理解和排查分布式系统中的问题。

TraceID 是链路追踪中的核心概念，它可以帮助我们将分散的操作关联起来，形成一个完整的调用链。在 Maltose 框架中，TraceID 的注入是自动完成的，我们只需要在需要的地方获取和使用 TraceID 即可。

将 TraceID 注入到日志中，可以帮助我们将日志与链路追踪关联起来，方便排查问题。将 TraceID 返回给客户端，可以帮助客户端报告问题，提高问题排查的效率。

```

```
