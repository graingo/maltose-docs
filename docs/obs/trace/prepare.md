# 准备工作

本文档将指导您完成使用 Maltose 框架进行链路追踪的准备工作，包括安装和配置 Jaeger、准备链路追踪环境以及初始化 Tracer。

## 安装 Jaeger

Jaeger 是一个开源的分布式追踪系统，用于监控和排查微服务架构中的问题。Maltose 框架默认支持将追踪数据导出到 Jaeger。

### 使用 Docker 安装 Jaeger

最简单的方式是使用 Docker 运行 Jaeger All-in-One 镜像：

```bash
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 14250:14250 \
  -p 14268:14268 \
  -p 14269:14269 \
  -p 9411:9411 \
  jaegertracing/all-in-one:latest
```

这将启动 Jaeger 的所有组件，包括 Agent、Collector、Query Service 和 UI。

### 使用 Docker Compose 安装 Jaeger

您也可以使用 Docker Compose 安装 Jaeger。创建一个 `docker-compose.yml` 文件：

```yaml
version: "3"
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "6831:6831/udp"
      - "6832:6832/udp"
      - "5778:5778"
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"
      - "14250:14250"
      - "14268:14268"
      - "14269:14269"
      - "9411:9411"
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
      - COLLECTOR_OTLP_ENABLED=true
```

然后运行：

```bash
docker-compose up -d
```

### 验证 Jaeger 安装

安装完成后，您可以通过访问 Jaeger UI 来验证安装是否成功：

```
http://localhost:16686
```

如果您能看到 Jaeger UI 界面，说明安装成功。

## 配置 Maltose 链路追踪

### 安装依赖

首先，确保您的项目中已经安装了 Maltose 框架的链路追踪模块：

```bash
go get github.com/graingo/maltose/trace
```

### 初始化 Tracer

在您的应用程序中，您需要初始化一个全局的 TracerProvider。通常，这应该在应用程序启动时完成：

```go
package main

import (
    "context"
    "log"

    "github.com/graingo/maltose/trace"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "my-service",        // 服务名称
        Endpoint:    "http://localhost:14268/api/traces", // Jaeger Collector 端点
        Environment: "development",       // 环境名称（可选）
        Version:     "1.0.0",             // 服务版本（可选）
        SamplingRate: 1.0,                // 采样率（1.0 表示 100%）
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 应用程序代码...
}
```

### 配置选项

Maltose 的链路追踪配置支持以下选项：

| 选项               | 类型          | 必填 | 默认值       | 描述                                                |
| ------------------ | ------------- | ---- | ------------ | --------------------------------------------------- |
| ServiceName        | string        | 是   | -            | 服务名称，用于在 Jaeger UI 中标识服务               |
| Endpoint           | string        | 是   | -            | Jaeger Collector 的端点 URL                         |
| Environment        | string        | 否   | "production" | 环境名称，如 "development"、"staging"、"production" |
| Version            | string        | 否   | ""           | 服务版本号                                          |
| SamplingRate       | float64       | 否   | 1.0          | 采样率，范围 0.0-1.0，1.0 表示 100% 采样            |
| Exporter           | string        | 否   | "jaeger"     | 导出器类型，支持 "jaeger" 和 "otlp"                 |
| BatchTimeout       | time.Duration | 否   | 5s           | 批处理超时时间                                      |
| MaxExportBatchSize | int           | 否   | 512          | 最大导出批次大小                                    |
| MaxQueueSize       | int           | 否   | 2048         | 最大队列大小                                        |

## 验证配置

完成配置后，您可以编写一个简单的程序来验证链路追踪是否正常工作：

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
        ServiceName: "test-service",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建根 Span
    ctx, span := trace.NewSpan(context.Background(), "test-operation")
    span.SetAttributes(attribute.String("test.attribute", "test-value"))

    // 模拟一些工作
    time.Sleep(100 * time.Millisecond)

    // 创建子 Span
    ctx, childSpan := trace.NewSpan(ctx, "child-operation")
    childSpan.AddEvent("test-event")

    // 模拟一些工作
    time.Sleep(50 * time.Millisecond)

    // 结束子 Span
    childSpan.End()

    // 结束根 Span
    span.End()

    // 等待数据导出
    time.Sleep(1 * time.Second)

    log.Println("追踪数据已发送到 Jaeger")
}
```

运行此程序后，您可以在 Jaeger UI 中查看追踪数据：

1. 打开 http://localhost:16686
2. 在 "Service" 下拉菜单中选择 "test-service"
3. 点击 "Find Traces" 按钮
4. 您应该能看到一个包含 "test-operation" 和 "child-operation" 的追踪

如果您能看到追踪数据，说明链路追踪配置成功。

## 常见问题

### 无法连接到 Jaeger

如果您遇到无法连接到 Jaeger 的问题，请检查：

1. Jaeger 容器是否正在运行：`docker ps | grep jaeger`
2. Endpoint URL 是否正确
3. 防火墙或网络设置是否阻止了连接

### 看不到追踪数据

如果您在 Jaeger UI 中看不到追踪数据，请检查：

1. 服务名称是否正确
2. 采样率是否设置为大于 0 的值
3. 是否正确结束了所有 Span（调用 `span.End()`）
4. 是否给 TracerProvider 足够的时间导出数据（可能需要等待几秒钟）

### 性能问题

如果您在生产环境中遇到性能问题，可以考虑：

1. 降低采样率（例如设置为 0.1，表示只采样 10% 的请求）
2. 增加批处理大小和队列大小
3. 使用更高效的导出器（如 OTLP）

## 下一步

完成准备工作后，您可以继续阅读以下文档：

- [链路跟踪-基本示例](./example.md)：了解如何在应用程序中使用链路追踪
- [链路跟踪-HTTP 示例](./http-example.md)：了解如何在 HTTP 服务中使用链路追踪
