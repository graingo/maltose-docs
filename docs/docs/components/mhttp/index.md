# mhttp

HTTP 服务组件 `mhttp` 是 `Maltose` 框架提供的基于 `Gin` 二次开发的高性能 Web 服务组件，扩展了丰富的功能特性，使 Web 开发更加便捷高效。

## 基本介绍

`mhttp` 组件提供了一套完整的 HTTP 服务解决方案，包括服务器创建、路由管理、请求处理、响应封装、中间件支持等核心功能。基于 `Gin` 框架的高性能引擎，结合 `Maltose` 自身的扩展，提供了更友好的 API 和更丰富的功能。

## 功能特性

- **丰富的路由管理**：支持基本路由、路由分组、RESTful API、结构化路由等多种路由注册方式
- **中间件支持**：提供全局和分组级别的中间件支持，内置丰富的中间件
- **静态文件服务**：内置静态文件服务支持，可轻松配置静态资源目录
- **优雅关闭**：支持服务的优雅启动和关闭，确保请求正常处理
- **TLS/HTTPS**：内置 HTTPS 支持，提供安全的通信方式
- **多实例支持**：支持在同一进程中运行多个服务实例
- **配置灵活**：支持通过代码或配置文件对服务进行配置
- **API 文档生成**：支持自动生成 OpenAPI 规范和 Swagger UI
- **高性能**：基于 `Gin` 的高性能路由引擎，保证极致的性能表现

## 核心概念

### Server

`Server` 是 `mhttp` 组件的核心对象，代表一个 HTTP 服务实例，负责管理服务的生命周期、路由注册、中间件管理、请求处理等核心功能。通过 `New()` 函数可以创建一个新的服务实例：

```go
server := mhttp.New()
```

或者通过框架的封装方法获取：

```go
server := m.Server()
```

### RouterGroup

`RouterGroup` 是路由分组的抽象，提供了路由注册和中间件管理的功能。通过路由分组，可以更好地组织和管理 API 路由，提高代码的可维护性：

```go
api := server.Group("/api")
v1 := api.Group("/v1")
```

`RouterGroup` 支持常见的 HTTP 方法，如 GET、POST、PUT、DELETE 等，以及通用的路由注册方法。

### Request

`Request` 是对 HTTP 请求的封装，提供了请求参数绑定、验证、响应等功能。通过 `Request` 对象，可以方便地获取请求参数、设置响应内容、处理错误等：

```go
func handler(r *mhttp.Request) {
    var param struct {
        Name string `form:"name" binding:"required"`
    }
    if err := r.Parse(&param); err != nil {
        r.Error(err)
        return
    }
    r.JSON(200, map[string]interface{}{
        "message": "Hello, " + param.Name,
    })
}
```

### ServerConfig

`ServerConfig` 包含了服务器的各项配置参数，包括基本配置、TLS 配置、优雅关闭配置、API 文档配置、日志配置等：

```go
config := mhttp.NewConfig()
config.Address = ":8080"
config.ServerName = "api-server"
```

通过配置对象，可以灵活地设置服务器的各项参数，满足不同的需求。

## 使用指引

1. [开始使用](./start.md) - 快速入门与基本示例
2. [路由管理](./router.md) - 路由注册与管理
3. [请求处理](./request.md) - 请求参数绑定与处理
4. [中间件](./middleware.md) - 中间件使用与开发
5. [静态文件](./static.md) - 静态文件服务配置
6. [配置管理](./config.md) - 服务配置项说明
7. [HTTPS 支持](./https.md) - TLS 配置与证书管理
8. [优雅关闭](./graceful.md) - 服务优雅启动与关闭
9. [API 文档](./doc.md) - OpenAPI 与 Swagger 集成
