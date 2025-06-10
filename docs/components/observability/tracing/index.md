# 链路追踪 (mtrace)

`mtrace` 是 Maltose 框架提供的分布式链路追踪组件，它基于 [OpenTelemetry](https://opentelemetry.io/) 标准实现，旨在为您的分布式系统提供开箱即用的、无侵入的链路追踪能力。

## 特性

- **Otel 原生集成**: 完全遵循 OpenTelemetry 的规范和 API，可以与 Jaeger, Zipkin, SkyWalking 等任何支持 Otel 协议的后端系统无缝集成。
- **自动追踪**:
  - **HTTP 服务端**: `mhttp` 服务器中间件会自动为每个接收到的 HTTP 请求创建服务端 `Span`。
  - **HTTP 客户端**: `mclient` 会自动为每个发出的 HTTP 请求创建客户端 `Span`，并注入追踪上下文。
  - **数据库操作**: `mdb` 会自动为每一次 SQL 查询创建 `Span`。
- **上下文传播**: 自动处理 `TraceContext` 和 `Baggage` 在服务间的传播。
- **自定义 Span**: 提供了简单的 API (`mtrace.NewSpan`)，方便您在业务代码中创建自定义的 `Span`，以追踪更细粒度的操作。
- **TraceID 管理**: 提供了便捷的函数来获取当前上下文的 `TraceID` 和 `SpanID`，或将自定义的 ID 注入到上下文中。

## 它是如何工作的？

Maltose 的核心组件（`mhttp`, `mclient`, `mdb` 等）都已经深度集成了 `mtrace`。

当一个请求进入您的系统时：

1.  `mhttp` 的追踪中间件会尝试从请求头中提取上游服务的 `TraceContext`。如果没有，它会创建一个新的 `Trace` 和根 `Span`。
2.  这个包含了追踪信息的 `context.Context` 会贯穿整个请求处理链路。
3.  当您的业务逻辑调用另一个服务（使用 `mclient`）或查询数据库（使用 `mdb`）时，框架会自动基于当前上下文创建一个新的子 `Span`。
4.  `mclient` 在发出请求时，会自动将 `TraceContext` 注入到 HTTP Header 中，从而将链路信息传递到下游服务。
5.  `mlog` 在记录日志时，会自动从上下文中提取 `trace_id` 和 `span_id`。

整个过程对开发者几乎是完全透明的，您只需要专注于业务逻辑的实现。

## 快速使用

### 获取 TraceID 和 SpanID

在业务代码的任何地方，只要您能拿到 `context.Context`，就能获取到当前的追踪 ID。

```go
import "github.com/graingo/maltose/net/mtrace"

func MyBusinessLogic(ctx context.Context) {
    traceID := mtrace.GetTraceID(ctx)
    spanID := mtrace.GetSpanID(ctx)

    // 您可以将这些 ID 用于日志记录、错误跟踪等
    fmt.Printf("Current TraceID: %s, SpanID: %s\n", traceID, spanID)
}
```

### 创建自定义 Span

如果您希望追踪某段特定的业务逻辑耗时，可以手动创建一个 `Span`。

```go
import "github.com/graingo/maltose/net/mtrace"

func ComplexOperation(ctx context.Context) {
    // 创建一个名为 "ComplexOperation" 的 Span
    // 当函数返回时，span 会自动结束并记录耗时
    newCtx, span := mtrace.NewSpan(ctx, "ComplexOperation")
    defer span.End()

    // ... 执行您的复杂业务逻辑 ...

    // 您还可以为 Span 添加属性(Attributes)和事件(Events)
    span.SetAttributes(attribute.String("parameter", "value"))
    span.AddEvent("Step 1 finished")

    // ... 更多业务逻辑 ...
}
```

### 使用 Baggage 进行跨服务数据传递

`Baggage` 是一种在分布式调用链中传递业务数据的机制，例如传递用户 ID、租户 ID 等。

```go
import "github.com/graingo/maltose/net/mtrace"

func HandleRequest(ctx context.Context) {
    // 1. 将 userID 存入 Baggage
    // 这会返回一个新的 context
    ctx = mtrace.SetBaggageValue(ctx, "userID", 12345)

    // 当您使用 mclient 调用下游服务时，"userID: 12345" 会被自动编码并注入到请求头中
    // ... call other services ...
}

// 在下游服务中
func DownstreamService(ctx context.Context) {
    // 2. 从 Baggage 中读取 userID
    userID := mtrace.GetBaggageVar(ctx, "userID").String()
    fmt.Println("Got userID from baggage:", userID) // 输出: Got userID from baggage: 12345
}
```

## 配置 Exporter

Maltose 默认只在内存中处理追踪数据，并不会将其发送到任何后端。要使链路追踪真正可用，您需要配置一个 `Exporter`。

`Exporter` 负责将收集到的追踪数据发送到后端系统（如 Jaeger, Zipkin, 或 OTLP Collector）。

Maltose 在 `contrib/trace` 目录下提供了一些常用的 Exporter 实现，例如 `otlpgrpc` 和 `otlphttp`。

```go
// main.go
import (
    "github.com/graingo/maltose/contrib/trace/otlpgrpc"
    "go.opentelemetry.io/otel"
)

func main() {
    // 初始化 OTLP/gRPC Exporter
    // 这通常是您应用启动时要做的第一件事
    shutdown, err := otlpgrpc.Init(otlpgrpc.Config{
        Endpoint: "localhost:4317", // OTLP Collector 的地址
        Insecure: true,
    })
    if err != nil {
        panic(err)
    }
    // 确保在应用退出时关闭 Exporter
    defer shutdown(context.Background())

    // ... 启动您的 mhttp 服务器 ...
}

```

配置好 `Exporter` 后，Maltose 框架收集到的所有追踪数据都将被发送到您指定的后端，从而实现完整的可观测性。
