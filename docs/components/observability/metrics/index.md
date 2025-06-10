# 指标监控 (mmetric)

`mmetric` 是 Maltose 框架提供的指标监控组件，它提供了一套标准化的、统一的指标采集接口，旨在与框架的其他部分（如 `mhttp`）深度集成，并能轻松对接各种主流的监控后端系统。

## 特性

- **统一接口**: 提供了 `Counter`（计数器）、`UpDownCounter`（升降计数器）和 `Histogram`（直方图）等标准化的指标类型接口。
- **提供者模式 (Provider)**: 采用提供者模式，使得底层实现可以被替换。您可以轻松地接入 `Prometheus`、`OpenTelemetry Collector` 等不同的监控系统。
- **自动采集**: `mhttp` 组件会自动使用 `mmetric` 采集所有 HTTP 请求的关键指标，如请求总数 (`http.server.request.total`)、活跃请求数 (`http.server.request.active`)、请求耗时 (`http.server.request.duration`) 等。
- **维度标签 (Attributes)**: 所有的指标采集都支持附带多维度的标签，方便在监控系统中进行聚合和筛选。

## 核心概念

### Provider

`Provider` 是指标数据的生产者。`mmetric` 的所有功能都始于一个 `Provider`。它负责创建 `Meter`，并将最终的指标数据暴露给监控系统。Maltose 在 `contrib/metric` 中提供了 `otelmetric` 实现，可以将指标数据导出到 OpenTelemetry Collector。

### Meter

`Meter`（测量计）是创建具体指标（`Counter`, `Histogram` 等）的工厂。通常一个组件或一个模块会使用一个独立的 `Meter`。

### 指标类型

- **Counter (计数器)**: 一个只增不减的单调值，用于统计请求总数、错误总数等。
- **UpDownCounter (升降计数器)**: 一个可以增加也可以减少的值，用于统计当前活跃的请求数、队列中的任务数等。
- **Histogram (直方图)**: 用于统计数据的分布情况，例如请求耗时的分布（P95, P99 等）。

## 快速使用

### 自动采集的 HTTP 指标

当您使用 `mhttp` 组件时，无需任何配置，以下指标就会被自动采集：

- `http.server.request.total`: HTTP 请求总数。
- `http.server.request.active`: 当前正在处理的活跃请求数。
- `http.server.request.duration`: HTTP 请求耗时的分布（直方图）。
- `http.server.request.body_size`: HTTP 请求体的大小。
- `http.server.response.body_size`: HTTP 响应体的大小。

这些指标都包含了丰富的维度标签，如 `http.route` (路由路径), `http.request.method` (请求方法), `http.response.status_code` (状态码) 等，方便您进行深入分析。

### 自定义业务指标

在您的业务代码中，可以很方便地创建和使用自定义指标。

```go
package main

import (
    "context"
    "time"
    "github.com/graingo/maltose/os/mmetric"
)

var (
    // 1. 创建一个 Meter
    orderMeter = mmetric.GetProvider().Meter(mmetric.MeterOption{
        Instrument: "my.app.order",
    })

    // 2. 创建一个 Counter 指标，用于统计订单创建总数
    orderCreatedCounter = orderMeter.MustCounter(
        "order.created.total",
        mmetric.MetricOption{
            Help: "Total number of orders created",
        },
    )

    // 3. 创建一个 Histogram 指标，用于统计订单处理耗时
    orderProcessDuration = orderMeter.MustHistogram(
        "order.process.duration",
        mmetric.MetricOption{
            Help: "Duration of order processing",
            Unit: "ms",
        },
    )
)

// 在业务逻辑中使用指标
func CreateOrder(ctx context.Context) {
    startTime := time.Now()

    // ... 创建订单的业务逻辑 ...

    // 增加计数器的值
    // 可以附带标签，例如支付渠道
    orderCreatedCounter.Inc(ctx, mmetric.Option{
        Attributes: mmetric.AttributeMap{
            "payment_channel": "alipay",
        },
    })

    // 记录处理耗时
    duration := float64(time.Since(startTime).Milliseconds())
    orderProcessDuration.Record(duration, mmetric.Option{
        Attributes: mmetric.AttributeMap{
            "order_type": "normal",
        },
    })
}
```

## 配置 Provider

与 `mtrace` 类似，`mmetric` 默认也不会将数据发送到任何地方。您需要配置一个 `Provider` 来对接您的监控后端。

`otelmetric` 是 Maltose 提供的基于 OpenTelemetry 的 `Provider` 实现。

```go
// main.go
import (
    "github.com/graingo/maltose/contrib/metric/otelmetric"
    "github.com/graingo/maltose/os/mmetric"
)

func main() {
    // 初始化 OTLP Metric Provider
    // 这通常在您应用启动时完成
    provider, err := otelmetric.New(otelmetric.Config{
        Endpoint: "localhost:4317", // OTLP Collector 的地址
        Insecure: true,
    })
    if err != nil {
        panic(err)
    }

    // 将创建的 provider 设置为全局 provider
    mmetric.SetProvider(provider)

    // 在应用退出时，需要关闭 provider 来确保所有缓冲的指标都已发送
    defer provider.Shutdown(context.Background())

    // ... 启动您的 mhttp 服务器和业务逻辑 ...
}
```

配置好 `Provider` 后，所有由框架自动采集的指标和您自定义的业务指标，都将被发送到指定的监控后端。
