# 配置管理模块 (mcfg)

`mcfg` 是 Maltose 框架的配置管理模块，它提供了灵活而强大的配置加载和管理能力。该模块支持多种配置源，包括文件、环境变量等，并且具有实例管理、配置热更新等特性。

## 主要特性

- 支持多种配置文件格式 (YAML, JSON, TOML)
- 基于 Viper 构建，兼容 Viper 的特性
- 命名实例管理，支持多配置源
- 配置项路径查询 (如 `database.master.host`)
- 适配器接口，支持自定义配置源
- 配置钩子机制，支持配置加载后的处理
- 层级配置目录扫描

## 快速开始

### 基本用法

```go
package main

import (
    "context"
    "fmt"

    "github.com/graingo/maltose/os/mcfg"
)

func main() {
    // 获取配置实例
    cfg := mcfg.Instance()

    // 获取配置项
    ctx := context.Background()

    // 获取字符串配置
    serverHost, err := cfg.Get(ctx, "server.host")
    if err != nil {
        panic(err)
    }
    fmt.Println("Server Host:", serverHost.String())

    // 获取整数配置，带默认值
    serverPort, err := cfg.Get(ctx, "server.port", 8080)
    if err != nil {
        panic(err)
    }
    fmt.Println("Server Port:", serverPort.Int())

    // 获取嵌套配置
    dbUser, err := cfg.Get(ctx, "database.master.username")
    if err != nil {
        panic(err)
    }
    fmt.Println("Database User:", dbUser.String())

    // 获取完整配置数据
    allConfig, err := cfg.Data(ctx)
    if err != nil {
        panic(err)
    }
    fmt.Printf("All Config: %+v\n", allConfig)
}
```

### 使用命名配置实例

```go
package main

import (
    "context"
    "fmt"

    "github.com/graingo/maltose/os/mcfg"
)

func main() {
    // 默认配置实例
    defaultCfg := mcfg.Instance()

    // 特定命名的配置实例 (将尝试加载 app.yaml 文件)
    appCfg := mcfg.Instance("app")

    ctx := context.Background()

    // 从不同配置实例获取配置
    serverName, _ := defaultCfg.Get(ctx, "server.name")
    appName, _ := appCfg.Get(ctx, "name")

    fmt.Println("Server Name:", serverName.String())
    fmt.Println("App Name:", appName.String())
}
```

### 注册配置钩子

配置钩子允许在配置加载后对配置数据进行处理：

```go
package main

import (
    "context"
    "fmt"
    "os"

    "github.com/graingo/maltose/os/mcfg"
)

func init() {
    // 注册配置钩子，用于处理环境变量替换
    mcfg.RegisterAfterLoadHook(func(ctx context.Context, data map[string]interface{}) (map[string]interface{}, error) {
        // 处理数据库配置中的环境变量
        if dbConfig, ok := data["database"].(map[string]interface{}); ok {
            if _, ok := dbConfig["password"]; ok && dbConfig["password"] == "${DB_PASSWORD}" {
                dbConfig["password"] = os.Getenv("DB_PASSWORD")
            }
        }
        return data, nil
    })
}

func main() {
    cfg := mcfg.Instance()
    ctx := context.Background()

    // 配置钩子会在数据加载时自动应用
    dbPassword, _ := cfg.Get(ctx, "database.password")
    fmt.Println("Database Password:", dbPassword.String())
}
```

### 自定义配置适配器

实现自定义配置源：

```go
package main

import (
    "context"

    "github.com/graingo/maltose/os/mcfg"
)

// 远程配置适配器
type RemoteAdapter struct {
    endpoint string
    cache    map[string]interface{}
}

// 创建远程配置适配器
func NewRemoteAdapter(endpoint string) *RemoteAdapter {
    return &RemoteAdapter{
        endpoint: endpoint,
        cache:    make(map[string]interface{}),
    }
}

// 实现 Adapter 接口方法
func (a *RemoteAdapter) Get(ctx context.Context, pattern string) (interface{}, error) {
    // 实现从远程获取配置的逻辑
    // ...
    return nil, nil
}

func (a *RemoteAdapter) Data(ctx context.Context) (map[string]interface{}, error) {
    // 实现从远程获取所有配置的逻辑
    // ...
    return a.cache, nil
}

func (a *RemoteAdapter) Available(ctx context.Context, resource ...string) bool {
    // 检查配置源是否可用
    // ...
    return true
}

func main() {
    // 创建远程适配器
    remoteAdapter := NewRemoteAdapter("https://config-server.example.com/api/config")

    // 使用远程适配器创建配置
    cfg := mcfg.NewWithAdapter(remoteAdapter)

    // 使用配置
    // ...
}
```

## 下一步

在接下来的章节中，我们将详细介绍：

- [配置加载](/docs/core/mcfg/loading) - 配置文件加载方式与搜索路径
- [配置获取](/docs/core/mcfg/getting) - 不同类型配置项的获取方法
- [配置热更新](/docs/core/mcfg/hot-reload) - 动态监听和更新配置
- [适配器](/docs/core/mcfg/adapters) - 自定义配置源的实现
