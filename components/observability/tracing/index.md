# 链路追踪

Maltose 框架的 `mtrace` 包基于 OpenTelemetry 提供了一套轻量级的分布式追踪工具集。它通过**薄封装 (Thin Wrapper)** 的方式，旨在**增强而非取代** OpenTelemetry 的原生追踪体验。

## 设计思路

`mtrace` 被设计为一个**轻量级的工具箱**，而非一个厚重的抽象层。它专注于提供一系列便利的辅助函数，以简化最常见的追踪操作（如创建 Span、传递 Baggage），同时保持与 OTel 生態的完全兼容。

我们推荐您在阅读本章节前，先了解其背后的设计思想，以便更好地理解其 API。

[<card heading="深入了解 `mtrace` 的设计思路" icon="i-heroicons-light-bulb" color="indigo" to="./design.md" />](./design.md)

## 核心优势

- **简化的 Span 操作**: 无需手动创建 `Tracer`，通过 `mtrace.NewSpan()` 即可快速创建和启动 Span。
- **便捷的上下文访问**: 通过 `mtrace.GetTraceID()` 和 `mtrace.GetSpanID()`，可以轻松获取追踪信息用于日志关联。
- **易用的 Baggage**: 提供了链式调用的 API (`mtrace.NewBaggage()`) 来简化跨服务业务数据的传递。
- **完全兼容 OTel**: `mtrace` 直接暴露并使用 OpenTelemetry 的原生类型，您可以随时使用 OTel 的全部功能。
- **自动化追踪**: Maltose 对多个核心组件（如 HTTP Server/Client, GORM, Redis）进行了深度集成，实现了自动化的链路追踪，无需手动埋点。

## 快速开始

Maltose 提供了一个 `otlptrace` 包，用于快速初始化和配置 OpenTelemetry OTLP Exporter。下面的示例将展示如何结合使用 `otlptrace` 和 `mtrace`。

### 1. 安装依赖

```bash
go get github.com/graingo/maltose/contrib/trace/otlptrace
```

### 2. 初始化与使用

在应用启动时，调用 `otlptrace.Init()` 来配置并注册全局的 `TracerProvider`。一旦初始化完成，您就可以在项目的任何地方使用 `mtrace` 的辅助函数来创建自定义 Span。

```go
package main

import (
	"context"
	"log"
	"time"

	"github.com/graingo/maltose/contrib/trace/otlptrace"
	"github.com/graingo/maltose/net/mtrace"
	"go.opentelemetry.io/otel/attribute"
)

func main() {
	// 1. 使用 otlptrace 初始化全局 TracerProvider
	//    它会创建一个 OTLP exporter，并将其注册为全局提供者。
	//    参数: OpenTelemetry Collector 的 gRPC 地址。
	shutdown, err := otlptrace.Init("localhost:4317",
		otlptrace.WithServiceName("my-cool-service"),
		otlptrace.WithServiceVersion("1.0.0"),
	)
	if err != nil {
		log.Fatalf("无法初始化追踪提供者: %v", err)
	}
	// 确保在应用退出时，优雅地关闭 TracerProvider
	defer shutdown(context.Background())

	// 2. 在业务逻辑中直接使用 mtrace 的辅助函数
	handleRequest(context.Background())
}

// handleRequest 模拟处理一个外部请求
func handleRequest(ctx context.Context) {
	// 使用 mtrace.NewSpan 快速创建一个父 Span
	ctx, span := mtrace.NewSpan(ctx, "handleRequest")
	defer span.End()

	// 使用 mtrace.GetTraceID 轻松获取 TraceID 用于日志
	traceID := mtrace.GetTraceID(ctx)
	log.Printf("开始处理请求, TraceID: %s", traceID)

	// 使用 mtrace 提供的 Baggage 功能来传递业务数据
	ctx = mtrace.SetBaggageValue(ctx, "user.id", "12345")
	span.SetAttributes(attribute.String("http.method", "GET"))

	time.Sleep(time.Millisecond * 100)

	// 调用下游服务
	doSubOperation(ctx)

	log.Printf("请求处理完成, TraceID: %s", traceID)
}

func doSubOperation(ctx context.Context) {
	// 再次使用 NewSpan, 它会自动从 ctx 中继承父 Span，创建子 Span
	ctx, span := mtrace.NewSpan(ctx, "sub-operation")
	defer span.End()

	// 从 Baggage 中读取上游传递的业务数据
	userID := mtrace.GetBaggageVar(ctx, "user.id").String()

	log.Printf("执行子操作, UserID: %s", userID)
	span.AddEvent("子操作开始")
	time.Sleep(time.Millisecond * 50)
	span.SetAttributes(attribute.Bool("is_sub_op", true))
}
```

## 自动化追踪支持

Maltose 框架为以下组件提供了开箱即用的自动链路追踪支持，您无需为它们手动创建 Span：

| 组件              | 自动追踪支持    |
| :---------------- | :-------------- |
| **HTTP Server**   | ✅ (通过中间件) |
| **HTTP Client**   | ✅              |
| **GORM (数据库)** | ✅              |
| **Redis**         | ✅              |

## 核心 API 概览

| 函数/方法                                 | 说明                                                              |
| :---------------------------------------- | :---------------------------------------------------------------- |
| `mtrace.NewSpan(ctx, name, ...)`          | **核心函数**。创建并启动一个新的 Span，自动处理父子关系。         |
| `mtrace.GetTraceID(ctx)`                  | 从 `context.Context` 中获取追踪 ID 字符串。                       |
| `mtrace.GetSpanID(ctx)`                   | 从 `context.Context` 中获取当前 Span ID 字符串。                  |
| `mtrace.SetBaggageValue(ctx, key, value)` | 向 Baggage 中添加一个键值对。                                     |
| `mtrace.GetBaggageVar(ctx, key)`          | 从 Baggage 中读取一个键，并返回为 `*mvar.Var` 类型。              |
| `mtrace.WithTraceID(ctx, id)`             | 将一个外部 ID (如：来自请求头的 `X-Request-ID`) 注入为 Trace ID。 |
| `mtrace.SetProvider(provider)`            | 设置全局的 `TracerProvider`。                                     |
| `mtrace.NewProvider(...)`                 | 创建一个新的 `TracerProvider` (对 OTel SDK 的封装)。              |
