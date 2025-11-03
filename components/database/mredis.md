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
    pool_size: 10 # 连接池大小
    # 慢查询阈值，超过该值会被 mlog 记录为 Warn 级别日志
    slow_threshold: "20ms"
```

### 配置参数详解

以下是 `mredis` 支持的完整配置参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `address` | string | - | Redis 服务器地址，格式为 `host:port` |
| `password` | string | `""` | Redis 密码，无密码则留空 |
| `db` | int | `0` | Redis 数据库索引（0-15） |
| `pool_size` | int | `10 * CPU核心数` | 连接池大小 |
| `min_idle_conns` | int | `0` | 最小空闲连接数 |
| `max_idle_conns` | int | `0` | 最大空闲连接数（0 表示与 pool_size 相同） |
| `max_active_conns` | int | `0` | 最大活跃连接数（0 表示无限制） |
| `conn_max_idle_time` | duration | `5m` | 连接最大空闲时间 |
| `conn_max_lifetime` | duration | `0` | 连接最大生存时间（0 表示不限制） |
| `pool_timeout` | duration | `4s` | 从连接池获取连接的超时时间 |
| `dial_timeout` | duration | `5s` | 连接 Redis 的超时时间 |
| `read_timeout` | duration | `3s` | 读取超时时间 |
| `write_timeout` | duration | `3s` | 写入超时时间 |
| `max_retries` | int | `3` | 命令失败时的最大重试次数 |
| `min_retry_backoff` | duration | `8ms` | 最小重试间隔 |
| `max_retry_backoff` | duration | `512ms` | 最大重试间隔 |
| `slow_threshold` | duration | `20ms` | 慢查询阈值，超过该值的命令会被记录为 Warn 日志 |
| `logger` | object | - | 独立的日志配置（可选，无则使用全局日志配置） |

**配置说明**：

- **连接池配置**：
  - `pool_size` 控制最大连接数，默认为 CPU 核心数的 10 倍
  - `min_idle_conns` 保持一定数量的空闲连接，可以提升响应速度
  - `pool_timeout` 控制获取连接的超时时间，避免在高并发时长时间等待

- **超时配置**：
  - `dial_timeout` 控制建立连接的超时
  - `read_timeout`/`write_timeout` 控制读写操作的超时
  - 建议根据实际网络环境和 Redis 负载调整这些参数

- **重试配置**：
  - `max_retries` 控制失败重试次数
  - 重试间隔会在 `min_retry_backoff` 和 `max_retry_backoff` 之间指数增长

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

## 常见应用场景

### 字符串操作 - 缓存和计数器

```go
ctx := context.Background()
rdb := m.Redis()

// 设置缓存
err := rdb.Set(ctx, "user:123", `{"name":"张三","age":25}`, 10*time.Minute).Err()

// 获取缓存
val, err := rdb.Get(ctx, "user:123").Result()

// 计数器
count, err := rdb.Incr(ctx, "page:views").Result()
```

### 哈希操作 - 存储对象

```go
// 存储用户对象的各个字段
rdb.HSet(ctx, "user:123", "name", "张三")
rdb.HSet(ctx, "user:123", "age", 25)

// 批量设置
rdb.HMSet(ctx, "user:123", map[string]interface{}{
    "name": "张三",
    "age":  25,
    "city": "北京",
})

// 获取所有字段
userMap, err := rdb.HGetAll(ctx, "user:123").Result()
```

### 列表操作 - 队列和栈

```go
// 左侧推入（队列头部插入）
rdb.LPush(ctx, "tasks", "task1", "task2", "task3")

// 右侧弹出（从队列尾部取出）- FIFO 队列
task, err := rdb.RPop(ctx, "tasks").Result()

// 阻塞式弹出（等待新元素）
task, err = rdb.BRPop(ctx, 5*time.Second, "tasks").Result()
```

### 集合操作 - 标签和去重

```go
// 添加标签
rdb.SAdd(ctx, "user:123:tags", "golang", "redis", "database")

// 获取所有标签
tags, err := rdb.SMembers(ctx, "user:123:tags").Result()

// 交集（共同标签）
common, err := rdb.SInter(ctx, "user:123:tags", "user:456:tags").Result()
```

### 有序集合 - 排行榜

```go
// 添加分数
rdb.ZAdd(ctx, "rank:game", &redis.Z{
    Score:  1000,
    Member: "player1",
})

// 获取排行榜前 10
topPlayers, err := rdb.ZRevRange(ctx, "rank:game", 0, 9).Result()

// 获取玩家排名（从 0 开始）
rank, err := rdb.ZRevRank(ctx, "rank:game", "player1").Result()

// 获取玩家分数
score, err := rdb.ZScore(ctx, "rank:game", "player1").Result()
```

### 发布/订阅

```go
// 发布消息
err := rdb.Publish(ctx, "notifications", "新消息通知").Err()

// 订阅频道
pubsub := rdb.Subscribe(ctx, "notifications")
defer pubsub.Close()

// 接收消息
ch := pubsub.Channel()
for msg := range ch {
    fmt.Printf("收到消息: %s\n", msg.Payload)
}
```

### 分布式锁（基础版）

```go
// 尝试获取锁
lockKey := "lock:resource:123"
locked, err := rdb.SetNX(ctx, lockKey, "1", 10*time.Second).Result()

if !locked {
    // 锁已被占用
    return errors.New("资源被锁定")
}

// 确保释放锁
defer rdb.Del(ctx, lockKey)

// 执行业务逻辑
// ...
```

**注意**：以上是最简化的分布式锁示例。生产环境建议使用成熟的分布式锁库（如 Redsync）或使用 **msync** 的并发控制工具。

### 限流器（基础版）

```go
// 简单的计数器限流
func RateLimit(userID string) error {
    key := "rate:" + userID
    count, err := rdb.Incr(ctx, key).Result()

    if err != nil {
        return err
    }

    // 第一次访问，设置过期时间
    if count == 1 {
        rdb.Expire(ctx, key, time.Minute)
    }

    // 检查是否超过限制（每分钟 100 次）
    if count > 100 {
        return errors.New("请求过于频繁")
    }

    return nil
}
```

**更强大的并发控制**：对于生产环境的复杂并发控制场景（如分布式锁、限流器、请求合并等），建议使用 Maltose 的 **msync** 工具包，它提供了更健壮的实现和更多高级特性。

**更多并发控制能力，请参考** → [并发控制](./concurrency.md)
