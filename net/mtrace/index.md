# 分布式追踪 (mtrace)

`mtrace` 是 Maltose 框架的分布式追踪组件，集成了 OpenTelemetry，用于实现全链路监控。

## 特性

- OpenTelemetry 集成
- 支持多个追踪后端
- 自动注入追踪上下文
- 完整的链路追踪
- Baggage 支持

## 基本概念

### 什么是分布式追踪

分布式追踪是一种监控和诊断分布式系统的方法，它通过跟踪请求在系统中的流动路径，帮助开发者理解系统行为和定位问题。

### 核心概念

- **Span**：表示一个操作的单元，如一个 API 调用或数据库查询
- **Trace**：由多个 Span 组成的树状结构，表示一个完整的请求处理流程
- **Context Propagation**：在服务间传递追踪上下文
- **Baggage**：随追踪上下文一起传递的键值对数据

## 集成 OpenTelemetry

Maltose 的 `mtrace` 组件基于 OpenTelemetry 实现，OpenTelemetry 是一个开源的可观测性框架，提供了用于收集、处理和导出遥测数据的 API、库和代理。

### 使用内置的追踪中间件

Maltose HTTP 服务器已经内置了追踪中间件，默认情况下会自动启用：

```go
// internalMiddlewareServerTrace 是内部使用的追踪中间件
func internalMiddlewareServerTrace() MiddlewareFunc {
    return func(r *Request) {
        // ... 追踪处理逻辑
    }
}
```

## Baggage 功能

Baggage 是一种在分布式系统的上下文中传播键值对数据的机制，它允许将自定义数据（如用户 ID、请求 ID 等）附加到跟踪中，并在服务调用之间传播。

### 创建和使用 Baggage

```go
import (
    "context"
    "github.com/graingo/maltose/net/mtrace"
)

func handler(ctx context.Context) {
    // 创建新的 Baggage
    b := mtrace.NewBaggage(ctx)

    // 设置单个值
    ctx = b.SetValue("userId", "123456")

    // 批量设置值
    ctx = b.SetMap(map[string]interface{}{
        "requestId": "abcdef",
        "tenantId": "tenant1",
    })

    // 获取 baggage 值
    values := mtrace.NewBaggage(ctx).GetMap()
    userId := values["userId"]

    // 获取特定 baggage 值
    userIdVar := mtrace.NewBaggage(ctx).GetVar("userId")

    // 使用更新后的上下文进行后续操作
    doSomethingWithContext(ctx)
}
```

## 使用贡献组件配置追踪

Maltose 提供了 `contrib/trace/otlphttp` 包，用于简化 OpenTelemetry 的配置：

```go
import (
    "github.com/graingo/maltose/contrib/trace/otlphttp"
)

func main() {
    // 初始化 OTLP HTTP 导出器
    // 参数: 服务名称, 收集器地址, 收集器路径
    shutdown, err := otlphttp.Init("my-service", "localhost:4318", "/v1/traces")
    if err != nil {
        panic(err)
    }
    defer shutdown(context.Background())

    // ... 启动服务器等操作
}
```

## 进阶主题

- [Baggage 详解](/net/mtrace/baggage) - 了解如何使用 Baggage 传递上下文数据
- [Span 管理](/net/mtrace/span) - 学习如何创建和管理 Span

## 最佳实践

- 为重要的业务操作创建自定义 Span
- 使用 Baggage 传递关键业务上下文
- 为 Span 添加适当的属性和事件，但避免过度添加影响性能
- 在生产环境中，考虑使用采样来减少追踪数据量
