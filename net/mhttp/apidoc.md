# API 文档生成

Maltose 框架内置了 OpenAPI 规范生成和 Swagger UI 集成功能，可以自动为您的 API 生成交互式文档。本功能仅对使用规范路由的控制器有效。

## OpenAPI 规范

[OpenAPI 规范](https://swagger.io/specification/)（以前称为 Swagger 规范）是一个用于描述 RESTful API 的开放标准。Maltose 自动根据您定义的规范路由生成符合 OpenAPI 3.0 标准的 API 规范文档。

### 配置 OpenAPI 端点

默认情况下，OpenAPI 规范可以通过 `/api.json` 访问。您可以在配置文件中修改这个路径：

```yaml
server:
  openapi_path: "/api-docs/openapi.json" # 自定义 OpenAPI 路径
```

### 自定义 API 信息

您可以通过规范路由的结构体标签来自定义 API 文档信息：

```go
// API 标签分组
type UserReq struct {
    m.Meta `path:"/user/:id" method:"GET" tag:"用户管理"`
    ID     string `uri:"id" dc:"用户ID"`
}

// API 摘要
type CreateUserReq struct {
    m.Meta `path:"/user" method:"POST" summary:"创建新用户"`
    Name   string `json:"name" binding:"required" dc:"用户名称"`
    Email  string `json:"email" binding:"required,email" dc:"电子邮箱"`
}

// API 描述
type UpdateUserReq struct {
    m.Meta `path:"/user/:id" method:"PUT" dc:"更新指定ID的用户信息"`
    ID     string `uri:"id" dc:"用户ID"`
    Name   string `json:"name" dc:"用户名称"`
}
```

可用的文档标签：

- `tag`: API 分组标签，用于在 Swagger UI 中对 API 进行分组
- `summary`: API 摘要，简短描述 API 的功能
- `dc`: 详细描述，针对整个 API 或具体字段的详细说明

### 字段文档

您也可以使用 `dc` 标签为请求和响应字段添加描述：

```go
type UserReq struct {
    m.Meta `path:"/user" method:"POST"`
    Name   string `json:"name" dc:"用户名称，长度2-20个字符"`
    Age    int    `json:"age" dc:"用户年龄，必须大于等于18"`
    Email  string `json:"email" dc:"电子邮箱地址"`
}
```

## Swagger UI

[Swagger UI](https://swagger.io/tools/swagger-ui/) 是一个功能强大的 API 文档界面，可以提供交互式的 API 浏览和测试功能。

### 配置 Swagger UI

默认情况下，Swagger UI 可以通过 `/swagger` 访问。您可以在配置文件中修改这个路径：

```yaml
server:
  swagger_path: "/api-docs" # 自定义 Swagger UI 路径
```

### 自定义 Swagger UI 模板

Maltose 使用内置模板渲染 Swagger UI。如果您需要自定义 Swagger UI 的外观或行为，可以在配置文件中指定自定义模板：

```yaml
server:
  swagger_template: "./custom-swagger-template.html"
```

## 模型定义文件

为了更好地组织 API 文档，建议将请求和响应结构体定义在单独的模型文件中：

```go
// api/model/user.go
package model

import "github.com/graingo/maltose/frame/m"

// 获取用户请求
type GetUserReq struct {
    m.Meta `path:"/user/:id" method:"GET" tag:"用户" summary:"获取用户信息"`
    ID     string `uri:"id" dc:"用户ID"`
}

// 获取用户响应
type GetUserRes struct {
    ID       string `json:"id" dc:"用户ID"`
    Username string `json:"username" dc:"用户名"`
    Email    string `json:"email" dc:"电子邮箱"`
    Age      int    `json:"age" dc:"年龄"`
    Created  string `json:"created" dc:"创建时间"`
}

// 用户列表请求
type ListUserReq struct {
    m.Meta `path:"/users" method:"GET" tag:"用户" summary:"获取用户列表"`
    Page   int `form:"page" dc:"页码，从1开始"`
    Size   int `form:"size" dc:"每页数量，默认20"`
}

// 用户列表响应
type ListUserRes struct {
    Total int         `json:"total" dc:"总数"`
    Items []GetUserRes `json:"items" dc:"用户列表"`
}
```

## 查看 API 文档

启动您的 Maltose 应用程序后，可以通过以下方式访问 API 文档：

1. 访问 OpenAPI 规范：打开浏览器，访问 `http://localhost:8080/api.json`
2. 访问 Swagger UI：打开浏览器，访问 `http://localhost:8080/swagger`

## 示例：完整的 API 文档定义

下面是一个包含完整 API 文档定义的示例：

```go
// 用户注册请求
type RegisterReq struct {
    m.Meta   `path:"/auth/register" method:"POST" tag:"认证" summary:"用户注册" dc:"创建新用户账号"`
    Username string `json:"username" binding:"required,min=4,max=20" dc:"用户名，4-20个字符"`
    Password string `json:"password" binding:"required,min=8" dc:"密码，最少8个字符"`
    Email    string `json:"email" binding:"required,email" dc:"电子邮箱"`
    Nickname string `json:"nickname" dc:"昵称，选填"`
    Age      int    `json:"age" binding:"required,gte=18" dc:"年龄，必须大于等于18"`
}

// 用户注册响应
type RegisterRes struct {
    UserID   string `json:"user_id" dc:"用户ID"`
    Username string `json:"username" dc:"用户名"`
    Token    string `json:"token" dc:"访问令牌"`
}

// 控制器
type AuthController struct{}

func (c *AuthController) Register(ctx context.Context, req *RegisterReq) (*RegisterRes, error) {
    // 实现注册逻辑...
    return &RegisterRes{
        UserID:   "user-123",
        Username: req.Username,
        Token:    "jwt-token-example",
    }, nil
}
```

这个例子展示了如何为 API 端点添加完整的文档信息，包括标签、摘要、描述，以及请求和响应字段的说明。

## 最佳实践

- 为每个 API 添加合适的标签，便于分组管理
- 提供简明的 API 摘要，帮助用户快速理解功能
- 为复杂字段添加详细描述
- 使用字段验证标签同时也作为文档的一部分
- 将相关 API 模型放在同一个文件中，便于管理
