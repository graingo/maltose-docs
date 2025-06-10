# 配置管理 (mcfg)

`mcfg` 是 Maltose 框架提供的配置管理组件，它基于 [Viper](https://github.com/spf13/viper) 构建，并提供了更简洁的、面向实例的接口和可扩展的适配器模式。

## 特性

- **多格式支持**: 默认支持 `yaml`、`json`、`toml`、`ini` 等多种常见配置文件格式。
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

您可以通过 `mcfg.Instance()` 获取默认的配置实例，并使用 `Get` 方法来读取配置项。

```go
package main

import (
    "context"
    "fmt"
    "github.com/graingo/maltose/os/mcfg"
)

func main() {
    ctx := context.Background()

    // 获取默认配置实例
    cfg := mcfg.Instance()

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

## 多实例管理

如果您的项目需要加载多个配置文件，可以使用 `Instance(name)` 来获取具名的配置实例。

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
redisCfg := mcfg.Instance("redis")

redisHost, _ := redisCfg.Get(ctx, "host")
fmt.Println("Redis Host:", redisHost.String()) // 输出: 127.0.0.1
```

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

您可以实现自己的 `Adapter` 来对接不同的配置中心，例如 Nacos。

```go
// 这是一个简化的 Nacos 适配器示例
type NacosAdapter struct {
    // ... Nacos client and config ...
}

func (a *NacosAdapter) Get(ctx context.Context, pattern string) (any, error) {
    // 从 Nacos 获取配置
}

func (a *NacosAdapter) Data(ctx context.Context) (map[string]any, error) {
    // 从 Nacos 获取所有配置
}
// ...

// 使用自定义适配器
nacosAdapter := &NacosAdapter{ ... }
customCfg := mcfg.NewWithAdapter(nacosAdapter)

// 后续使用与默认配置完全一致
value, _ := customCfg.Get(ctx, "some.key.from.nacos")
```

Maltose 在 `contrib/config` 中已经提供了一些常用的配置中心适配器，您可以直接使用。
