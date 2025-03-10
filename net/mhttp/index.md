# HTTP 服务 (mhttp)

`mhttp` 是 Maltose 框架的核心组件之一，提供了基于 Gin 的 HTTP 服务实现。它具有高性能、易用性和灵活性的特点，让开发者可以快速构建 Web 应用和 API 服务。

## 特性

- **基于 Gin**: 继承 Gin 框架的高性能特性
- **兼容中间件**: 完全兼容 Gin 的中间件生态
- **元数据路由**: 支持通过结构体元数据定义路由
- **请求生命周期**: 完整的请求生命周期管理
- **链路追踪**: 集成 OpenTelemetry 分布式追踪

## 基本用法

### 创建服务器

使用 `m.Server()` 函数可以快速创建一个 HTTP 服务器：

```go
import "github.com/graingo/maltose/frame/m"

func main() {
    // 创建默认服务器
    s := m.Server()

    // 启动服务器
    s.Run()
}
```

### 定义控制器

通过定义结构体和方法来创建控制器：

```go
type UserController struct{}

type GetUserReq struct {
    m.Meta `path:"/user/:id" method:"GET"`
    ID     string `uri:"id"`
}

type GetUserRes struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

func (c *UserController) GetUser(ctx context.Context, req *GetUserReq) (*GetUserRes, error) {
    return &GetUserRes{
        ID:   req.ID,
        Name: "Test User",
    }, nil
}
```

### 绑定控制器

将控制器绑定到服务器：

```go
s.Bind(&UserController{})
```

## 核心组件

### Server

[Server](/net/mhttp/server) 是 HTTP 服务的核心，负责处理 HTTP 请求、管理路由和中间件。

### Router

[Router](/net/mhttp/router) 提供了路由注册和管理功能，支持元数据路由、分组路由等。

### Middleware

[Middleware](/net/mhttp/middleware) 用于在请求处理流程中添加额外的处理逻辑，如日志记录、认证授权等。

### Request

[Request](/net/mhttp/request) 封装了 HTTP 请求相关的操作，如参数获取、请求绑定等。

### Response

[Response](/net/mhttp/response) 提供了 HTTP 响应相关的操作，如返回 JSON、文件下载等。

## 与其他组件的集成

`mhttp` 组件可以与 Maltose 框架的其他组件无缝集成：

- 与 `mtrace` 集成，实现分布式追踪
- 与 `mlog` 集成，提供结构化日志记录
- 与 `mcfg` 集成，支持配置化的服务管理

## 更多内容

- [服务器配置](/net/mhttp/server)
- [路由管理](/net/mhttp/router)
- [中间件](/net/mhttp/middleware)
- [请求处理](/net/mhttp/request)
- [响应处理](/net/mhttp/response)
