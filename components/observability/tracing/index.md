---
title: 链路追踪
---

# 链路追踪

Maltose 框架通过集成 OpenTelemetry，提供了强大的分布式链路追踪能力。这使得开发者能够轻松地监控和调试复杂的微服务应用，深入了解请求的完整生命周期。

## 核心优势

- **统一的 OTLP 导出器**：框架提供了一个统一的 `otlptrace` 包，同时支持 gRPC 和 HTTP 协议，简化了配置。
- **自动化追踪**：Maltose 对多个核心组件（如 HTTP Server/Client、gRPC、数据库等）进行了深度集成，实现了自动化的链路追踪，无需手动埋点。
- **遵循 OpenTelemetry 标准**：完全兼容 OpenTelemetry 规范，您可以将追踪数据发送到任何支持 OTLP 协议的后端，如 Jaeger、Zipkin、Datadog 等。
- **灵活的配置**：支持服务信息、资源属性、采样率等多种配置选项，满足不同场景下的需求。

## 自动追踪支持

Maltose 框架为以下组件提供了开箱即用的自动链路追踪支持：

| 组件              | 自动追踪支持    |
| :---------------- | :-------------- |
| **HTTP Server**   | ✅ (通过中间件) |
| **HTTP Client**   | ✅              |
| **GORM (数据库)** | ✅              |
| **Redis**         | ✅              |

## 快速开始

### 1. 安装依赖

```bash
go get github.com/graingo/maltose/contrib/trace/otlptrace
```

### 2. 初始化

在您的应用启动时，初始化 `otlptrace` 包。默认使用 gRPC 协议。

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/graingo/maltose/contrib/trace/otlptrace"
    "go.opentelemetry.io/otel"
)

func main() {
    // 初始化 OTLP gRPC 追踪提供者
    // 参数: collector 地址
    shutdown, err := otlptrace.Init("localhost:4317",
        otlptrace.WithServiceName("my-service-grpc"),
    )
    if err != nil {
        log.Fatalf("无法初始化追踪提供者: %v", err)
    }
    defer shutdown(context.Background())

    // ... 应用逻辑
}
```

### 3. 创建自定义 Span (可选)

尽管 Maltose 提供了广泛的自动追踪，您仍可以在业务逻辑的关键路径上手动创建 Span，以获得更详细的追踪信息。

```go
// 获取追踪器
tracer := otel.Tracer("my-component")

// 创建一个根 Span
ctx, span := tracer.Start(context.Background(), "main-operation")
defer span.End()

// ... 你的业务逻辑
time.Sleep(time.Millisecond * 100)
```

## 协议配置

您可以轻松地在 gRPC 和 HTTP 协议之间切换。

### 使用 HTTP

```go
// 初始化 OTLP HTTP 追踪提供者
shutdown, err := otlptrace.Init("localhost:4318",
    otlptrace.WithServiceName("my-service-http"),
    otlptrace.WithProtocol(otlptrace.ProtocolHTTP), // 切换为 HTTP
    otlptrace.WithURLPath("/v1/traces"),             // 自定义路径
)
// ...
```

## 配置选项

| 函数                                       | 说明                                                                      |
| :----------------------------------------- | :------------------------------------------------------------------------ |
| `WithServiceName(name string)`             | 设置服务名称。                                                            |
| `WithServiceVersion(version string)`       | 设置服务版本。                                                            |
| `WithEnvironment(env string)`              | 设置部署环境。                                                            |
| `WithProtocol(protocol Protocol)`          | 设置协议 (`otlptrace.ProtocolGRPC` 或 `otlptrace.ProtocolHTTP`)。         |
| `WithTimeout(timeout time.Duration)`       | 设置导出超时时间。                                                        |
| `WithInsecure(insecure bool)`              | 启用/禁用非安全连接。                                                     |
| `WithURLPath(path string)`                 | 设置 HTTP 导出器的 URL 路径。                                             |
| `WithCompression(level int)`               | 设置 HTTP 导出器的压缩级别。                                              |
| `WithResourceAttribute(key, value string)` | 添加自定义资源属性。                                                      |
| `WithSampler(sampler trace.Sampler)`       | 设置追踪采样器 (例如, `trace.TraceIDRatioBased(0.1)` 用于 10% 的采样率)。 |
