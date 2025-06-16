# 配置管理

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

## 适配器 (Adapter)

`mcfg` 的核心是 `Adapter` 接口，它定义了配置源的行为。默认使用的是文件适配器 `AdapterFile`。

```go
// Adapter 接口定义
type Adapter interface {
	Get(ctx context.Context, pattern string) (any, error)
	Data(ctx context.Context) (map[string]any, error)
    Available(ctx context.Context, resource ...string) bool
    MergeConfigMap(ctx context.Context, data map[string]any) error
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

## 配置加载钩子 (Hooks)

配置钩子（Hook）提供了一种强大的机制，允许您在配置数据从适配器（如文件、Nacos）加载后，但在最终返回给应用程序之前，对其进行拦截和处理。这对于实现配置的动态修改、数据校验、解密或从多个来源合并配置等高级场景非常有用。

`mcfg` 支持两种类型的钩子：

1.  **无状态钩子 (`ConfigHookFunc`)**: 一个简单的函数，适用于不需要跨次调用保持状态的简单数据转换。
2.  **有状态钩子 (`StatefulHook`)**: 一个接口，其实现可以拥有自己的内部状态（如缓存、`sync.Once`）。这是处理需要缓存结果的昂贵操作（如网络请求）的推荐方式，可以避免使用全局变量，使代码更整洁、更易于测试。

### 最佳实践：使用 StatefulHook 实现远程配置引导

一个非常常见的场景是：使用本地配置文件来存储远程配置中心（如 Nacos）的连接信息，然后在应用启动时，连接到配置中心，拉取业务配置，并将其与本地配置合并。

`StatefulHook` 是实现此需求的完美方案。

#### 1. 定义 `StatefulHook` 实现

我们创建一个 `NacosHook` 结构体，它实现了 `mcfg.StatefulHook` 接口，并将所有与 Nacos 相关的状态（`sync.Once`, 缓存的数据和错误）都封装在内部。

```go
// file: internal/logic/hook/nacos.go

package hook

import (
	"context"
	"fmt"
	"sync"

	"github.com/graingo/maltose/contrib/config/nacos"
	"github.com/nacos-group/nacos-sdk-go/v2/common/constant"
	"github.com/nacos-group/nacos-sdk-go/v2/vo"
	"github.com/spf13/viper"
)

// NacosHook 实现了 mcfg.StatefulHook 接口.
// 它封装了从 Nacos 获取配置的逻辑，并使用内部状态来缓存结果，确保昂贵的网络操作只执行一次。
type NacosHook struct {
	once sync.Once
	data map[string]any
	err  error
}

// Hook 是接口的实现. 它在首次调用时从 Nacos 获取配置，
// 并在后续调用中返回缓存的数据，然后与传入的本地配置进行合并。
func (nh *NacosHook) Hook(ctx context.Context, data map[string]any) (map[string]any, error) {
	nh.once.Do(func() {
		nacosConfigMap, ok := data["nacos"]
		if !ok {
			// 如果本地配置中没有 nacos 节点, 初始化为空 map 并直接返回
			nh.data = make(map[string]any)
			return
		}

		cfg, ok := nacosConfigMap.(map[string]any)
		if !ok {
			nh.err = fmt.Errorf("'nacos' config is not a valid map")
			return
		}

		// 此处可以添加更健壮的类型断言和错误处理
		// serverConfigs := []constant.ServerConfig{ ... }
		// clientConfig := constant.ClientConfig{ ... }
		// configParam := vo.ConfigParam{ ... }

		// 创建 Nacos 适配器
		// nacosAdapter, err := nacos.New(ctx, nacos.Config{ ... })
		// if err != nil {
		// 	nh.err = fmt.Errorf("failed to create nacos adapter: %w", err)
		// 	return
		// }

		// 从 Nacos 获取远程配置并缓存在 NacosHook 实例的字段中
		// remoteData, err := nacosAdapter.Data(ctx)
		// if err != nil {
		// 	nh.err = fmt.Errorf("failed to fetch data from nacos: %w", err)
		// 	return
		// }
		// nh.data = remoteData
	})

	if nh.err != nil {
		return nil, nh.err
	}

	// 每次调用都执行合并逻辑
	v := viper.New()
	_ = v.MergeConfigMap(data)   // 1. 合并本地配置
	_ = v.MergeConfigMap(nh.data) // 2. 将缓存的 Nacos 配置覆盖上去

	return v.AllSettings(), nil
}
```

#### 2. 注册钩子

在您的应用初始化逻辑中（例如 `main.go` 或 `cmd/root.go` 的 `init` 函数），将 `NacosHook` 的实例注册到 `mcfg`。

```go
import (
    "my-app/internal/logic/hook"
    "github.com/graingo/maltose/os/mcfg"
)

func init() {
    // ... 其他初始化代码 ...

    // 注册钩子时，传入 NacosHook 的一个新实例
	mcfg.RegisterAfterLoadHook(&hook.NacosHook{})
}
```

通过这种模式，您可以用一种非常优雅和健壮的方式扩展配置加载逻辑，而不会污染全局作用域，也无需修改框架的核心代码。
