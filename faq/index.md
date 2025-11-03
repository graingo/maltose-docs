# 常见问题 (FAQ)

### Q: Maltose 和 Go-Frame (GF) 是什么关系？

**A:** Maltose 在设计哲学和分层思想上深度参考了 [Go-Frame](https://goframe.org)，特别是其工程化的目录结构、模块化的组件设计以及面向接口的开发模式。然而，Maltose 并非 GF 的封装或分支。Maltose 在底层技术选型上更为轻量，例如 Web 框架基于 Gin（而非 GF 自研的 ghttp），ORM 基于 GORM（而非 GF 的 gorm），配置和日志组件也选择了 Logrus 等社区广泛认可的库。

您可以将 Maltose 看作是 "GF 的设计思想" + "Gin 生态" 的一个实践，旨在提供一个同样强大但更易于上手和定制的开发框架。

### Q: Maltose 和 Gin 是什么关系？

**A:** Maltose 的 Web 服务核心 (`mhttp`) 是基于 [Gin](https://github.com/gin-gonic/gin) 构建的。我们没有重新发明轮子，而是选择站在巨人的肩膀上，继承了 Gin 的高性能 Radix 树路由和广泛的中间件生态。

在 Gin 的基础上，Maltose 提供了更高级别的抽象和封装，例如：

- 结构化的配置驱动服务器。
- 与 `mlog`, `mtrace`, `mmetric` 等可观测性组件的深度集成。
- 标准化的路由注册、分组和控制器绑定流程。
- 统一的请求/响应模型和错误处理机制。

### Q: 如何在 Maltose 中使用 WebSocket？

**A:** 由于 `mhttp` 基于 Gin，您可以直接使用社区中成熟的 Gin WebSocket 中间件或库。一个常见的做法是，在 Controller 中，将 HTTP 请求升级（Upgrade）为 WebSocket 连接，然后进行后续处理。

```go
import (
    "github.com/gorilla/websocket"
    "github.com/graingo/maltose/net/mhttp"
)

var upgrader = websocket.Upgrader{
    // ... 配置，例如 CheckOrigin
}

func WsHandler(r *mhttp.Request) {
    // 将 HTTP 连接升级为 WebSocket 连接
    conn, err := upgrader.Upgrade(r.Writer, r.Request, nil)
    if err != nil {
        // 处理错误
        return
    }
    defer conn.Close()

    // 开始 WebSocket 的读写循环
    for {
        mt, message, err := conn.ReadMessage()
        if err != nil {
            // 处理读错误，通常意味着连接已关闭
            break
        }

        // ... 处理收到的消息 ...

        // 将消息写回客户端
        err = conn.WriteMessage(mt, message)
        if err != nil {
            // 处理写错误
            break
        }
    }
}
```

### Q: 如何自定义框架的错误响应格式？

**A:** 框架默认的响应格式是由 `mhttp.MiddlewareResponse()` 中间件控制的。如果您想完全替换它，可以移除这个中间件，并编写您自己的响应处理中间件。

您的自定义中间件可以：

1.  调用 `r.Next()` 执行业务逻辑。
2.  检查 `r.Response.GetError()` 是否有错误。
3.  根据错误类型（是否为 `*merror.Error`）来构建您自己的 JSON 结构。
4.  使用 `r.SetJson()` 或类似方法将最终的响应写入 `http.ResponseWriter`。

### Q: 我该如何为一个 Logic/Service 编写单元测试？

**A:** 请参考我们的 [测试指南](../advanced/testing.md#单元测试)，其中详细介绍了如何利用 Mock 技术（如 `gomock`）来解耦依赖，从而对业务逻辑进行独立的单元测试。

### Q: 数据库连接池应该如何配置？连接数设置多少合适？

**A:** 连接池配置取决于您的应用负载和数据库服务器性能。以下是一些经验法则：

**基本配置**:
```yaml
database:
  max_idle_connection: 10    # 空闲连接数
  max_open_connection: 100   # 最大连接数
  max_idle_time: "30m"       # 连接最大空闲时间
  max_lifetime: "1h"         # 连接最大生存时间
```

**配置建议**:
- **max_open_connection**: 根据公式 `(核心数 * 2) + 有效磁盘数` 估算。例如 4 核 CPU + 1 块磁盘 = 10 个连接。但实际要根据 QPS 和数据库性能调整。对于云数据库，不要超过其最大连接数限制。
- **max_idle_connection**: 通常设置为 `max_open_connection` 的 25%-50%。太小会频繁创建连接，太大会占用资源。
- **max_lifetime**: 建议设置为 1-2 小时，避免长时间持有连接导致数据库端资源泄漏。
- **max_idle_time**: 建议设置为 30 分钟，及时释放空闲连接。

**性能优化**:
- 如果看到 "too many connections" 错误，降低 `max_open_connection` 或增加数据库最大连接数。
- 如果连接创建频繁（查看 `database/sql` 的 `WaitCount` 指标），增加 `max_idle_connection`。
- 使用 [read-write splitting](../components/database/mdb.md#读写分离) 分散读负载到从库。

### Q: 如何排查慢查询？SlowThreshold 是什么作用？

**A:** Maltose 的 `mdb` 组件会自动记录慢查询日志。

**配置慢查询阈值**:
```yaml
database:
  slow_threshold: "500ms"  # 超过 500ms 的查询会被记录
```

**慢查询日志示例**:
```
WARN  [2025-11-03 14:23:45] Slow SQL Query
  duration: 1.234s
  rows: 1523
  sql: SELECT * FROM users WHERE created_at > ? ORDER BY id DESC
```

**排查步骤**:
1. **启用慢查询日志**: 确保 `database.logger.level` 设置为 `info` 或 `debug`。
2. **分析日志**: 查看 `duration` 和 `sql` 字段，找出耗时操作。
3. **优化查询**:
   - 添加索引: `CREATE INDEX idx_created_at ON users(created_at)`
   - 限制返回字段: `SELECT id, name FROM users` 而不是 `SELECT *`
   - 添加分页: `LIMIT 100 OFFSET 0`
   - 使用 `EXPLAIN` 分析查询计划
4. **动态调整阈值**: 在开发环境可以设置更小的值（如 `100ms`）来发现潜在问题。

**性能监控**:
- 配合 `mtrace` 查看查询在整个请求链路中的耗时占比。
- 使用 `database/sql` 的内置指标监控连接池状态。

### Q: Redis 慢命令如何监控和优化？

**A:** 与数据库类似，`mredis` 也会自动记录慢命令。

**配置慢命令阈值**:
```yaml
redis:
  default:
    slow_threshold: "20ms"  # 超过 20ms 的命令会被记录
```

**动态调整阈值**:
```go
// 在运行时调整慢命令阈值
m.Redis().SetSlowThreshold(10 * time.Millisecond)
```

**常见慢命令及优化**:
1. **KEYS 命令**: 永远不要在生产环境使用 `KEYS *`，它会阻塞 Redis。改用 `SCAN` 命令。
   ```go
   // ❌ 错误: 会阻塞 Redis
   keys, _ := redis.Keys(ctx, "*user*").Result()

   // ✅ 正确: 使用 SCAN
   iter := redis.Scan(ctx, 0, "*user*", 100).Iterator()
   for iter.Next(ctx) {
       key := iter.Val()
       // 处理 key
   }
   ```

2. **大 Key 操作**: 避免存储超过 1MB 的值。如果是集合类型（List, Set, Hash），元素数不要超过 10000。

3. **Pipeline 优化**: 批量操作时使用 Pipeline。
   ```go
   pipe := redis.Pipeline()
   for i := 0; i < 100; i++ {
       pipe.Set(ctx, fmt.Sprintf("key:%d", i), i, 0)
   }
   pipe.Exec(ctx)  // 一次性执行所有命令
   ```

4. **避免大范围查询**: `LRANGE`, `SMEMBERS`, `HGETALL` 等命令在数据量大时会很慢，使用分页或限制返回数量。

### Q: 生产环境如何优雅地管理配置？是否支持热更新？

**A:** Maltose 的 `mcfg` 支持多种配置管理方式。

**推荐的生产配置实践**:

1. **配置文件 + 环境变量组合**:
   ```yaml
   # config/config.yaml
   database:
     host: "${DB_HOST:127.0.0.1}"     # 优先使用环境变量 DB_HOST，默认 127.0.0.1
     port: "${DB_PORT:3306}"
     password: "${DB_PASSWORD}"        # 敏感信息必须用环境变量
   ```

2. **使用 Kubernetes ConfigMap 和 Secret**:
   ```yaml
   # ConfigMap for config.yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: app-config
   data:
     config.yaml: |
       server:
         address: ":8080"
   ---
   # Secret for sensitive data
   apiVersion: v1
   kind: Secret
   metadata:
     name: app-secret
   stringData:
     DB_PASSWORD: your-secure-password
   ```

3. **配置热更新**:
   框架目前**不支持自动热更新配置**。如果配置变更，需要重启服务。推荐的做法是：
   - 使用 Kubernetes Rolling Update 无缝更新
   - 对于特定配置项（如慢查询阈值），使用动态方法:
     ```go
     // 通过 API 动态调整（需要自行实现接口）
     func UpdateSlowThreshold(threshold time.Duration) {
         db := m.DB()
         sqlDB, _ := db.DB()
         // GORM 不直接支持，但可以通过重连实现
     }

     // Redis 支持动态调整
     m.Redis().SetSlowThreshold(newThreshold)
     ```

4. **多环境配置**: 使用不同的配置文件:
   ```bash
   # 开发环境
   go run . -c config/config.dev.yaml

   # 生产环境
   go run . -c config/config.prod.yaml
   ```

### Q: 如何监控应用性能和排查问题？

**A:** Maltose 提供了完整的可观测性方案。

**1. 链路追踪 (mtrace)**:
追踪请求在分布式系统中的完整路径。参考 [链路追踪文档](../components/observability/tracing/index.md)。

```yaml
# config/config.yaml
trace:
  enable: true
  protocol: "grpc"
  endpoint: "localhost:4317"  # Jaeger 或 OTLP Collector
```

**使用场景**:
- 定位慢请求：查看哪个服务、哪个数据库查询耗时最长。
- 分析调用链：了解服务间的依赖关系。
- 排查错误：查看错误发生的上下文。

**2. 指标监控 (mmetric + Prometheus)**:
实时监控应用指标。参考 [指标监控文档](../components/observability/metrics/index.md)。

```go
// 自定义业务指标
counter := mmetric.Counter("orders.created", "Total orders created")
counter.Inc(ctx, mmetric.Labels{"status": "success"})
```

**常用指标**:
- HTTP 请求量、延迟、错误率
- 数据库连接池状态
- Redis 命令执行情况
- 自定义业务指标（订单量、支付金额等）

**3. 结构化日志 (mlog)**:
基于 Zap 的高性能日志。参考 [日志文档](../components/logging.md)。

```go
// 结构化日志便于查询
mlog.Info(ctx, "User login",
    "user_id", userID,
    "ip", clientIP,
    "duration", duration,
)
```

**最佳实践**:
- **TraceID 自动注入**: 框架会自动在日志中注入 TraceID，将日志和链路关联。
- **使用 ELK/Loki 聚合日志**: 将所有服务的日志集中到一个平台查询。
- **日志分级**: 开发环境用 `debug`，生产环境用 `info`，减少日志量。

**4. 健康检查**:
```go
// 在 Controller 中暴露健康检查接口
func HealthCheck(r *mhttp.Request) {
    // 检查数据库连接
    if err := m.DB().Ping(ctx); err != nil {
        r.Response.WriteStatusExit(500, mhttp.Json{
            "status": "unhealthy",
            "database": "down",
        })
        return
    }

    r.Response.WriteJson(mhttp.Json{
        "status": "healthy",
    })
}
```

### Q: 框架是否支持微服务架构？如何实现服务间通信？

**A:** Maltose 主要定位于**单体应用和中小型微服务**场景。

**当前支持的微服务特性**:

1. **HTTP RESTful API**: 服务间通过 HTTP 通信。
   ```go
   // 使用标准 http.Client 或第三方库调用其他服务
   resp, err := http.Post("http://user-service/api/v1/users", ...)
   ```

2. **完整的可观测性**:
   - `mtrace` 支持跨服务的链路追踪
   - `mmetric` 可以上报到 Prometheus
   - `mlog` 输出结构化日志

3. **标准化的 OpenAPI 文档**: 使用 `maltose gen openapi` 生成 API 文档，便于服务间集成。

4. **健康检查和优雅停机**: 便于集成到 Kubernetes。

**不直接支持但可扩展**:
- **gRPC**: 框架不内置 gRPC，但您可以在项目中集成 [grpc-go](https://github.com/grpc/grpc-go)。
- **服务注册与发现**: 可以集成 Consul、Etcd、Nacos 等。
- **消息队列**: 可以集成 RabbitMQ、Kafka、NATS 等实现异步通信。

**推荐架构**:
- **单体优先**: 对于大多数项目，从单体开始，享受 Maltose 的完整开发体验。
- **API 网关**: 如果是多服务架构，使用 Kong、Traefik 等网关统一入口。
- **混合方式**: 核心业务用 Maltose 构建 RESTful 服务，性能敏感部分用 gRPC。

**示例：调用其他服务并传递 TraceContext**:
```go
import "go.opentelemetry.io/otel"

func CallUserService(ctx context.Context, userID int) (*User, error) {
    // 创建带链路追踪的 HTTP 请求
    req, _ := http.NewRequestWithContext(ctx, "GET",
        fmt.Sprintf("http://user-service/users/%d", userID), nil)

    // OTel 会自动注入 traceparent header
    resp, err := http.DefaultClient.Do(req)
    // ...
}
```
