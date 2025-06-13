# 跨边界链路追踪

分布式链路追踪的强大之处在于它能够连接在复杂系统中发生的所有操作。然而，这种能力的完整性完全依赖于**链路上下文 (Trace Context)** 在各个处理单元之间的正确传递。

本篇指南将探讨两个最常见、也最容易出错的场景，并提供在 Maltose 框架下保证链路完整的标准实践：

1.  **并发场景**: 在新的 Goroutine 中继续追踪。
2.  **跨进程场景**: 通过消息队列（MQ）在不同服务间继续追踪。

## 1. Goroutine 内的链路完整性

在 Go 中处理并发时，一个常见的挑战是如何正确传递上下文，特别是当一个后台任务的生命周期需要长于创建它的那个请求时。

假设一个 HTTP Handler 需要启动一个耗时较长的后台任务。这里会遇到两个互相冲突的需求：

1.  **保持链路连续**：后台任务必须是原始 HTTP 请求追踪链路的一部分。
2.  **解耦生命周期**：当 HTTP 请求结束，其 `context` 被取消时，后台任务**不能**被一并取消。

### 常见的错误做法

- **直接传递 `ctx`**：`go myJob(ctx)`
  - **问题**：如果 `ctx` 是请求的上下文，当请求完成时（例如客户端断开或超时），后台任务会被提前终止。
- **使用 `context.Background()`**：`go myJob(context.Background())`
  - **问题**：这会完全切断追踪链路。后台任务会开始一条全新的、与原始请求无关的链路。

### 正确的做法：分离链路与生命周期

正确的解决方案是为 goroutine 创建一个新的 `context`，这个新的 `context` **携带原始的链路信息，但拥有独立的生命周期**。

OpenTelemetry 为此提供了标准方法：从请求的 `context` 中提取出 `Span`，然后将其注入到一个新的、不可取消的 `context.Background()` 中。

```go
import (
    "context"
    "go.opentelemetry.io/otel/trace" // 导入 trace 包
)

// 在一个已有 ctx 的函数中 (例如 HTTP Handler)
func (c *HelloV1) Hello(ctx context.Context, req *v1.HelloReq) (res *v1.HelloRes, err error) {
    // ...
    // 1. 从请求上下文中提取当前的 Span
    span := trace.SpanFromContext(ctx)

    // 2. 创建一个新的、独立的后台上下文，并将 Span 注入其中
    //    这样就只传递了链路信息，而没有传递原始请求的超时或取消信号
    backgroundCtx := trace.ContextWithSpan(context.Background(), span)

    // 3. 将这个新的上下文传递给 goroutine
    go service.User().Create(backgroundCtx, "new-user")
    // ...

    // 立刻返回响应，不用等待 goroutine 完成
    res = &v1.HelloRes{Name: "Request accepted"}
    return
}

// service 层的方法保持不变，它接收到的 context 已经包含了正确的链路信息
func (s *sUser) Create(ctx context.Context, name string) {
    // 这里会正确地创建一个新的子 Span，并链接到原始链路
    ctx, span := mtrace.Tracer().Start(ctx, "service.User.Create")
    defer span.End()

    // 您的业务逻辑...
    // 即使原始 HTTP 请求已经结束，这里的操作也不会因为 context canceled 而失败
}
```

## 2. 跨服务链路完整性 (消息队列)

当服务通过消息队列、RPC 或任何其他网络协议进行通信时，我们无法直接传递内存中的 `context.Context` 对象。

在这种情况下，我们需要遵循 OpenTelemetry 定义的标准 **注入 (Inject) & 提取 (Extract)** 模式。

- **注入**: 发送方（生产者）从其 `Context` 中提取链路信息，并将其序列化成文本格式，"注入" 到消息的头部或属性 (Properties/Headers) 中。
- **提取**: 接收方（消费者）从消息的头部或属性中"提取"出这些文本格式的链路信息，并用它来创建一个与上游链路相关联的、新的 `Context`。

下面我们以 RocketMQ 为例，展示完整的实现。

### 2.1. 生产者：注入链路上下文

生产者负责在发送消息前，将当前上下文中的链路信息注入到消息体中。

这是一个生产者 `Provider` 的示例，它可以被 Controller 调用，将来自 HTTP 请求的链路信息传递给消息。

```go
// 文件: internal/provider/mq_producer.go

package provider

import (
	"context"
	"encoding/json"
	"log"

	"github.com/apache/rocketmq-client-go/v2"
	"github.com/apache/rocketmq-client-go/v2/primitive"
	"github.com/apache/rocketmq-client-go/v2/producer"
	// 导入 OpenTelemetry 的核心包
	"go.opentelemetry.io/otel"
)

type MQProducer struct {
	p rocketmq.Producer
}

// NewMQProducer 初始化生产者.
func NewMQProducer(nameServer string) (*MQProducer, error) {
    // ... 初始化逻辑 ...
}

// SendUserCreatedEvent 发送用户创建事件，并注入链路信息.
func (mq *MQProducer) SendUserCreatedEvent(ctx context.Context, event UserCreatedEvent) error {
	body, _ := json.Marshal(event)
	msg := primitive.NewMessage("user.events", body)

	// ===================== 链路跟踪的核心 =====================
	// 1. 获取 OpenTelemetry 全局注册的 Propagator
	propagator := otel.GetTextMapPropagator()

	// 2. 创建一个用于承载链路信息的 "载体" (Carrier)
	//    对于 RocketMQ，就是一个 map[string]string
	carrier := make(map[string]string)

	// 3. 将 ctx 中的链路信息注入到 carrier 中
	//    这会在 map 中填入 "traceparent" 和 "tracestate" 等键值
	propagator.Inject(ctx, primitive.MapCarrier(carrier))

	// 4. 将携带了链路信息的 carrier 设置为消息的属性
	msg.WithProperties(carrier)
	// ==========================================================

	log.Printf("准备发送消息, Trace Info in Properties: %v", carrier)

	// 注意：发送操作本身不需要追踪，使用 Background 即可
	_, err := mq.p.SendSync(context.Background(), msg)
	return err
}

func (mq *MQProducer) Shutdown() error {
	return mq.p.Shutdown()
}
```

### 2.2. 消费者：提取链路上下文

消费者在收到消息后，执行相反的"提取"操作，从而重建链路。

这是 Job 消费者（`cmd/job.go`）的正确实现方式，它展示了如何从 RocketMQ 消息中提取上下文并创建新的消费者 Span。

```go
// 文件: cmd/job.go (回调函数部分)

// ...
import (
	"github.com/graingo/maltose/net/mtrace"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)
// ...

// 在 Subscribe 回调函数中
err = c.Subscribe("user.events", consumer.MessageSelector{}, func(ctx context.Context, msgs ...*primitive.MessageExt) (consumer.ConsumeResult, error) {
    // 获取全局的 propagator 和 tracer
    propagator := otel.GetTextMapPropagator()
    tracer := mtrace.Tracer() // 使用 Maltose 配置好的 Tracer

    for i := range msgs {
        msg := msgs[i]

        // ===================== 链路跟踪的核心 =====================
        // 1. 将 RocketMQ 的 message.Properties 作为载体 (Carrier)
        carrier := primitive.MapCarrier(msg.Properties)

        // 2. 从载体中提取上游的 Trace Context
        //    即使原始 ctx 是空的，只要 carrier 中有信息，extractedCtx 就会包含链路信息
        extractedCtx := propagator.Extract(context.Background(), carrier)

        // 3. 基于提取的上下文，创建一个新的子 Span
        //    这个 Span 将会链接到生产者的 Span
        spanName := fmt.Sprintf("RocketMQ.consumer.%s", msg.Topic)
        spanCtx, span := tracer.Start(
            extractedCtx,
            spanName,
            trace.WithSpanKind(trace.SpanKindConsumer), // 标记为消费者 Span
        )
        // ==========================================================

        // 4. 将新创建的、包含正确 Trace 信息的 spanCtx 传入业务逻辑
        go func() {
            // 确保在 goroutine 退出时结束 Span
            defer span.End()

            // 使用 spanCtx 而不是 context.Background()
            userJob.HandleUserCreated(spanCtx, msg.Body)
        }()
    }
    return consumer.ConsumeSuccess, nil
})
```

### 总结：一条完整的跨服务链路

1.  **HTTP 入口**: Maltose 的 `mtrace` 中间件为请求创建了一个包含 TraceID 的 `ctx`。
2.  **Controller**: `Hello` 方法接收到这个 `ctx`。
3.  **生产者 `provider`**: 调用 `SendUserCreatedEvent(ctx, ...)` 时，`propagator.Inject(ctx, ...)` 从 `ctx` 中**提取**链路信息，并**写入**到消息的 `Properties` 中。
4.  **消费者 `cmd/job.go`**: 回调函数接收到消息，`propagator.Extract(...)` 从消息的 `Properties` 中**读取**链路信息，并**创建**一个新的、与上游关联的 `spanCtx`。
5.  **业务逻辑 `job` & `logic`**: `spanCtx` 被传递下去，所有后续的 Span 都会自动成为该链路的一部分。

通过遵循这些模式，即可确保在并发和分布式场景下的端到端链路追踪的完整性。
