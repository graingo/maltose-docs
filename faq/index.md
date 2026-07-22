# 常见问题

本页优先回答会阻塞开发的实际问题。组件的完整 API 和配置项请查阅[手册](../components/)，架构选择请参阅[设计哲学](./design-philosophy)。

## 快速定位

| 现象 | 先看这里 |
| --- | --- |
| 新项目无法编译、提示不能导入 `internal` 包 | [生成项目的 import path 没有更新](#为什么-maltose-new-生成的项目无法导入-internal-包) |
| 启动后请求直接 panic | [模板仍有 `implement me`](#为什么-quickstart-启动后请求会-panic) |
| 配置没有生效 | [配置文件加载规则](#为什么配置文件没有生效) |
| `m.DB()` 或 `m.Redis()` 初始化失败 | [检查实例配置](#为什么-mdb-或-mredis-初始化失败) |
| 错误响应状态码与预期不同 | [标准响应规则](#错误响应会返回-200-吗) |
| Trace、Metric 没有上报 | [显式初始化 exporter](#为什么写了-trace-或-metric-配置却没有数据) |
| SQL 或 Redis 操作变慢 | [数据访问排查](#如何排查慢-sql) |

## 启动与配置

### 为什么 `maltose new` 生成的项目无法导入 `internal` 包？

当前 CLI 会更新 `go.mod` 的 module path，但不会同步改写模板 Go 文件中的 `github.com/graingo/maltose-quickstart` import。Go 会因此把这些 import 当作另一个 module，并触发 `internal` 包访问限制。

生成项目后，在 IDE 中将模板原 module 前缀全局替换为 `go.mod` 第一行声明的 module path，然后执行：

```bash
go mod tidy
go test ./...
```

### 为什么 quickstart 启动后请求会 panic？

quickstart 是项目骨架，生成的 Controller 方法可能仍包含：

```go
panic("implement me")
```

请求接口前先完成对应 Controller。可直接跟随[快速上手](../guide/getting-started)实现 `Hello` 示例。

### 为什么配置文件没有生效？

按以下顺序检查：

1. 默认实例会在常用配置目录中查找 `config.yaml`、`config.yml`、`config.json` 或 `config.toml`。
2. 具名配置 `m.Config("redis")` 会优先查找对应的 `redis.*` 文件。
3. 文件适配器不会展开 `${DB_HOST:default}` 之类的环境变量表达式。
4. 自定义 Adapter 必须在 `m.Server()`、`m.DB()`、`m.Redis()` 等组件首次读取配置前设置。

显式选择配置文件的方式：

```go
adapter, err := mcfg.NewAdapterFile()
if err != nil {
	panic(err)
}
if err := adapter.SetFile(os.Getenv("APP_CONFIG")); err != nil {
	panic(err)
}
m.Config().SetAdapter(adapter)
```

```bash
APP_CONFIG=config/config.prod.yaml go run .
```

默认文件适配器不监听磁盘变化。远程适配器是否能实时看到更新，取决于其监听和缓存策略。完整说明见[配置管理](../components/configuration)。

### 为什么 `m.DB()` 或 `m.Redis()` 初始化失败？

`m.DB()` 和 `m.Redis()` 是配置驱动的应用实例。首次调用时如果找不到配置或连接失败，会直接暴露初始化错误。

默认实例可以使用扁平结构：

```yaml
database:
  type: mysql
  host: 127.0.0.1
  port: "3306"
  user: root
  password: secret
  db_name: app
```

也可以使用具名结构：

```yaml
database:
  default:
    type: mysql
    dsn: root:secret@tcp(127.0.0.1:3306)/app?parseTime=true
```

确认配置后，再检查网络、账号权限和数据库是否可用。数据库生成命令读取 `.env`，应用运行时读取 `mcfg`，两者是不同配置源。

## HTTP 与响应

### 错误响应会返回 `200` 吗？

启用 `mhttp.MiddlewareResponse()` 后，框架会同时返回业务码和对应的 HTTP 状态码：

| 业务错误 | HTTP 状态码 |
| --- | ---: |
| 参数校验失败 | `400` |
| 未认证 | `401` |
| 无权限 | `403` |
| 未找到 | `404` |
| 其他内部错误 | `500` |

成功响应使用 `200`。详见[标准响应](../components/server/standard-response)和[错误处理](../advanced/error-handling)。

### 如何自定义响应格式？

不要挂载 `MiddlewareResponse()`，改为注册自己的响应中间件。自定义中间件应在 `r.Next()` 后检查响应是否已经写出，再处理错误或 Controller 返回值：

```go
func CustomResponse() mhttp.MiddlewareFunc {
	return func(r *mhttp.Request) {
		r.Next()
		if r.Writer.Written() {
			return
		}
		if len(r.Errors) > 0 {
			err := r.Errors.Last().Err
			r.JSON(http.StatusInternalServerError, map[string]any{
				"success": false,
				"message": err.Error(),
			})
			return
		}
		r.JSON(http.StatusOK, map[string]any{
			"success": true,
			"data":    r.GetHandlerResponse(),
		})
	}
}
```

`mhttp.Server` 仍有一个始终启用的基础响应兜底；只要自定义中间件已经写出响应，基础兜底就会跳过。

### 是否支持 WebSocket？

支持。`mhttp.Request` 内嵌 Gin Context，可将 `r.Writer` 和 `r.Request` 交给 `gorilla/websocket` 等库完成 Upgrade。框架不提供单独的 WebSocket 协议封装，连接生命周期、并发写入和 Origin 校验由应用负责。

## 数据库、Redis 与缓存

### 数据库连接池应该设置多大？

不存在适用于所有应用的固定公式。建议先确定数据库允许的总连接数，并为各服务实例预留连接预算，再结合 `database/sql.DBStats` 调整：

- `WaitCount`、`WaitDuration` 持续增长：连接可能不足，或 SQL 本身过慢。
- `OpenConnections` 长期接近上限：检查并发、事务和慢查询。
- 空闲连接频繁归零又快速增长：可以适当增加 `max_idle_connection`。

```yaml
database:
  max_idle_connection: 10
  max_open_connection: 100
  max_idle_time: 10s
  max_lifetime: 0s
```

这些是框架默认值，不是生产环境推荐值。生产值应通过压测和运行指标确定。

### 如何排查慢 SQL？

配置 `slow_threshold` 后，超过阈值的查询会记录 `sql slow` 日志，主要字段为 `elapsed_ms`、`rows` 和 `sql`：

```yaml
database:
  slow_threshold: 500ms
  logger:
    level: info
```

排查顺序通常是：确认请求 Trace → 找到 `sql slow` → 使用 `EXPLAIN`/`EXPLAIN ANALYZE` → 检查索引、扫描行数、锁等待和返回数据量。

### Redis 的 `KEYS`、`Clear` 可以在生产使用吗？

不建议对大数据集使用 `KEYS *`。`mcache` Redis Adapter 的 `Keys`、`Values`、`Data` 等全局操作可能扫描整个 DB，`Clear` 会清空当前 DB。生产环境应为缓存分配独立 Redis DB，并优先使用 `SCAN`：

```go
iter := m.Redis().Client().Scan(ctx, 0, "user:*", 100).Iterator()
for iter.Next(ctx) {
	key := iter.Val()
	// 分批处理 key
}
if err := iter.Err(); err != nil {
	return err
}
```

不要用固定的“1 MB”或“1 万元素”作为所有场景的绝对边界；应结合序列化成本、网络延迟、Redis 慢日志和内存占用确定阈值。

## 可观测性

### 为什么写了 `trace` 或 `metric` 配置却没有数据？

配置文件不会自动创建 exporter。应用启动时必须显式初始化 OTLP Trace 和 Metric Provider，并在退出时调用 shutdown：

```go
traceShutdown, err := otlptrace.Init(
	"localhost:4317",
	otlptrace.WithServiceName("my-service"),
)
if err != nil {
	panic(err)
}
defer traceShutdown(context.Background())

metricShutdown, err := otlpmetric.Init(
	"localhost:4317",
	otlpmetric.WithServiceName("my-service"),
)
if err != nil {
	panic(err)
}
defer metricShutdown(context.Background())
```

随后才能创建自定义指标：

```go
counter := mmetric.NewMustCounter(
	"orders.created",
	mmetric.NewMetricOption().WithHelp("Total created orders"),
)
counter.Inc(ctx, mmetric.WithAttributes(attribute.String("status", "success")))
```

OTLP 数据通常由 OpenTelemetry Collector 再转发到 Jaeger、Prometheus 等后端。详见[链路追踪](../components/observability/tracing/)和[指标监控](../components/observability/metrics/)。

### 框架自带健康检查吗？

有。`mhttp.Server` 默认注册 `/health`，返回 `{"status":"ok"}`，适合作为基础存活检查。它不会检查数据库、Redis 等下游依赖；如果需要 readiness 语义，应单独实现依赖检查接口，避免把短暂的下游抖动直接等同于进程死亡。

## 工具链与架构边界

### `maltose gen model` 和 `gen dao` 从哪里读取数据库配置？

这两个命令从项目根目录的 `.env` 读取数据库连接，而应用运行时从 `mcfg` 读取 `config.*`。建议由同一套部署变量生成两份配置，避免环境漂移。其他命令和参数见 [CLI 命令参考](../cli/commands)。

### Maltose 和 GoFrame、Gin 是什么关系？

Maltose 参考了 GoFrame 的工程化思路，但不是 GoFrame 的封装或分支。HTTP 层基于 Gin，数据库层基于 GORM；Maltose 在其上提供配置驱动的实例管理、分层约定、代码生成和可观测性集成。

### Maltose 适合微服务吗？

Maltose 适合单体应用和以 HTTP 为主的中小型服务。框架提供 HTTP、配置、数据库、Redis、日志、Trace、Metric、健康检查和优雅停机；不内置服务注册、gRPC Server、消息队列或 API 网关。这些能力可以在应用中按需集成，跨服务传播 TraceContext 时优先使用 `mclient` 或 OpenTelemetry Propagator。
