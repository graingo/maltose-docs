# Redis

`mredis` 是 Maltose 对 `go-redis` 的轻量封装。它提供配置驱动的实例管理、自动链路追踪和慢命令日志，但公开的便捷方法并不是完整的 `go-redis` API 子集。

如果遇到当前包装层未暴露的命令，可以通过 `Client()` 直接拿到底层 `redis.UniversalClient`。

## 特性

- 通过 `redis` 配置节点创建默认实例和具名实例
- 自动接入 OpenTelemetry tracing
- 慢命令日志可直接复用 `mlog`
- 常用字符串、哈希、列表、集合、有序集合和通用命令已封装
- 可随时回退到底层原生 `go-redis` 客户端

## 配置示例

```yaml
redis:
  default:
    address: "127.0.0.1:6379"
    db: 0
    pool_size: 10
    dial_timeout: "5s"
    read_timeout: "3s"
    write_timeout: "3s"
    slow_threshold: "20ms"

  cache:
    address: "127.0.0.1:6379"
    db: 1

logger:
  level: "info"
  stdout: true
```

## 快速上手

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
    rdb := m.Redis()

    if err := rdb.SetEX(ctx, "my-key", "my-value", 10*time.Second); err != nil {
        panic(err)
    }

    val, err := rdb.Get(ctx, "my-key")
    if err != nil {
        panic(err)
    }
    if val != nil {
        fmt.Println("my-key:", val.String())
    }
}
```

## 多实例

```go
ctx := context.Background()

cache := m.Redis("cache")
if err := cache.Set(ctx, "feature:flag", "enabled"); err != nil {
    panic(err)
}
```

## 当前公开的便捷方法

### 字符串

| 方法 | 说明 |
| --- | --- |
| `Set(ctx, key, value)` | 设置值，不带过期时间 |
| `SetEX(ctx, key, value, duration)` | 设置值并附带过期时间 |
| `Get(ctx, key)` | 读取字符串，返回 `*mvar.Var` |
| `MSet(ctx, data)` | 批量写入 |
| `MGet(ctx, keys...)` | 批量读取 |
| `SetNX(ctx, key, value, duration)` | 不存在时写入 |

### 哈希

| 方法 | 说明 |
| --- | --- |
| `HSet(ctx, key, fields)` | 批量写入哈希字段 |
| `HGet(ctx, key, field)` | 读取单个哈希字段 |

### 列表

| 方法 | 说明 |
| --- | --- |
| `LPush(ctx, key, values...)` | 左侧写入 |
| `RPop(ctx, key)` | 右侧弹出 |

### 集合

| 方法 | 说明 |
| --- | --- |
| `SAdd(ctx, key, members...)` | 添加集合成员 |
| `SIsMember(ctx, key, member)` | 判断成员是否存在 |

### 有序集合

| 方法 | 说明 |
| --- | --- |
| `ZAdd(ctx, key, members...)` | 添加有序集合成员 |
| `ZScore(ctx, key, member)` | 查询分数 |

### 通用命令

| 方法 | 说明 |
| --- | --- |
| `Del(ctx, keys...)` | 删除键 |
| `Exists(ctx, keys...)` | 判断键是否存在 |
| `Expire(ctx, key, duration)` | 设置过期时间 |
| `Keys(ctx, pattern)` | 按模式查询键 |
| `TTL(ctx, key)` | 查询剩余 TTL |
| `DBSize(ctx)` | 当前库键数量 |
| `FlushDB(ctx)` | 清空当前库 |
| `Ping(ctx)` | 连通性检查 |
| `Close()` | 关闭连接 |
| `SetSlowThreshold(duration)` | 动态调整慢命令阈值 |

## 使用原生客户端

当你需要 `SMembers`、`Publish`、`Subscribe`、`Scan`、`Pipeline` 等尚未包装的方法时，直接使用底层客户端即可。

```go
ctx := context.Background()
client := m.Redis().Client()

members, err := client.SMembers(ctx, "tags:user:123").Result()
if err != nil {
    panic(err)
}

fmt.Println(members)
```

## 常见示例

### 作为缓存使用

```go
ctx := context.Background()
rdb := m.Redis()

cached, err := rdb.Get(ctx, "user:123")
if err != nil {
    return err
}
if cached != nil {
    fmt.Println("cache hit:", cached.String())
    return nil
}

if err := rdb.SetEX(ctx, "user:123", `{"name":"alice"}`, 5*time.Minute); err != nil {
    return err
}
```

### 简单分布式锁

```go
ctx := context.Background()
rdb := m.Redis()

locked, err := rdb.SetNX(ctx, "lock:order:123", "1", 10*time.Second)
if err != nil {
    return err
}
if !locked {
    return errors.New("resource is locked")
}
defer rdb.Del(ctx, "lock:order:123")
```

### 使用原生 `Scan`

```go
ctx := context.Background()
client := m.Redis().Client()

iter := client.Scan(ctx, 0, "user:*", 100).Iterator()
for iter.Next(ctx) {
    fmt.Println(iter.Val())
}
if err := iter.Err(); err != nil {
    panic(err)
}
```

## 日志与链路追踪

- `mredis` 会自动为 Redis 命令接入 tracing。
- 如果配置了 `slow_threshold`，慢命令会写入 `mlog`。
- 未单独配置 `redis.<name>.logger` 时，会继承全局 `logger` 配置。

## 使用建议

- 日常业务优先使用包装层，代码更统一。
- 需要完整 `go-redis` 能力时，用 `Client()` 访问底层客户端。
- `Keys` 适合排查和后台脚本，不建议在高流量路径上替代 `Scan`。
