# 缓存 (mcache)

`mcache` 是 Maltose 框架提供的一个高层次、通用的缓存组件。它通过适配器模式（Adapter Pattern）将底层具体的缓存实现（如内存、Redis）与上层缓存接口解耦，使得开发者可以用一套统一的 API 来操作不同的缓存介质。

## 特性

- **统一的 API**: 无论是使用内存还是 Redis，缓存操作的 API 完全一致。
- **适配器模式**: 支持通过适配器轻松切换或扩展缓存实现，默认提供高性能的内存适配器。
- **LRU 淘汰策略**: 默认的内存适配器支持基于 LRU (Least Recently Used) 策略的容量限制和自动淘汰。
- **丰富接口**: 提供了 `Get`, `Set`, `GetOrSet`, `SetIfNotExist`, `Remove` 等一系列丰富的缓存操作接口。
- **包级方法**: 提供了包级别的便捷方法，底层使用一个默认的缓存实例，让简单使用场景的调用更加方便。
- **线程安全**: 内置的内存适配器是线程安全的。

## 快速上手

`mcache` 提供了包级别的函数，可以直接使用，默认使用内存作为缓存。

```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/graingo/maltose/os/mcache"
)

func main() {
    ctx := context.Background()

    // 设置一个缓存，有效期 5 秒
    err := mcache.Set(ctx, "my-key", "my-value", 5*time.Second)
    if err != nil {
        panic(err)
    }
    fmt.Println("Set cache: my-key = my-value")

    // 获取缓存
    val, _ := mcache.Get(ctx, "my-key")
    fmt.Println("Get cache:", val.String()) // 输出: my-value

    // 5秒后再次获取，此时缓存已过期
    time.Sleep(6 * time.Second)
    val, _ = mcache.Get(ctx, "my-key")
    fmt.Println("Get after 6s:", val.IsNil()) // 输出: true
}
```

## 实例与适配器

除了包级方法，您也可以创建自己的缓存实例，这在需要多个缓存或自定义缓存行为时非常有用。

### 使用内存缓存 (带 LRU)

您可以创建一个有容量限制的内存缓存。当缓存项数量超过容量时，最久未被使用的项将会被自动淘汰。

```go
// 创建一个新的内存缓存实例，容量为 1000
cache := mcache.New(1000)

// 使用这个实例进行操作
cache.Set(ctx, "key1", "value1", 0) // 0 表示永不过期
```

### 使用 Redis 缓存

Maltose 在 `contrib/cache/redis` 中提供了 Redis 适配器。您可以为缓存单独创建一个 `mredis` 实例，以获得更好的资源隔离。

```go
import (
    "context"
    "fmt"
    "time"

    "github.com/graingo/maltose/contrib/cache/redis"
    "github.com/graingo/maltose/database/mredis"
    "github.com/graingo/maltose/os/mcache"
)

func main() {
    ctx := context.Background()

    // 1. 为缓存单独创建一个 Redis 客户端，使用独立的 db，避免与其他业务混淆
    redisConfig := &mredis.Config{
        Address: "127.0.0.1:6379",
        Db:      1, // 推荐为缓存使用独立的 db
    }
    redisClient, err := mredis.New(redisConfig)
    if err != nil {
        panic(err)
    }

    // 2. 使用 redis 实例创建 Redis 缓存适配器
    redisAdapter := redis.NewAdapterRedis(redisClient)

    // 3. 使用适配器创建缓存实例
    redisCache := mcache.NewWithAdapter(redisAdapter)

    // 4. 后续使用 API 与内存缓存完全一致
    redisCache.Set(ctx, "user:1", `{"name":"maltose"}`, time.Minute)
    user, _ := redisCache.Get(ctx, "user:1")
    fmt.Println(user.String())
}
```

## 注意事项

### 关于 Clear/Size/Data/Keys/Values 等全局操作

与内存适配器不同，`mcache` 的 Redis 适配器本身没有数据分组的功能。如果多个 `mcache` 实例连接到同一个 Redis DB，它们将会共享这个 DB 内的所有数据。

因此，当您调用 `Clear()`、`Size()`、`Data()`、`Keys()`、`Values()` 这类方法时，它们操作的是整个 Redis DB，而不是像内存缓存那样只操作当前 `mcache` 实例的内部数据。

**警告**: 其中 `Data()`、`Keys()`、`Values()` 方法底层使用了 `KEYS *` 命令，这在生产环境中对大数据量的 Redis 会造成性能问题，甚至阻塞服务。**强烈建议不要在生产环境中使用这些方法**。`Clear()` 方法会清空当前 DB 的所有键值。这些都是与直觉可能相反的行为，请务必谨慎使用。

### 建议为缓存使用独立的 DB

鉴于上述操作的全局性，我们强烈建议您在使用 Redis 作为缓存时，通过配置为其指定一个独立的数据库（例如 `db: 1`, `db: 2`），而不是与其他业务数据（如会话、任务队列等）共用一个默认的 DB (`db: 0`)。这样可以有效隔离不同场景的数据，避免误操作带来的风险。

## 核心接口 `Adapter`

`mcache` 的灵活性来自于它的 `Adapter` 接口。任何实现了该接口的结构体，都可以作为 `mcache` 的底层驱动。

```go
// Adapter 接口定义 (部分)
type Adapter interface {
	Set(ctx context.Context, key string, value interface{}, duration time.Duration) error
	Get(ctx context.Context, key string) (*mvar.Var, error)
	Remove(ctx context.Context, keys ...string) (lastValue *mvar.Var, err error)
    // ... 其他方法
}
```

这使得您可以非常轻松地实现自己的缓存适配器，例如对接 Memcached 或其他第三方缓存服务。
