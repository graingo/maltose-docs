# 路由管理

Maltose 框架提供了灵活且强大的路由管理功能，支持规范路由注册和传统路由定义方式。

## 路由定义方式

### 规范路由（推荐方式）

规范路由是 Maltose 的独特特性之一，通过结构体标签定义路由信息，使 API 定义更加清晰和规范：

```go
import (
    "context"
    "github.com/graingo/maltose/frame/m"
)

// 定义请求结构体
type UserReq struct {
    m.Meta `path:"/user/:id" method:"GET"` // 路由元数据
    ID     string `uri:"id"`               // URI 参数
}

// 定义响应结构体
type UserRes struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// 定义控制器
type UserController struct{}

// 控制器方法
func (c *UserController) GetUser(ctx context.Context, req *UserReq) (*UserRes, error) {
    return &UserRes{
        ID:   req.ID,
        Name: "Test User",
    }, nil
}

// 绑定控制器
func main() {
    s := m.Server()
    s.Bind(&UserController{})
    s.Run()
}
```

使用规范路由的优势：

- 路由信息与请求/响应模型紧密关联
- 自动生成 OpenAPI/Swagger 文档
- 代码结构更加清晰，易于维护
- 自动处理参数绑定和验证

### 标准路由方式

Maltose 也支持传统的路由定义方式：

```go
import "github.com/graingo/maltose/frame/m"

func main() {
    s := m.Server()

    // 定义路由和处理函数
    s.GET("/ping", func(r *mhttp.Request) {
        r.String(200, "pong")
    })

    // ...

    s.Run()
}
```

## 路由分组

路由分组可以帮助组织和管理 API，并应用共享的中间件：

```go
func main() {
    s := m.Server()

    // 创建路由分组
    api := s.Group("/api")

    // 在分组内定义路由
    api.GET("/users", GetUsers)
    api.POST("/users", CreateUsers)

    // 嵌套分组
    v1 := api.Group("/v1")
    v1.GET("/products", GetProductsV1)

    s.Run()
}
```

## RouterGroup 方法

`RouterGroup` 提供了以下方法来定义各种 HTTP 方法的路由：

```go
// GET 请求路由
api.GET("/users", GetUsers)

// POST 请求路由
api.POST("/users", CreateUser)

// PUT 请求路由
api.PUT("/user/:id", UpdateUser)

// DELETE 请求路由
api.DELETE("/user/:id", DeleteUser)

// HEAD 请求路由
api.HEAD("/users", HeadUsers)

// OPTIONS 请求路由
api.OPTIONS("/users", OptionsUsers)

// PATCH 请求路由
api.PATCH("/user/:id", PatchUser)

// 所有 HTTP 方法路由
api.Any("/any", AnyHandler)

// 通用路由注册方法
api.Handle("GET", "/custom", CustomHandler)
```

## 绑定控制器

通过 `Bind` 或 `BindObject` 方法可以自动绑定控制器的所有方法作为路由处理函数：

```go
// 绑定到根路由
s.Bind(&UserController{})

// 绑定到特定路由组
api := s.Group("/api")
api.BindObject(&ProductController{})
```

## 规范路由标签

当使用规范路由时，可以在结构体标签中定义以下属性：

```go
type ExampleReq struct {
    m.Meta `
        path:"/example"       // 路由路径
        method:"GET"          // HTTP 方法
        summary:"示例API"      // API摘要（用于Swagger文档）
        tag:"示例"             // API标签（用于Swagger文档分组）
        dc:"这是一个示例API"     // 描述（用于Swagger文档）
    `
}
```

## API 文档生成

使用规范路由的一个重要优势是可以自动生成 OpenAPI 规范和 Swagger UI 文档。

### OpenAPI 规范生成

Maltose 会自动基于规范路由生成 OpenAPI 规范，包括：

- API 端点信息
- 请求参数定义
- 响应结构定义
- 标签和摘要信息

默认情况下，OpenAPI 规范可以通过 `/api.json` 访问，可以通过配置修改：

```yaml
server:
  openapi_path: "/api-docs/openapi.json"
```

### Swagger UI

Maltose 集成了 Swagger UI，提供了一个交互式的 API 文档界面：

```yaml
server:
  swagger_path: "/swagger" # Swagger UI 路径
```

访问 `/swagger` 可以查看 Swagger UI 界面，查看和测试 API。

### 自定义 API 文档信息

可以通过规范路由的结构体标签来自定义 API 文档信息：

```go
// 分组标签
type UserReq struct {
    m.Meta `path:"/user/:id" method:"GET" tag:"用户管理"`
    // ...
}

// 添加摘要
type CreateUserReq struct {
    m.Meta `path:"/user" method:"POST" summary:"创建新用户"`
    // ...
}

// 添加详细描述
type UpdateUserReq struct {
    m.Meta `path:"/user/:id" method:"PUT" dc:"更新指定ID的用户信息"`
    // ...
}
```

## 静态文件服务

提供静态文件服务：

```go
// 设置静态文件服务
s.SetStaticPath("/static", "./public")
```

## 注意事项

- 路由冲突：避免注册相同路径的路由
- 路由顺序：更具体的路由应该在不太具体的路由之前注册
- 性能考虑：路由数量过多可能会影响性能，适当使用路由分组
- Gin 兼容性：Maltose 的路由底层基于 Gin，兼容 Gin 的路由规则
