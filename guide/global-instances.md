# 全局对象

Maltose 提供了 `frame/m` 包作为核心组件的统一入口。它负责获取默认实例或具名实例，减少手动初始化样板代码。

这些对象通常会在首次访问时按配置延迟创建。配置缺失或外部连接初始化失败会直接暴露错误，因此应在启动阶段主动访问并做健康检查，不要等到第一个业务请求才发现问题。

## 使用方式

```go
import "github.com/graingo/maltose/frame/m"
```

## 常用对象

### `m.Server()`

```go
s := m.Server()
s.GET("/", func(r *mhttp.Request) {
    r.String(200, "hello")
})
s.Run()
```

### `m.Config()`

```go
ctx := context.Background()

appName, _ := m.Config().Get(ctx, "app.name")
fmt.Println(appName.String())
```

### `m.Log()`

```go
ctx := context.Background()

m.Log().Infof(ctx, "user %s login", "alice")
m.Log().Infow(ctx, "user login", mlog.String("user", "alice"))
```

### `m.DB()`

```go
ctx := context.Background()

var user User
err := m.DB().WithContext(ctx).
    Where("name = ?", "maltose").
    First(&user).
    Error
```

### `m.DBContext()`

```go
ctx := context.Background()

var user User
err := m.DBContext(ctx).
    Where("id = ?", 1).
    First(&user).
    Error
```

### `m.Redis()`

```go
ctx := context.Background()

if err := m.Redis().SetEX(ctx, "mykey", "myvalue", time.Minute); err != nil {
    panic(err)
}

val, err := m.Redis().Get(ctx, "mykey")
if err != nil {
    panic(err)
}
if val != nil {
    fmt.Println(val.String())
}
```

## 具名实例

`Server`、`Config`、`Log`、`DB`、`Redis` 都支持具名实例。

```go
cache := m.Redis("cache")
accessLogger := m.Log("access")
reportDB := m.DB("report")
```

## 关于 `mcache`

`mcache` 不通过 `m` 包暴露默认实例，而是直接提供包级方法：

```go
mcache.Set(ctx, "my-key", "my-value", time.Minute)
val, _ := mcache.Get(ctx, "my-key")
```

## 使用建议

- 中小型项目里，直接使用全局对象通常已经足够。
- 如果你在做高强度单元测试或复杂依赖替换，建议把全局对象包在自己的 service 层里，减少直接耦合。
- 可复用库不要隐式依赖 `m`，应通过参数接收所需接口或实例。
- 显式 `New` 创建的数据库、Redis 和遥测 Provider 由调用方负责关闭；可使用 `m.WithShutdownHook` 纳入应用退出流程。

`m` 门面、组件构造函数和生命周期之间的关系见[组件设计哲学](../faq/design-philosophy)。
