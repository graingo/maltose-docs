# 路由

`mhttp` 提供了一套强大且易用的路由系统，它完全兼容 Gin 的路由功能，并在此基础上进行了封装，使其更符合 Maltose 的设计哲学，特别是与控制器（Controller）和中间件（Middleware）的结合使用。

## 基础路由

您可以直接在服务器实例或路由分组上注册路由，支持所有标准的 HTTP 方法。

```go
s := mhttp.New()

// 注册 GET, POST, PUT, DELETE 等路由
s.GET("/users", GetUserList)
s.POST("/users", CreateUser)
s.PUT("/users/:id", UpdateUser)
s.DELETE("/users/:id", DeleteUser)

func GetUserList(r *mhttp.Request) {
    // ...
}
// ... 其他 handler 函数
```

## 路由分组

路由分组是一个强大的功能，它能帮助您组织路由、共享路径前缀和中间件。

```go
s := mhttp.New()

// 创建一个 /api/v1 的路由分组
v1 := s.Group("/api/v1")
{
    // 在 v1 分组下注册路由
    // 最终路径为 /api/v1/users
    v1.GET("/users", GetUserList)

    // 可以在分组上应用中间件
    // AuthMiddleware() 将仅作用于 /api/v1/admin 下的所有路由
    adminGroup := v1.Group("/admin", mhttp.WithMiddleware(AuthMiddleware()))
    {
        adminGroup.GET("/dashboard", GetDashboard)
    }
}
```

## 中间件 (Middleware)

中间件是处理 HTTP 请求的核心机制，可用于实现认证、日志、限流等横切关注点。

### 定义中间件

一个中间件就是一个签名为 `func(*mhttp.Request)` 的函数。

```go
func LoggingMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        fmt.Println("Request URL:", r.Request.URL.Path)

        // 调用 r.Next() 以继续处理请求链
        r.Next()

        fmt.Println("Request finished with status:", r.Writer.Status())
    }
}
```

### 使用中间件

中间件可以应用于全局、路由分组或单个路由。

```go
s := mhttp.New()

// 1. 全局中间件
s.Use(LoggingMiddleware())

// 2. 路由组中间件
v1 := s.Group("/api/v1", mhttp.WithMiddleware(AuthMiddleware()))

// 3. 单个路由中间件
s.GET("/profile", GetProfile, MyCustomMiddleware())
```

## 控制器路由绑定

这是 Maltose 框架推荐的路由使用方式。它允许您将一个控制器（一个包含多个方法的 `struct`）直接绑定到一个路由分组，框架会自动扫描其中的方法，并根据您在请求结构体（`*Req`）中定义的元数据（`path`, `method` 等 tag）来注册路由。

这种方式极大地简化了路由定义，并使其与 API 定义内聚在一起。

### 1. 定义 API 请求/响应结构体

在 `api` 目录下定义请求和响应的 `struct`，并使用 `meta` tag 来声明路由信息。

```go
// file: api/user/v1/user.go
package v1

import "github.com/graingo/maltose/util/mmeta"

// 获取用户信息的请求
type UserProfileReq struct {
	mmeta.Meta `path:"/users/:id" method:"GET" summary:"获取用户简介" tags:"User"`
	ID         int `json:"id" form:"id"`
}

// 获取用户信息的响应
type UserProfileRes struct {
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}
```

### 2. 实现控制器方法

在 `internal/controller` 目录下创建控制器，并实现符合特定签名的方法。

```go
// file: internal/controller/user/user.go
package user

import (
	"context"
	v1 "my-app/api/user/v1"
)

type Controller struct{}

// 方法签名必须是 (ctx context.Context, req *XxxReq) (*XxxRes, error)
func (c *Controller) GetProfile(ctx context.Context, req *v1.UserProfileReq) (*v1.UserProfileRes, error) {
	// ... 您的业务逻辑 ...

	// 假设我们从数据库获取了用户信息
	res := &v1.UserProfileRes{
		Nickname: "Maltose User",
		Avatar:   "http://example.com/avatar.png",
	}
	return res, nil
}
```

### 3. 绑定控制器

在 `route` 目录中，将控制器实例绑定到服务器。

```go
// file: route/route.go
package route

import (
	"my-app/internal/controller/user"
	"github.com/graingo/maltose/net/mhttp"
)

func Register(s *mhttp.Server) {
    // 将 user.Controller 的所有方法绑定到服务器
	s.BindObject(&user.Controller{})
}
```

完成以上步骤后，Maltose 会自动创建 `GET /users/:id` 路由，并将其指向 `user.Controller` 的 `GetProfile` 方法。这种方式不仅代码更清晰，而且 API 的定义、实现和路由完全自动化，极大地提升了开发效率。
