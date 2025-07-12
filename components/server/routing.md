# 路由

在 Maltose 中，我们推荐使用**控制器绑定**的方式来定义路由。这种方式通过将 API 定义（结构体）、业务实现（控制器方法）和路由注册三者解耦并自动化关联，极大地提升了代码的结构性和可维护性。

## 控制器绑定（推荐）

控制器绑定是 Maltose 的核心特性，它通过反射自动将控制器方法绑定到路由，实现了**约定优于配置**的设计理念。

### 开发流程示例：从 API 定义到路由生效

将控制器绑定与 `maltose` 命令行工具结合使用，是最高效的开发方式。以下展示了从定义 API 到实现业务逻辑的完整流程：

**第一步：在 `api` 目录定义请求与响应 (契约先行)**

这是 API 的契约，是所有自动化的输入。

```go
// file: api/user/v1/user.go
package v1

import "github.com/graingo/maltose/frame/m"

// GetUserProfileReq 获取用户资料请求
type GetUserProfileReq struct {
	m.Meta   `path:"/users/:id" method:"GET" tags:"用户管理" summary:"获取用户资料"`
	UserID   int `path:"id" binding:"required" dc:"用户ID"`
}

// GetUserProfileRes 获取用户资料响应
type GetUserProfileRes struct {
	UserID   int    `json:"userId" dc:"用户ID"`
	Username string `json:"username" dc:"用户名"`
	Email    string `json:"email" dc:"邮箱地址"`
}
```

**第二步：使用 `maltose gen service` 自动生成骨架**

在项目根目录执行以下命令：

```bash
maltose gen service
```

该命令会扫描 `api` 目录，并根据 `user.go` 的定义，自动在 `internal` 目录下创建或更新对应的 `controller` 和 `service` 文件，包含所有方法的骨架。

**第三步：在生成的控制器中填充业务逻辑**

打开由上一步生成的 `internal/controller/user/user_v1.go` 文件，并填充业务逻辑：

```go
// file: internal/controller/user/user_v1.go
package user

import (
	"context"
	v1 "your-project/api/v1"
	// ... import service
)

type Controller struct{}

// GetProfile 实现了获取用户资料的逻辑
func (c *Controller) GetProfile(ctx context.Context, req *v1.GetUserProfileReq) (*v1.GetUserProfileRes, error) {
	// ... 调用 service 层等业务逻辑 ...
	return &v1.GetUserProfileRes{
		UserID:   req.UserID,
		Username: "maltose",
		Email:    "maltose@example.com",
	}, nil
}
```

### 核心机制详解

#### 1. API 结构体：定义契约

API 结构体是所有绑定的基础，它通过代码定义了 API 的一切。

- **`*Req` 结构体**:

  - **`m.Meta` 内嵌**: 通过嵌入匿名字段 `m.Meta`，并为其添加 `path`, `method`, `summary`, `tags` 等标签来定义路由的核心元数据。这是路由注册和 OpenAPI 文档生成的依据。
  - **字段标签**: 通过 `path`, `form`, `json`, `header` 等标签声明了参数的来源。
  - **`binding` 标签**: 定义了参数的验证规则。
  - **`dc` 标签**: 为参数提供文档描述。

- **`*Res` 结构体**:
  - 定义了成功响应的数据结构，其字段上的 `json` 和 `dc` 标签同样用于序列化和文档生成。

:::tip 自动化 API 文档
您在 `mmeta.Meta` 和结构体字段标签中提供的所有元数据，都会被 `maltose gen openapi` 命令自动捕获。该工具能够深度解析**嵌套结构体**，让您轻松地从一份代码生成一份内容详尽、结构准确的 API 文档。
:::

#### 2. 核心标签详解

为了实现自动化功能，Maltose 依赖于在结构体字段上使用的一系列标签。理解这些标签是高效开发的关键。它们主要分为两类：

**路由元信息标签 (作用于 `m.Meta` 结构体)**

这些标签定义了 API 端点的核心路由信息。

| 标签               | 说明                                                                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path:"<path>"`    | 定义 API 的 URL 路径，支持路径参数（如 `:id`）。                                                                                                                                                |
| `group:"<prefix>"` | 定义路由分组前缀。`openapi` 生成器会将其加在 `path` 前。**默认根据文件路径中的版本号（如 `v1`）生成 `api/v1` 作为前缀。若未找到版本号，则前缀为空**。如果想从根路径开始，请设置为 `group:"/"`。 |
| `method:"<verb>"`  | 定义 HTTP 请求方法，如 `GET`, `POST`, `PUT` 等。                                                                                                                                                |
| `summary:"<text>"` | 提供一个简短的 API 功能摘要。                                                                                                                                                                   |
| `tags:"<t1,t2>"`   | 为 API 打上标签，用于在文档中分组。多个标签用逗号分隔。                                                                                                                                         |

**参数绑定与验证标签 (作用于请求结构体的普通字段)**

这些标签定义了如何从 HTTP 请求中提取数据并进行验证。

| 标签                | 说明                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `form:"<name>"`     | 将字段绑定到 URL 查询参数或表单 (`x-www-form-urlencoded`) 中的同名键。                     |
| `json:"<name>"`     | 将字段绑定到 JSON 请求体中的同名键。在响应结构体中，它定义了该字段序列化为 JSON 时的键名。 |
| `header:"<name>"`   | 将字段绑定到 HTTP 请求头中的同名键。                                                       |
| `binding:"<rules>"` | 定义字段的验证规则，由 `go-playground/validator` 库提供支持。多个规则用逗号 `,` 分隔。     |

**通用文档标签 (`dc`)**

`dc` (Description Comment) 标签是一个通用标签，可以用于 `m.Meta` 和任何普通字段，为它们提供详细的描述信息。这些信息是 `maltose gen openapi` 生成 API 文档时 `description` 字段的主要来源。

```go
type CreateUserReq struct {
	m.Meta `path:"/users" method:"POST" dc:"这个接口用于创建新用户，信息需要完整。"`
	Name   string `json:"name" binding:"required" dc:"用户名，长度必须在3到20之间"`
}
```

#### 3. 自动参数绑定与验证

当一个请求到达时，对于绑定了控制器的路由，框架会自动执行以下操作：

1.  **实例化请求结构体**：为您创建一个 `*SomeReq` 的实例。
2.  **绑定数据**：根据您在结构体字段上定义的 `path`, `form`, `json`, `header` 标签，从请求的各个部分（URL 路径、查询参数、请求体、请求头）提取数据，并填充到 `req` 实例中。
3.  **验证参数**：使用 `binding` 标签中定义的规则对填充后的数据进行验证。
    - **验证成功**：调用控制器中对应的业务方法。
    - **验证失败**：中断请求，并自动返回一个包含详细错误信息的 `400 Bad Request` 响应。

通过这种自动化的机制，您的控制器方法可以完全专注于业务逻辑，无需编写任何解析和校验参数的模板代码。

## 传统路由（备选方案）

对于一些非常简单的 API、内部调试接口或不需要严格契约定义的场景，您依然可以使用传统的路由方式。

### 基础路由

支持所有标准的 HTTP 方法：

```go
s := mhttp.New()

// GET 请求
s.GET("/ping", func(r *mhttp.Request) {
    r.JSON(200, gin.H{"message": "pong"})
})

// POST 请求
s.POST("/status", func(r *mhttp.Request) {
    r.JSON(201, gin.H{"status": "ok"})
})
```

### 路由参数

支持路径参数和通配符：

```go
// 路径参数: /users/123
s.GET("/users/:id", func(r *mhttp.Request) {
    userID := r.Param("id")
    r.JSON(200, gin.H{"userID": userID})
})

// 通配符参数: /files/path/to/my/file.txt
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

// 需要认证的分组
authGroup := s.Group("/admin")
authGroup.Use(AuthMiddleware()) // 为该组下所有路由添加认证中间件
{
    authGroup.GET("/dashboard", getDashboard)
    auth.POST("/settings", updateSettings)
}
```
