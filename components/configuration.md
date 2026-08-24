# 配置管理

`mcfg` 是 Maltose 框架提供的配置管理组件，提供了简洁的、面向实例的接口和可扩展的适配器模式。

## 特性

- **多格式支持**: 默认支持 `yaml`、`json`、`toml` 常见配置文件格式。
- **适配器模式**: 通过 `Adapter` 接口，可以轻松扩展支持其他配置源，如环境变量、远程配置中心（Nacos, Apollo）等。
- **实例管理**: 支持通过不同的名称获取不同的配置实例，方便管理多个配置文件。
- **自动加载**: 默认会自动在 `config` 目录下查找并加载名为 `config.yaml`（或实例名对应的文件）的配置文件。
- **类型安全**: 获取的配置项会被包装为 `*mvar.Var` 类型，可以方便地转换为各种 Go 内置类型。

## 快速上手

`mcfg` 的使用非常直观。假设您在项目根目录下的 `config/config.yaml` 文件中定义了如下配置：

```yaml
# file: config/config.yaml
server:
  name: "my-app"
  port: 9000

database:
  mysql:
    host: "127.0.0.1"
    port: "3306"
```

### 获取配置

您可以通过 `m.Config()` 获取默认的配置实例，并使用 `Get` 方法来读取配置项。

```go
package main

import (
    "context"
    "fmt"
    "github.com/graingo/maltose/frame/m"
)

func main() {
    ctx := context.Background()

    // 获取默认配置实例
    cfg := m.Config()

    // 获取服务端口，并转换为 int 类型
    // Get 方法的第二个参数是默认值，如果配置项不存在则返回默认值
    port, err := cfg.Get(ctx, "server.port", 8080)
    if err != nil {
        panic(err)
    }
    fmt.Println("Server Port:", port.Int()) // 输出: 9000

    // 获取数据库主机地址
    dbHost, err := cfg.Get(ctx, "database.mysql.host")
    if err != nil {
        panic(err)
    }
    fmt.Println("Database Host:", dbHost.String()) // 输出: 127.0.0.1

    // 获取一个不存在的配置，将会使用提供的默认值
    logLevel, err := cfg.Get(ctx, "log.level", "info")
    if err != nil {
        panic(err)
    }
    fmt.Println("Log Level:", logLevel.String()) // 输出: info
}
```

### 类型安全的便捷方法

除了通用的 `Get` 方法，`mcfg` 还提供了一系列类型安全的便捷方法，让您可以直接获取特定类型的配置值：

```go
// 运行阶段推荐显式处理错误
appName, err := cfg.String(ctx, "server.name")
if err != nil {
    panic(err)
}

port, err := cfg.Int(ctx, "server.port")
if err != nil {
    panic(err)
}

// 启动阶段确认错误只能通过 panic 处理时，使用 Must 前缀
debug := cfg.MustGetBool(ctx, "server.debug")
database := cfg.MustGetMap(ctx, "database")
hosts := cfg.MustGetSlice(ctx, "server.allowed_hosts")
```

**优点**：
- 类型安全，直接返回 Go 原生类型
- `String`、`Int`、`Bool`、`Map`、`Slice` 显式返回读取错误
- `MustGetString` 等 `Must` 方法适合应用启动阶段
- 配置项不存在且没有默认值时返回对应类型的零值

旧版的 `GetString`、`GetInt`、`GetBool`、`GetMap`、`GetSlice` 仍然可用，但已废弃；它们等价于对应的 `Must` 方法。

### 配置结构体映射

对于复杂配置，使用 `(*mcfg.Config).Struct()`（通常写作 `cfg.Struct()`）将配置映射到结构体：

```go
// 定义配置结构体
type ServerConfig struct {
    Name    string `yaml:"name"`
    Port    int    `yaml:"port"`
    Debug   bool   `yaml:"debug"`
    Timeout int    `yaml:"timeout"`
}

type AppConfig struct {
    Server   ServerConfig          `yaml:"server"`
    Database map[string]any        `yaml:"database"`
}

// 将配置映射到结构体
var appCfg AppConfig
err := cfg.Struct(ctx, &appCfg, "")
if err != nil {
    panic(err)
}

// 访问配置
fmt.Println("Server Name:", appCfg.Server.Name)
fmt.Println("Server Port:", appCfg.Server.Port)

// 也可以只映射部分配置
var serverCfg ServerConfig
err = cfg.Struct(ctx, &serverCfg, "server")
if err != nil {
    panic(err)
}
```

字段名按 `mconv`、`json`、`yaml` 标签的顺序匹配；没有标签时使用字段名。框架自身的配置结构统一使用 `mconv` 标签，应用结构体也推荐采用同样写法，减少不同序列化标签之间的歧义。

**使用场景**：
- 配置项较多且结构清晰
- 需要类型安全的配置访问
- 希望利用结构体标签进行验证
- 需要在初始化时一次性加载所有配置

## 多实例管理

如果您的项目需要加载多个配置文件，可以使用 `m.Config(name)` 来获取具名的配置实例。

例如，有一个 `config/redis.yaml` 配置文件：

```yaml
# file: config/redis.yaml
host: "127.0.0.1"
port: 6379
```

您可以这样获取它的配置：

```go
// 获取名为 "redis" 的配置实例，
// 它会自动加载 config/redis.yaml 文件
redisCfg := m.Config("redis")

redisHost, _ := redisCfg.Get(ctx, "host")
fmt.Println("Redis Host:", redisHost.String()) // 输出: 127.0.0.1
```

具名实例要求对应配置文件存在；文件缺失或解析失败会在实例首次创建时 panic，适合在启动阶段尽早暴露配置错误。

## 适配器 (Adapter)

`mcfg` 的核心是 `Adapter` 接口，它定义了配置源的行为。默认使用的是文件适配器 `AdapterFile`。

```go
// Adapter 接口定义
type Adapter interface {
    Get(ctx context.Context, pattern string) (any, error)
    Data(ctx context.Context) (map[string]any, error)
    Available(ctx context.Context, resource ...string) bool
}
```

需要对接其他配置源时，实现完整的 `Adapter` 接口并传给 `mcfg.NewWithAdapter`。Apollo 和 Nacos 已有官方 Adapter，直接使用即可，具体见[Apollo 与 Nacos](./remote-configuration)。

### 清除缓存

需要重新执行 Adapter 读取和已注册的 Hook 时，可以清除 Config 的处理结果缓存：

```go
// 清除配置缓存
// 下次读取时会重新执行适配器读取和已注册的加载钩子
cfg.ClearCache(ctx)
```

**使用场景**：
- 开发环境下实现配置热重载
- 配置中心推送了配置更新通知
- 需要强制刷新配置

**注意事项**：
- `ClearCache` 清除的是 `Config` 对处理后数据的缓存，不会让文件适配器自动重新读取磁盘文件；文件内容变化后需重新调用 `AdapterFile.SetFile`
- 生产环境不建议频繁调用，可能影响性能
- 是否会触发远程请求取决于适配器自身的缓存策略

## 远程配置

Apollo 和 Nacos 通过 `contrib/config` 下的 Adapter 接入。连接、监听、缓存刷新和 Scope 装配见[Apollo 与 Nacos](./remote-configuration)。

## 配置加载钩子

Hook 在 Adapter 加载数据后执行，适合补充默认值、解密字段和统一校验。Hook 是进程级能力，并会改变 `mcfg.Config` 的缓存行为；注册时机、刷新规则和测试隔离见[Hook 与缓存](./configuration-hooks)。
