# 全局对象

为简化开发，Maltose 框架提供了一个特殊的全局包 `m`，它作为所有核心组件实例的统一入口。这一设计借鉴了 [GoFrame 的 g 对象](https://goframe.org/docs/core/g)，旨在提供最便捷的开发体验。

通过 `m` 包，您可以轻松获取任何核心组件的默认或具名实例，而无需关心它们的初始化和单例管理。

## 使用方法

在您的项目中，只需 `import` `github.com/graingo/maltose/frame/m` 包，即可通过 `m.` 前缀访问所有核心组件。

```go
import "github.com/graingo/maltose/frame/m"

// 使用 m.Log() 获取默认日志组件
m.Log().Info(ctx, "This is a log message.")

// 使用 m.DB() 获取默认数据库实例
var user User
err := m.DB().WithContext(ctx).First(&user, 1).Error
```

## 核心对象

以下是 `m` 包中提供的常用对象获取方法：

### `m.Server()`

获取 `mhttp` HTTP 服务器的实例。

```go
// 获取默认服务器实例
s := m.Server()
s.GET("/", func(r *mhttp.Request) {
    r.Response.Write("hello")
})
s.Run()
```

### `m.Config()`

获取 `mcfg` 配置管理组件的实例。

```go
// 获取默认配置 (config/config.yaml)
port, _ := m.Config().Get(ctx, "server.port")
m.Log().Infof(ctx, "Server port: %d", port.Int())

// 获取具名配置 (config/redis.yaml)
redisHost, _ := m.Config("redis").Get(ctx, "host")
m.Log().Infof(ctx, "Redis host: %s", redisHost.String())
```

### `m.Log()`

获取 `mlog` 日志组件的实例。

```go
// 获取默认 logger 并打印日志
m.Log().Info(ctx, "用户登录成功")

// 获取名为 "access" 的 logger
m.Log("access").Info(ctx, "访问日志")
```

### `m.DB()`

获取 `mdb` 数据库 ORM 的实例。

```go
// 获取默认数据库实例并查询
var user User
err := m.DB().WithContext(ctx).Where("name = ?", "maltose").First(&user).Error

// 获取 "user" 数据库实例
// (需要在配置文件中定义 database.user)
err = m.DB("user").WithContext(ctx).First(&user).Error
```

### `m.Redis()`

获取 `mredis` Redis 客户端的实例。

```go
// 获取默认 Redis 实例
err := m.Redis().Set(ctx, "mykey", "myvalue", time.Minute).Err()

// 获取 "cache" Redis 实例
// (需要在配置文件中定义 redis.cache)
err = m.Redis("cache").Get(ctx, "mykey").Err()
```

## 关于 `mcache`

`mcache` 组件的设计稍有不同。它自身提供了包级别的函数（如 `mcache.Get`, `mcache.Set`），这些函数操作的是一个默认的、基于内存的全局缓存实例。这种设计是为了让最基础的缓存使用场景变得极其简单。

```go
// 直接使用包级函数，操作默认的内存缓存
mcache.Set(ctx, "my-key", "my-value", time.Minute)
val, _ := mcache.Get(ctx, "my-key")
```

如果需要使用 Redis 或其他介质作为缓存，您需要手动创建 `mcache` 实例并为其提供一个适配器，此时便不通过 `m` 包来获取。

通过 `m` 全局对象，Maltose 将组件的复杂初始化和生命周期管理过程完全封装，让开发者可以更专注于业务逻辑的实现。
