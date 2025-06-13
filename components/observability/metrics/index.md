# 指标监控

`mmetric` 是 Maltose 框架提供的指标监控组件，它基于 OpenTelemetry 标准，提供了一套统一的指标采集接口，旨在与框架的其他部分深度集成，并能轻松对接各种主流的监控后端系统。

## 核心优势

- **统一接口**: 提供了 `Counter`（计数器）、`UpDownCounter`（升降计数器）和 `Histogram`（直方图）等标准化的指标类型接口。
- **提供者模式 (Provider)**: 采用提供者模式，使得底层实现可以被替换。Maltose 提供了 `otelmetric` 包，支持通过 gRPC 或 HTTP 协议将指标导出到 OpenTelemetry Collector。
- **自动化采集**: 框架核心组件（如 `mhttp`）会自动采集关键指标，如请求总数、活跃请求数、请求耗时等，无需手动埋点。
- **维度标签 (Attributes)**: 所有的指标采集都支持附带多维度的标签，方便在监控系统中进行聚合和筛选。

## 指标类型

- **Counter (计数器)**: 一个只增不减的单调值，用于统计请求总数、错误总数等。
- **UpDownCounter (升降计数器)**: 一个可以增加也可以减少的值，用于统计当前活跃的请求数、队列中的任务数等。
- **Histogram (直方图)**: 用于统计数据的分布情况，例如请求耗时的分布（P95, P99 等）。

:::tip 直方图桶 (Histogram Buckets) 的配置变更
根据 OpenTelemetry SDK v1.34.0 及以上版本的规范，**直方图的桶（Buckets）不再通过客户端代码进行配置**。

过去，开发者可能会在创建 Histogram 时指定 `Buckets` 选项。现在，桶的划分和聚合完全由后端的 **OpenTelemetry Collector** 或监控系统（如 Prometheus）来定义和管理。

这种变更简化了客户端的配置，并将数据聚合的复杂性移到了后端，提供了更大的灵活性。您只需在应用中记录原始值，然后在 Collector 的配置中定义您想要的延迟桶。
:::

## 快速开始

### 1. 安装依赖

```bash
go get github.com/graingo/maltose/contrib/metric/otlpmetric
```

### 2. 初始化

在您的应用启动时，初始化 `otlpmetric` 包。

```go
package main

import (
    "context"
    "log"

    "github.com/graingo/maltose/contrib/metric/otlpmetric"
)

func main() {
    // 初始化 OTLP 指标导出器 (默认使用 gRPC)
    shutdown, err := otlpmetric.Init("localhost:4317",
        otlpmetric.WithServiceName("my-service"),
        otlpmetric.WithServiceVersion("1.0.0"),
    )
    if err != nil {
        log.Fatalf("初始化指标失败: %v", err)
    }
    defer shutdown(context.Background())

    // ... 您的应用逻辑 ...
}
```

### 3. 创建和使用自定义指标

```go
package main

import (
    "context"
    "time"
    "github.com/graingo/maltose/os/mmetric"
)

// 1. 创建一个 Counter 指标
var orderCounter = mmetric.MustCounter(
    "orders.created.total",
    mmetric.MetricOption{
        Help: "Total number of created orders",
    },
)

// 2. 在业务逻辑中使用
func CreateOrder(ctx context.Context) {
    // ... 业务逻辑 ...

    // 增加计数器的值，并附带标签
    orderCounter.Inc(ctx, mmetric.WithAttributes(mmetric.AttributeMap{
        "payment_channel": "alipay",
        "order_type":      "normal",
    }))
}
```

## 协议配置

您可以轻松地在 gRPC 和 HTTP 协议之间切换。

### 使用 HTTP

```go
// 初始化 OTLP HTTP 指标导出器
shutdown, err := otlpmetric.Init("localhost:4318",
    otlpmetric.WithServiceName("my-service-http"),
    otlpmetric.WithProtocol(otlpmetric.ProtocolHTTP), // 切换为 HTTP
    otlpmetric.WithURLPath("/v1/metrics"),            // 自定义路径
)
// ...
```

## 配置选项

| 函数                                         | 说明                                                                |
| :------------------------------------------- | :------------------------------------------------------------------ |
| `WithServiceName(name string)`               | 设置服务名称。                                                      |
| `WithServiceVersion(version string)`         | 设置服务版本。                                                      |
| `WithEnvironment(env string)`                | 设置部署环境。                                                      |
| `WithProtocol(protocol Protocol)`            | 设置协议 (`otlpmetric.ProtocolGRPC` 或 `otlpmetric.ProtocolHTTP`)。 |
| `WithExportInterval(interval time.Duration)` | 设置指标导出间隔。                                                  |
| `WithTimeout(timeout time.Duration)`         | 设置导出超时时间。                                                  |
| `WithInsecure(insecure bool)`                | 启用/禁用非安全连接。                                               |
| `WithURLPath(path string)`                   | 设置 HTTP 导出器的 URL 路径。                                       |
| `WithResourceAttribute(key, value string)`   | 添加自定义资源属性。                                                |
