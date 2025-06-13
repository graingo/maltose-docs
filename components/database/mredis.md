# Redis

`mredis` 是 Maltose 框架中用于与 Redis 交互的组件。它基于 [go-redis](https://github.com/redis/go-redis) 库进行封装，提供了配置驱动的实例管理和自动化的可观测性集成，让在 Maltose 项目中使用 Redis 变得简单而高效。

## 特性

- **配置驱动**: Redis 的连接参数（地址、密码、DB、连接池等）都通过统一的配置进行管理。
- **实例管理**: 支持通过名称管理多个 Redis 连接实例，方便连接到不同的 Redis 服务。
- **可观测性集成**:
  - **链路追踪**: 自动将每一条 Redis 命令作为一个 `Span` 加入到 OpenTelemetry 的调用链路中，方便追踪性能。
  - **日志记录**: 命令的执行（特别是慢命令）可以被 `mlog` 系统记录，并自动关联 `TraceID`。
- **上下文感知**: 所有操作都接收 `context.Context`，能与框架的链路追踪和超时控制无缝集成。

## 快速上手

### 1. 配置文件

首先，在您的配置文件（如 `config/config.yaml`）中添加 `mredis` 的配置。

```yaml
# file: config.yaml
redis:
  default: # 默认实例的名称
    address: "127.0.0.1:6379"
    password: "" # 密码，如果没有则留空
    db: 0 # 数据库编号
    poolSize: 10 # 连接池大小
    # 慢查询阈值，超过该值会被 mlot 记录为 Warn 级别日志
    slowThreshold: "20ms"
```

### 2. 获取 Redis 实例

通过 `m` 包的 `Redis()` 方法获取实例并使用。

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/graingo/maltose/frame/m"
)

func main() {
    ctx := context.Background()

    // 1. 获取默认的 redis 实例
    // m.Redis() 内部会自动读取 "redis.default" 配置并初始化
    rdb, err := m.Redis() // 不传参数获取 "default" 实例
    if err != nil {
        panic(err)
    }

    // 2. 使用 rdb 对象进行操作，用法与 go-redis 完全兼容
    err = rdb.Set(ctx, "my-key", "my-value", 10*time.Second).Err()
    if err != nil {
        panic(err)
    }

    val, err := rdb.Get(ctx, "my-key").Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("my-key:", val)
}
```

## 多实例管理

如果需要连接多个不同的 Redis 服务，您可以在配置文件中定义多个实例，并使用 `m.Redis(name)` 来获取它们。

### 配置示例

```yaml
# file: config.yaml
redis:
  default:
    address: "127.0.0.1:6379"
    db: 0
  cache: # 名为 "cache" 的实例
    address: "127.0.0.1:6379"
    db: 1 # 使用不同的 db
```

### 代码调用

```go
// 获取名为 "cache" 的实例
// m.Redis("cache") 内部会自动读取 "redis.cache" 配置
cacheRdb, err := m.Redis("cache")
if err != nil {
    // ...
}

// 使用该实例进行操作
cacheRdb.Set(ctx, "cache-key", "cache-value", time.Minute)
```

## 日志与链路追踪

`mredis` 最强大的功能之一就是与框架的可观测性组件无缝集成。您无需任何额外代码，即可获得以下能力：

- **链路追踪**: 每次调用 Redis 命令（如 `GET`, `SET`, `HGETALL`），`mredis` 都会在当前的调用链路下创建一个新的 `Span`。这个 `Span` 会记录命令的名称、参数以及执行耗时，让您可以在 Jaeger 或 Zipkin 等平台上清晰地看到每一次 Redis 交互的性能细节。

- **日志集成**: 所有执行的 Redis 命令都会被 `mlog` 记录为 `Debug` 级别的日志。如果某条命令的执行时间超过了您在配置中定义的 `slowThreshold`（慢查询阈值），日志级别会自动提升为 `Warn`，提醒您关注潜在的性能问题。所有这些日志都会自动包含当前请求的 `TraceID`，方便您进行问题排查。

这些开箱即用的功能，极大地提升了基于 Redis 的业务应用的可维护性和问题定位效率。
