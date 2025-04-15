# 基本示例

本文档将展示如何在单进程应用中使用 Maltose 框架的链路追踪功能，包括创建 Root Span 和子 Span，记录属性和事件等基本操作。

## 前提条件

在开始之前，请确保您已经完成了[链路跟踪-准备工作](./prepare.md)中的步骤，包括安装 Jaeger 和初始化 Tracer。

## 基本概念回顾

在深入示例之前，让我们简要回顾一下链路追踪的基本概念：

- **Span**：链路追踪的基本单位，表示一个操作或工作单元
- **Trace**：由一系列相关的 Span 组成，表示一个完整的请求流程
- **Root Span**：Trace 中的第一个 Span，没有父 Span
- **Child Span**：由另一个 Span 创建的 Span，有父 Span
- **Attributes**：附加到 Span 上的键值对，提供额外的上下文信息
- **Events**：带有时间戳的日志事件，记录在 Span 的生命周期内发生的重要事件

## 创建 Root Span

首先，让我们创建一个 Root Span，它是一个 Trace 的起点：

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/graingo/maltose/trace"
    "go.opentelemetry.io/otel/attribute"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "example-service",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建 Root Span
    ctx, span := trace.NewSpan(context.Background(), "root-operation")
    defer span.End()

    // 添加属性
    span.SetAttributes(
        attribute.String("operation.type", "example"),
        attribute.Int("operation.importance", 1),
    )

    // 记录事件
    span.AddEvent("operation.started")

    // 模拟一些工作
    time.Sleep(100 * time.Millisecond)

    // 记录另一个事件
    span.AddEvent("operation.completed")

    log.Println("Root Span 示例完成")
}
```

在这个示例中，我们：

1. 初始化了一个 TracerProvider
2. 创建了一个名为 "root-operation" 的 Root Span
3. 添加了一些属性来描述这个操作
4. 记录了操作开始和完成的事件
5. 最后结束了 Span

运行这个程序后，您可以在 Jaeger UI 中看到一个包含单个 Span 的 Trace。

## 创建子 Span

在实际应用中，一个操作通常由多个子操作组成。我们可以使用子 Span 来表示这些子操作：

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/graingo/maltose/trace"
    "go.opentelemetry.io/otel/attribute"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "example-service",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建 Root Span
    ctx, rootSpan := trace.NewSpan(context.Background(), "process-request")
    defer rootSpan.End()

    // 添加属性
    rootSpan.SetAttributes(
        attribute.String("request.id", "12345"),
        attribute.String("request.type", "example"),
    )

    // 记录事件
    rootSpan.AddEvent("request.received")

    // 调用第一个子操作
    validateRequest(ctx)

    // 调用第二个子操作
    processData(ctx)

    // 记录事件
    rootSpan.AddEvent("request.completed")

    log.Println("多 Span 示例完成")
}

func validateRequest(ctx context.Context) {
    // 创建子 Span
    _, span := trace.NewSpan(ctx, "validate-request")
    defer span.End()

    // 添加属性
    span.SetAttributes(
        attribute.String("validation.type", "basic"),
    )

    // 模拟验证工作
    time.Sleep(50 * time.Millisecond)

    // 记录事件
    span.AddEvent("validation.successful")
}

func processData(ctx context.Context) {
    // 创建子 Span
    ctx, span := trace.NewSpan(ctx, "process-data")
    defer span.End()

    // 添加属性
    span.SetAttributes(
        attribute.String("processing.type", "standard"),
    )

    // 记录事件
    span.AddEvent("processing.started")

    // 模拟一些处理工作
    time.Sleep(100 * time.Millisecond)

    // 调用更深层次的子操作
    saveResult(ctx)

    // 记录事件
    span.AddEvent("processing.completed")
}

func saveResult(ctx context.Context) {
    // 创建子 Span
    _, span := trace.NewSpan(ctx, "save-result")
    defer span.End()

    // 添加属性
    span.SetAttributes(
        attribute.String("storage.type", "memory"),
    )

    // 模拟保存结果
    time.Sleep(30 * time.Millisecond)

    // 记录事件
    span.AddEvent("result.saved")
}
```

在这个示例中，我们：

1. 创建了一个名为 "process-request" 的 Root Span
2. 调用了两个函数 `validateRequest` 和 `processData`，每个函数都创建了自己的子 Span
3. 在 `processData` 函数中，我们又调用了 `saveResult` 函数，它创建了更深层次的子 Span
4. 每个 Span 都添加了相关的属性和事件

运行这个程序后，您可以在 Jaeger UI 中看到一个包含多个 Span 的 Trace，这些 Span 形成了一个树状结构，反映了操作之间的调用关系。

## 记录错误

在实际应用中，操作可能会失败。我们可以使用 `RecordError` 方法来记录错误：

```go
package main

import (
    "context"
    "errors"
    "log"
    "time"

    "github.com/graingo/maltose/trace"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "example-service",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建 Root Span
    ctx, span := trace.NewSpan(context.Background(), "error-example")
    defer span.End()

    // 调用可能失败的函数
    if err := riskyOperation(ctx); err != nil {
        // 记录错误
        span.RecordError(err)

        // 设置 Span 状态为错误
        span.SetStatus(trace.StatusError, err.Error())

        log.Printf("操作失败: %v", err)
    }

    log.Println("错误处理示例完成")
}

func riskyOperation(ctx context.Context) error {
    // 创建子 Span
    _, span := trace.NewSpan(ctx, "risky-operation")
    defer span.End()

    // 模拟一些工作
    time.Sleep(50 * time.Millisecond)

    // 模拟错误
    err := errors.New("操作失败：资源不可用")

    // 记录错误
    if err != nil {
        span.RecordError(err)
        span.SetStatus(trace.StatusError, err.Error())
    }

    return err
}
```

在这个示例中，我们：

1. 创建了一个名为 "error-example" 的 Root Span
2. 调用了一个可能失败的函数 `riskyOperation`
3. 在函数中，我们模拟了一个错误，并使用 `RecordError` 方法记录了这个错误
4. 我们还使用 `SetStatus` 方法将 Span 的状态设置为错误

运行这个程序后，您可以在 Jaeger UI 中看到一个包含错误信息的 Trace，错误的 Span 会被标记为红色，方便您快速识别问题。

## 使用自定义 Tracer

在某些情况下，您可能需要使用自定义的 Tracer，例如为不同的模块使用不同的 Tracer：

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/graingo/maltose/trace"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "example-service",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 获取自定义 Tracer
    userTracer := tp.Tracer("user-module")
    orderTracer := tp.Tracer("order-module")

    // 创建 Root Span
    ctx, span := userTracer.Start(context.Background(), "user-operation")
    defer span.End()

    // 模拟一些用户相关的工作
    time.Sleep(50 * time.Millisecond)

    // 创建另一个模块的 Span
    _, orderSpan := orderTracer.Start(ctx, "order-operation")
    defer orderSpan.End()

    // 模拟一些订单相关的工作
    time.Sleep(30 * time.Millisecond)

    log.Println("自定义 Tracer 示例完成")
}
```

在这个示例中，我们：

1. 获取了两个自定义的 Tracer：`userTracer` 和 `orderTracer`
2. 使用 `userTracer` 创建了一个名为 "user-operation" 的 Root Span
3. 使用 `orderTracer` 创建了一个名为 "order-operation" 的子 Span

运行这个程序后，您可以在 Jaeger UI 中看到一个 Trace，其中包含来自不同模块的 Span。

## 使用 Span 链接

在某些情况下，您可能需要将一个 Span 与另一个 Trace 中的 Span 关联起来。这可以通过 Span 链接（Links）实现：

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/graingo/maltose/trace"
    "go.opentelemetry.io/otel/trace"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "example-service",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建第一个 Trace
    ctx1, span1 := trace.NewSpan(context.Background(), "first-trace")

    // 获取 SpanContext
    spanContext1 := span1.SpanContext()

    // 结束第一个 Span
    span1.End()

    // 等待一段时间，确保两个 Trace 是分开的
    time.Sleep(100 * time.Millisecond)

    // 创建第二个 Trace，并链接到第一个 Trace
    ctx2, span2 := trace.NewSpan(
        context.Background(),
        "second-trace",
        trace.WithLinks(trace.Link{
            SpanContext: spanContext1,
            Attributes:  nil,
        }),
    )
    defer span2.End()

    // 模拟一些工作
    time.Sleep(50 * time.Millisecond)

    log.Println("Span 链接示例完成")
}
```

在这个示例中，我们：

1. 创建了一个名为 "first-trace" 的 Root Span，并获取了它的 SpanContext
2. 结束了第一个 Span
3. 创建了一个名为 "second-trace" 的新 Root Span，并使用 `WithLinks` 选项将它与第一个 Span 关联起来

运行这个程序后，您可以在 Jaeger UI 中看到两个独立的 Trace，但第二个 Trace 中的 Span 会有一个指向第一个 Trace 中 Span 的链接。

## 总结

在本文档中，我们展示了如何在单进程应用中使用 Maltose 框架的链路追踪功能，包括：

1. 创建 Root Span 和子 Span
2. 添加属性和事件
3. 记录错误
4. 使用自定义 Tracer
5. 使用 Span 链接

这些基本操作是链路追踪的基础，在实际应用中，您可以根据需要组合使用这些操作，构建复杂的追踪链路。

在下一篇文档中，我们将介绍如何在 HTTP 服务中使用链路追踪，实现跨服务的调用链追踪。
