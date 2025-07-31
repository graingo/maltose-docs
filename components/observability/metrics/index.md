# 指标监控

`mmetric` 是 Maltose 框架提供的指标监控组件。它基于 OpenTelemetry 标准，旨在与框架的其他部分深度集成，并能轻松对接各种主流的监控后端系统。

## 设计思路

Maltose 的指标功能被设计为一个**健壮的抽象层 (`mmetric`)**，也称为**门面模式（Facade Pattern）**。它通过定义一套稳定的内部接口，将 OpenTelemetry 的具体实现细节完全隐藏起来，从而**隔离**了多样化且易变的监控后端生态。

我们推荐您在阅读本章节前，先了解其背后的设计思想。

[<card heading="深入了解 `mmetric` 的设计思路" icon="i-heroicons-light-bulb" color="indigo" to="./design.md" />](./design.md)

## 核心优势

- **统一抽象接口**: 提供了 `Counter`、`UpDownCounter` 和 `Histogram` 等标准化的指标类型接口，将业务代码与底层实现解耦。
- **可插拔后端**: 采用提供者模式，使得底层实现可以被替换。Maltose 提供了 `otlpmetric` 包，支持通过 gRPC 或 HTTP 协议将指标导出到 OpenTelemetry Collector。
- **自动化采集**: 框架核心组件（如 `mhttp`、`mclient`）会自动采集关键指标，如请求总数、活跃请求数、请求耗时等，无需手动埋点。
- **多维度标签 (Attributes)**: 所有的指标采集都支持附带多维度的标签，方便在监控系统中进行聚合和筛选。

## 自动化采集支持

Maltose 框架为以下组件提供了开箱即用的自动指标采集支持：

| 组件            | 自动指标采集 |
| :-------------- | :----------- |
| **HTTP Server** | ✅           |
| **HTTP Client** | ✅           |

## 指标类型

- **Counter (计数器)**: 一个只增不减的单调值，用于统计请求总数、错误总数等。
- **UpDownCounter (升降计数器)**: 一个可以增加也可以减少的值，用于统计当前活跃的请求数、队列中的任务数等。
- **Histogram (直方图)**: 用于统计数据的分布情况，例如请求耗时的分布（P95, P99 等）。

## 快速开始

Maltose 提供了一个 `otlpmetric` 包，用于快速初始化和配置 OpenTelemetry OTLP Exporter。下面的示例将展示如何结合使用 `otlpmetric` 和 `mmetric`。

### 1. 安装依赖

```bash
go get github.com/graingo/maltose/contrib/metric/otlpmetric
```

### 2. 初始化与使用

在应用启动时，调用 `otlpmetric.Init()` 来配置并注册全局的 `MeterProvider`。一旦初始化完成，您就可以在项目的任何地方通过 `mmetric` 的辅助函数（如 `mmetric.NewMustCounter`）来定义和使用指标。

```go
package main

import (
	"context"
	"log"
	"time"

	"github.com/graingo/maltose/contrib/metric/otlpmetric"
	"github.com/graingo/maltose/os/mmetric"
	"go.opentelemetry.io/otel/attribute"
)

// 1. 在包级别定义指标，确保只创建一次
var (
	orderCounter = mmetric.NewMustCounter(
		"orders.created.total", // 指标名称
		mmetric.MetricOption{
			Help: "Total number of created orders",
			Unit: "1", // "1" 表示这是一个计数
		},
	)
)

func main() {
	// 2. 使用 otlpmetric 初始化全局 MeterProvider
	//    它会创建一个 OTLP exporter，并将其注册为全局提供者。
	//    参数: OpenTelemetry Collector 的 gRPC 地址。
	shutdown, err := otlpmetric.Init("localhost:4317",
		otlpmetric.WithServiceName("my-order-service"),
		otlpmetric.WithServiceVersion("1.0.0"),
		otlpmetric.WithExportInterval(5*time.Second), // 设置导出间隔
	)
	if err != nil {
		log.Fatalf("初始化指标失败: %v", err)
	}
	defer shutdown(context.Background())

	// 3. 模拟业务逻辑并使用指标
	log.Println("开始处理订单...")
	// 启动一个 goroutine 持续创建订单
	go func() {
		for {
			createOrder(context.Background(), "alipay")
			time.Sleep(time.Second)
		}
	}()

	log.Println("订单处理服务正在运行... 按 Ctrl+C 退出。")
	// 阻塞主 goroutine，以便程序持续运行
	select {}
}

func createOrder(ctx context.Context, channel string) {
	// ... 业务逻辑 ...

	// 增加计数器的值，并附带标签
	orderCounter.Inc(ctx, mmetric.WithAttributes(
		attribute.String("payment_channel", channel),
		attribute.String("order_type", "normal"),
	))
	log.Printf("创建了一笔新订单，支付渠道: %s\n", channel)
}
```

## 核心 API 概览

| 函数/方法                                 | 说明                                                |
| :---------------------------------------- | :-------------------------------------------------- |
| `mmetric.NewMustCounter(name, opt)`       | 创建一个 `Counter` 指标，如果失败则 panic。         |
| `mmetric.NewMustUpDownCounter(name, opt)` | 创建一个 `UpDownCounter` 指标，如果失败则 panic。   |
| `mmetric.NewMustHistogram(name, opt)`     | 创建一个 `Histogram` 指标，如果失败则 panic。       |
| `metric.Inc(ctx, opts...)`                | (UpDown)Counter 的方法，增加计数。                  |
| `metric.Add(ctx, value, opts...)`         | (UpDown)Counter 的方法，增加一个指定的值。          |
| `metric.Dec(ctx, opts...)`                | UpDownCounter 的方法，减少计数。                    |
| `metric.Record(value, opts...)`           | Histogram 的方法，记录一个值。                      |
| `mmetric.WithAttributes(attrs...)`        | 用于为单次指标操作附加临时的属性（标签）。          |
| `mmetric.SetProvider(provider)`           | 设置全局的 `MeterProvider`。                        |
| `mmetric.NewProvider(...)`                | 创建一个新的 `MeterProvider` (对 OTel SDK 的封装)。 |
