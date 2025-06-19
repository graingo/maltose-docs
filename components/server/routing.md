# 路由

路由是 Web 应用的核心，它决定了如何将客户端请求映射到具体的处理逻辑。Maltose 提供了两种路由定义方式：**传统路由**和**控制器绑定**，满足不同场景的开发需求。

## 传统路由

传统路由通过直接注册处理函数的方式定义，适合简单的 API 或快速原型开发。

### 基础路由

支持所有标准的 HTTP 方法：

```go
s := mhttp.New()

// GET 请求
s.GET("/users", func(r *mhttp.Request) {
    r.JSON(200, gin.H{"message": "获取用户列表"})
})

// POST 请求
s.POST("/users", func(r *mhttp.Request) {
    r.JSON(201, gin.H{"message": "创建用户成功"})
})

// PUT 请求
s.PUT("/users/:id", func(r *mhttp.Request) {
    id := r.Param("id")
    r.JSON(200, gin.H{"message": "更新用户", "id": id})
})

// DELETE 请求
s.DELETE("/users/:id", func(r *mhttp.Request) {
    id := r.Param("id")
    r.JSON(200, gin.H{"message": "删除用户", "id": id})
})
```

### 路由参数

支持路径参数和通配符：

```go
// 路径参数
s.GET("/users/:id", func(r *mhttp.Request) {
    userID := r.Param("id")
    r.JSON(200, gin.H{"userID": userID})
})

// 多个参数
s.GET("/users/:id/posts/:postId", func(r *mhttp.Request) {
    userID := r.Param("id")
    postID := r.Param("postId")
    r.JSON(200, gin.H{"userID": userID, "postID": postID})
})

// 通配符参数
s.GET("/files/*filepath", func(r *mhttp.Request) {
    filepath := r.Param("filepath")
    r.JSON(200, gin.H{"filepath": filepath})
})
```

### 路由分组

使用路由分组可以为一组相关的路由添加公共的前缀或中间件：

```go
// API v1 分组
v1 := s.Group("/api/v1")
{
    v1.GET("/users", getUsersV1)
    v1.POST("/users", createUserV1)
}

// API v2 分组
v2 := s.Group("/api/v2")
{
    v2.GET("/users", getUsersV2)
    v2.POST("/users", createUserV2)
}

// 需要认证的分组
authGroup := s.Group("/auth")
authGroup.Use(AuthMiddleware()) // 添加认证中间件
{
    authGroup.GET("/profile", getProfile)
    authGroup.PUT("/profile", updateProfile)
}
```

## 控制器绑定（推荐）

控制器绑定是 Maltose 的核心特性，它通过反射自动将控制器方法绑定到路由，实现了**约定优于配置**的设计理念。

### 控制器定义

首先定义请求和响应结构体：

```go
// internal/model/v1/user.go
package v1

import "github.com/graingo/maltose/net/mhttp/mmeta"

// GetUserProfileReq 获取用户资料请求
type GetUserProfileReq struct {
    UserID int `path:"id" binding:"required" dc:"用户ID"`
}

// GetUserProfileRes 获取用户资料响应
type GetUserProfileRes struct {
    UserID   int    `json:"userId" dc:"用户ID"`
    Username string `json:"username" dc:"用户名"`
    Email    string `json:"email" dc:"邮箱地址"`
    Avatar   string `json:"avatar" dc:"头像URL"`
}

// 路由元数据：定义 HTTP 方法、路径等信息
func (req *GetUserProfileReq) Meta() mmeta.Meta {
    return mmeta.Meta{
        Path:    "/users/:id",
        Method:  "GET",
        Tags:    []string{"用户管理"},
        Summary: "获取用户资料",
    }
}
```

然后定义控制器：

```go
// internal/controller/user/user.go
package user

import (
    "context"
    v1 "your-project/internal/model/v1"
)

type Controller struct{}

// GetProfile 获取用户资料
func (c *Controller) GetProfile(ctx context.Context, req *v1.GetUserProfileReq) (*v1.GetUserProfileRes, error) {
    // 业务逻辑处理
    user, err := service.User().GetByID(ctx, req.UserID)
    if err != nil {
        return nil, err
    }

    return &v1.GetUserProfileRes{
        UserID:   user.ID,
        Username: user.Username,
        Email:    user.Email,
        Avatar:   user.Avatar,
    }, nil
}
```

### 绑定控制器

最后在路由注册中绑定控制器：

```go
// internal/router/router.go
package router

import (
    "github.com/graingo/maltose/net/mhttp"
    "your-project/internal/controller/user"
)

func Register(s *mhttp.Server) {
    // 将 user.Controller 的所有方法绑定到服务器
    s.BindObject(&user.Controller{})
}
```

完成以上步骤后，Maltose 会自动创建 `GET /users/:id` 路由，并将其指向 `user.Controller` 的 `GetProfile` 方法。这种方式不仅代码更清晰，而且 API 的定义、实现和路由完全自动化，极大地提升了开发效率。

## 请求处理与验证

在 Maltose 中，路由处理器的核心任务之一就是处理来自客户端的请求。`mhttp` 在这方面提供了强大的自动化工具，尤其是参数绑定和验证。

### 自动参数绑定

当您定义一个控制器方法时，例如 `func(ctx context.Context, req *v1.SomeReq) (*v1.SomeRes, error)`，框架会自动执行以下操作：

1.  **实例化请求结构体**：为您创建一个 `*v1.SomeReq` 的实例
2.  **绑定数据**：根据请求的 `Content-Type` 和 HTTP 方法，自动从请求的 **URL 查询参数**、**表单数据** 或 **JSON 请求体** 中提取数据，并填充到 `req` 实例的字段中

这依赖于您在结构体字段上使用的标签：

```go
type CreateUserReq struct {
    Username string `json:"username" binding:"required,min=3,max=20" dc:"用户名"`
    Email    string `json:"email" binding:"required,email" dc:"邮箱地址"`
    Password string `json:"password" binding:"required,min=6" dc:"密码"`
    Age      int    `json:"age" binding:"min=1,max=120" dc:"年龄"`
}
```

### 自动参数验证

Maltose 内置了强大的 `go-playground/validator` 验证器。您只需在请求结构体的字段上添加 `binding` 标签，框架就会在绑定数据后自动进行验证。

常用的验证规则：

| 规则       | 说明        | 示例                               |
| ---------- | ----------- | ---------------------------------- |
| `required` | 必填字段    | `binding:"required"`               |
| `min=n`    | 最小值/长度 | `binding:"min=3"`                  |
| `max=n`    | 最大值/长度 | `binding:"max=20"`                 |
| `email`    | 邮箱格式    | `binding:"email"`                  |
| `url`      | URL 格式    | `binding:"url"`                    |
| `oneof`    | 枚举值      | `binding:"oneof=admin user guest"` |

如果验证失败，框架会：

1.  **终止请求处理**：不会执行业务逻辑
2.  **返回详细错误**：包含具体的字段名和错误原因
3.  **支持国际化**：错误消息支持多语言

### 路径参数绑定

对于路径中的参数，使用 `path` 标签：

```go
type GetUserReq struct {
    UserID int `path:"id" binding:"required,min=1" dc:"用户ID"`
}

// 对应路由：GET /users/:id
func (req *GetUserReq) Meta() mmeta.Meta {
    return mmeta.Meta{
        Path:   "/users/:id",
        Method: "GET",
    }
}
```

### 查询参数绑定

对于 URL 查询参数，使用 `form` 标签：

```go
type ListUsersReq struct {
    Page     int    `form:"page" binding:"min=1" dc:"页码"`
    PageSize int    `form:"page_size" binding:"min=1,max=100" dc:"每页数量"`
    Keyword  string `form:"keyword" dc:"搜索关键词"`
}

// 对应请求：GET /users?page=1&page_size=20&keyword=alice
```

### 混合参数绑定

一个请求结构体可以同时包含路径参数、查询参数和请求体：

```go
type UpdateUserReq struct {
    // 路径参数
    UserID int `path:"id" binding:"required,min=1" dc:"用户ID"`

    // 查询参数
    Force bool `form:"force" dc:"是否强制更新"`

    // 请求体
    Username string `json:"username" binding:"required,min=3" dc:"用户名"`
    Email    string `json:"email" binding:"required,email" dc:"邮箱"`
}
```

### 错误处理示例

当验证失败时，客户端会收到详细的错误信息：

```json
{
  "code": 40000,
  "message": "参数验证失败",
  "data": {
    "errors": [
      {
        "field": "username",
        "message": "用户名长度必须至少为3个字符"
      },
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  }
}
```

通过这种自动化的参数绑定和验证机制，您可以专注于业务逻辑的实现，而不需要编写重复的参数解析和验证代码。
