# 指标监控模块 (mmetric)

`mmetric` 是 Maltose 框架的指标监控模块，它提供了对应用性能和业务指标的收集、聚合和导出功能。该模块基于 OpenTelemetry 构建，支持多种指标类型和多种监控系统集成。

## 主要特性

- 多种指标类型：计数器、上下计数器、直方图
- 自定义标签支持
- 与 OpenTelemetry 生态集成
- 多种后端导出支持 (Prometheus, OTLP 等)
- 低性能开销
- 插件化设计，支持扩展
- 全局和命名实例管理

## 指标类型

`mmetric` 支持以下几种常见的指标类型：

1. **计数器 (Counter)**：只增不减的累计值，用于记录如请求数、错误数等
2. **上下计数器 (UpDownCounter)**：可增可减的值，用于记录如当前连接数、队列长度等
3. **直方图 (Histogram)**：记录值的分布情况，用于请求延迟、响应大小等

## 快速开始

### 基本用法

```go
package main

import (
    "context"
    "time"

    "github.com/graingo/maltose/os/mmetric"
)

func main() {
    // 初始化 Prometheus 提供器
    provider := mmetric.NewPrometheusProvider(mmetric.PrometheusConfig{
        Namespace: "my_app",
        Port:      9090,
    })
    defer provider.Shutdown(context.Background())

    // 设置为全局提供器
    mmetric.SetProvider(provider)

    // 创建一个计量器
    meter := mmetric.GetProvider().Meter(mmetric.MeterOption{
        Instrument:        "user_service",
        InstrumentVersion: "v1.0.0",
    })

    // 创建一个计数器
    requestCounter := meter.MustCounter("requests_total", mmetric.MetricOption{
        Help: "请求总数",
        Unit: "1",
    })

    // 创建一个直方图
    responseTime := meter.MustHistogram("response_time", mmetric.MetricOption{
        Help:    "响应时间",
        Unit:    "ms",
        Buckets: []float64{5, 10, 25, 50, 100, 250, 500, 1000},
    })

    // 模拟请求和记录指标
    ctx := context.Background()
    for i := 0; i < 100; i++ {
        start := time.Now()

        // 模拟处理请求
        time.Sleep(time.Duration(50+i) * time.Millisecond)

        // 增加请求计数
        requestCounter.Inc(ctx, mmetric.Option{
            Attributes: mmetric.AttributeMap{
                "method": "GET",
                "path":   "/api/users",
            },
        })

        // 记录响应时间
        duration := time.Since(start).Milliseconds()
        responseTime.Record(float64(duration), mmetric.Option{
            Attributes: mmetric.AttributeMap{
                "method": "GET",
                "path":   "/api/users",
            },
        })
    }

    // 让服务保持运行，以便可以获取指标
    select {}
}
```

### 添加属性标签

```go
package main

import (
    "context"

    "github.com/graingo/maltose/os/mmetric"
)

func main() {
    // 简化设置，省略提供器初始化
    meter := mmetric.GetProvider().Meter(mmetric.MeterOption{
        Instrument: "order_service",
        Attributes: mmetric.Attributes{
            "service": "order",
            "version": "v1",
        },
    })

    // 创建计数器，带有默认标签
    orderCounter := meter.MustCounter("orders_total", mmetric.MetricOption{
        Help: "订单总数",
        Attributes: mmetric.Attributes{
            "type": "all",
        },
    })

    ctx := context.Background()

    // 记录不同类型的订单
    orderCounter.Inc(ctx, mmetric.Option{
        Attributes: mmetric.AttributeMap{
            "status": "completed",
            "region": "east",
        },
    })

    orderCounter.Inc(ctx, mmetric.Option{
        Attributes: mmetric.AttributeMap{
            "status": "pending",
            "region": "west",
        },
    })
}
```

### 与 HTTP 服务集成

```go
package main

import (
    "context"
    "time"

    "github.com/graingo/maltose/frame/mins"
    "github.com/graingo/maltose/net/mhttp"
    "github.com/graingo/maltose/os/mmetric"
)

func main() {
    // 初始化 Prometheus 提供器
    provider := mmetric.NewPrometheusProvider(mmetric.PrometheusConfig{
        Namespace: "web_app",
        Port:      9090,
    })
    mmetric.SetProvider(provider)

    // 创建计量器和指标
    meter := provider.Meter(mmetric.MeterOption{Instrument: "http_server"})
    requestCounter := meter.MustCounter("http_requests_total", mmetric.MetricOption{
        Help: "HTTP请求总数",
    })
    requestDuration := meter.MustHistogram("http_request_duration_ms", mmetric.MetricOption{
        Help:    "HTTP请求处理时间",
        Unit:    "ms",
        Buckets: []float64{5, 10, 25, 50, 100, 250, 500, 1000},
    })

    // 创建HTTP服务
    server := mins.Server()

    // 添加指标中间件
    server.Use(func(c *mhttp.Context) {
        start := time.Now()

        // 请求处理前
        path := c.Request.URL.Path
        method := c.Request.Method

        // 处理请求
        c.Next()

        // 请求处理后
        duration := time.Since(start).Milliseconds()
        status := c.Writer.Status()

        // 记录请求计数
        requestCounter.Inc(c.Request.Context(), mmetric.Option{
            Attributes: mmetric.AttributeMap{
                "method": method,
                "path":   path,
                "status": status,
            },
        })

        // 记录处理时间
        requestDuration.Record(float64(duration), mmetric.Option{
            Attributes: mmetric.AttributeMap{
                "method": method,
                "path":   path,
                "status": status,
            },
        })
    })

    // 注册路由
    server.BindHandler("GET:/hello", func(c *mhttp.Context) {
        time.Sleep(time.Millisecond * 50) // 模拟处理耗时
        c.String(200, "Hello World")
    })

    // 启动服务
    server.Run(context.Background(), ":8080")
}
```

## 查看和分析指标

使用 `mmetric` 模块生成的指标可以通过多种方式查看和分析：

1. **Prometheus**：访问 `/metrics` 端点获取指标数据
2. **Grafana**：使用 Grafana 连接 Prometheus 数据源创建可视化仪表盘
3. **OpenTelemetry Collector**：使用 OTLP 协议将指标发送到收集器
4. **其他监控系统**：支持自定义导出器适配其他监控系统

## 常见使用场景

- **HTTP 服务器指标**：请求计数、请求延迟、错误率等
- **数据库操作指标**：查询计数、查询延迟、连接池使用等
- **业务指标**：订单数、用户注册数、活跃用户等
- **系统资源指标**：CPU 使用率、内存使用率、磁盘 I/O 等
- **自定义业务指标**：特定于应用程序的关键指标

## 下一步

在接下来的章节中，我们将详细介绍：

- [基础指标](/docs/obs/metric/basic) - 系统和应用基础指标收集
- [自定义指标](/docs/obs/metric/custom) - 如何定义和使用自定义业务指标
- [仪表盘](/docs/obs/metric/dashboard) - 如何创建和使用指标仪表盘
