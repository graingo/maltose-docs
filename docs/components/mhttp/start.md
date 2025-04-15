# 开始使用

`Maltose` 框架提供了高性能、易用的 HTTP 服务组件，由 `mhttp` 模块实现。该模块基于 `Gin` 进行了功能增强和扩展，实现了路由注册、中间件管理、请求处理、响应封装、配置管理等丰富的特性，支持优雅关闭、TLS/HTTPS、静态文件服务等高级功能。

接口文档地址：
https://github.com/graingo/maltose/net/mhttp

## 哈喽世界

我们先从一个简单的 `Hello World` 开始：

```go
package main

import (
    "context"

    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

func main() {
    // 创建一个HTTP服务
    s := m.Server()

    // 绑定路由处理函数
    s.GET("/", func(ctx context.Context, req *mhttp.Request) (res interface{}, err error) {
        return "哈喽世界！", nil
    })

    // 启动服务器
    s.Run()
}
```

这是一个最简单的 Web 服务，默认会监听 `8080` 端口，当访问 http://127.0.0.1:8080/ 时，它会返回 `哈喽世界！`。

在 Maltose 框架中，可以通过 `m.Server()` 方法获取一个默认的 `Server` 对象。该方法采用单例模式设计，多次调用会返回同一个 `Server` 实例。通过 `Run()` 方法可以启动服务监听，默认监听 `8080` 端口。

## 静态文件服务

创建一个支持静态文件的 Web 服务：

```go
package main

import (
    "github.com/graingo/maltose/frame/m"
)

func main() {
    s := m.Server()

    // 设置静态文件服务
    s.SetStaticPath("/static", "/home/www/static")

    // 设置服务器根目录
    s.SetServerRoot("/home/www/public")

    // 启动服务
    s.Run()
}
```

在 Maltose 框架中，可以使用 `SetStaticPath` 方法设置静态文件服务的路径和目录，使用 `SetServerRoot` 方法设置服务器的根目录。

## 端口配置

Maltose 框架支持自定义端口配置：

```go
package main

import (
    "context"

    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

func main() {
    s := m.Server()

    s.GET("/", func(ctx context.Context, req *mhttp.Request) (res interface{}, err error) {
        return "Maltose Framework!", nil
    })

    // 设置监听端口
    s.SetAddress(":8100")

    // 启动服务
    s.Run()
}
```

通过 `SetAddress` 方法可以设置服务器的监听地址和端口。

## 多实例支持

Maltose 框架支持在同一进程中运行多个服务实例：

```go
package main

import (
    "github.com/graingo/maltose/frame/m"
)

func main() {
    // 创建第一个服务实例
    s1 := m.Server("s1")
    s1.SetAddress(":8080")
    s1.SetStaticPath("/static", "/home/www/static1")
    s1.Start()

    // 创建第二个服务实例
    s2 := m.Server("s2")
    s2.SetAddress(":8088")
    s2.SetStaticPath("/static", "/home/www/static2")
    s2.Start()

    // 等待所有服务结束
    m.Wait()
}
```

通过向 `m.Server` 方法传递不同的名称参数，可以创建不同的服务实例。`Start` 方法会在后台启动服务，而 `m.Wait` 方法会等待所有服务结束。

## 路由分组

Maltose 框架提供了强大的路由分组功能，可以方便地管理 API 路由：

```go
package main

import (
    "context"

    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

func main() {
    s := m.Server()

    // 创建API路由分组
    api := s.Group("/api")

    // v1版本分组
    v1 := api.Group("/v1")
    v1.GET("/users", func(ctx context.Context, req *mhttp.Request) (res interface{}, err error) {
        return []string{"用户1", "用户2"}, nil
    })

    // v2版本分组
    v2 := api.Group("/v2")
    v2.GET("/users", func(ctx context.Context, req *mhttp.Request) (res interface{}, err error) {
        return map[string]string{
            "users": "用户列表V2",
        }, nil
    })

    s.Run()
}
```

通过路由分组，可以更好地组织和管理 API 路由，提高代码的可维护性。

## 结构化路由

Maltose 框架支持通过结构体元数据进行路由注册，这是一种更加规范和便捷的注册方式：

```go
package main

import (
    "context"

    "github.com/graingo/maltose/frame/m"
)

// 定义控制器
type UserController struct{}

// 请求参数
type GetUserReq struct {
    m.Meta `path:"/user/:id" method:"GET"`
    ID     string `uri:"id" v:"required"`
}

// 响应数据
type GetUserRes struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// 控制器方法
func (c *UserController) GetUser(ctx context.Context, req *GetUserReq) (*GetUserRes, error) {
    return &GetUserRes{
        ID:   req.ID,
        Name: "测试用户",
    }, nil
}

func main() {
    s := m.Server()

    // 绑定控制器
    s.Bind(&UserController{})

    s.Run()
}
```

通过结构体元数据的方式定义路由，可以更清晰地管理 API 接口，同时支持自动参数验证和绑定。

## HTTPS 支持

Maltose 框架内置支持 HTTPS 服务：

```go
package main

import (
    "github.com/graingo/maltose/frame/m"
)

func main() {
    s := m.Server()

    // 启用HTTPS
    s.EnableHTTPS("server.crt", "server.key")

    // 设置其他路由和处理逻辑...

    s.Run()
}
```

通过 `EnableHTTPS` 方法可以启用 HTTPS 服务，需要提供证书和密钥文件的路径。

## 配置管理

Maltose 框架支持通过配置文件管理服务器配置：

```yaml
# config.yaml
server:
  address: ":8080"
  server_name: "api-server"
  read_timeout: "60s"
  write_timeout: "60s"

  # TLS配置
  tls_enable: false
  tls_cert_file: "server.crt"
  tls_key_file: "server.key"

  # 优雅关闭配置
  graceful_enable: true
  graceful_timeout: "30s"
  graceful_wait_time: "5s"
```

框架会自动读取配置文件，初始化服务器的各项参数。

## 优雅关闭

Maltose 框架内置支持服务的优雅关闭，确保在服务停止时正常完成已接收的请求：

```go
package main

import (
    "github.com/graingo/maltose/frame/m"
)

func main() {
    s := m.Server()

    // 设置优雅关闭参数
    s.SetGracefulTimeout(30) // 30秒超时

    // 设置其他路由和处理逻辑...

    s.Run()
}
```

当接收到终止信号时，服务器会等待现有请求完成，然后再关闭服务。

## 更多功能特性

Maltose 框架的 HTTP 服务组件还支持更多功能和特性，包括：

- 中间件管理：支持全局和分组中间件
- 参数验证：内置丰富的验证规则
- API 文档生成：自动生成 OpenAPI 和 Swagger 文档
- 性能监控：内置服务性能指标采集
- 链路跟踪：支持 OpenTelemetry 分布式追踪

更多功能及使用细节，请参考后续章节。
