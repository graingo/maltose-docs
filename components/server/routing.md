# 路由

Maltose 支持两种路由组织方式：

- 控制器绑定：推荐，适合正式业务接口
- 传统处理器：适合简单接口、调试接口或特殊响应场景

## 控制器绑定

控制器绑定依赖请求结构体中的 `m.Meta` 元信息。

### API 定义

```go
package v1

import "github.com/graingo/maltose/frame/m"

type GetUserReq struct {
    m.Meta `path:"/users/:id" method:"GET" tag:"用户管理" summary:"获取用户信息"`
    UserID int `path:"id" binding:"required" dc:"用户 ID"`
}

type GetUserRes struct {
    UserID   int    `json:"user_id" dc:"用户 ID"`
    Username string `json:"username" dc:"用户名"`
}
```

### 控制器方法签名

控制器方法的签名应为：

```go
func (c *Controller) GetUser(ctx context.Context, req *v1.GetUserReq) (*v1.GetUserRes, error)
```

示例：

```go
type Controller struct{}

func (c *Controller) GetUser(ctx context.Context, req *v1.GetUserReq) (*v1.GetUserRes, error) {
    return &v1.GetUserRes{
        UserID:   req.UserID,
        Username: "maltose",
    }, nil
}
```

### 绑定控制器

```go
s := mhttp.New()
s.Bind(&user.Controller{})
```

## `m.Meta` 常用标签

| 标签 | 说明 |
| --- | --- |
| `path` | 路由路径 |
| `group` | 路由前缀，生成 OpenAPI 时会参与路径拼接 |
| `method` | HTTP 方法 |
| `summary` | 接口摘要 |
| `tag` | 文档分组标签 |
| `dc` | 描述信息 |

> 当前运行时和 OpenAPI 解析器读取的是 `tag`，不是 `tags`。

## 参数绑定标签

| 标签 | 说明 |
| --- | --- |
| `path` | 路径参数 |
| `form` | query 或 form 参数 |
| `json` | JSON 请求体字段 |
| `header` | 请求头 |
| `binding` | 校验规则 |
| `dc` | 字段说明 |

## 传统处理器

### 基础路由

```go
s := mhttp.New()

s.GET("/ping", func(r *mhttp.Request) {
    r.JSON(200, map[string]any{"message": "pong"})
})

s.POST("/status", func(r *mhttp.Request) {
    r.JSON(201, map[string]any{"status": "ok"})
})
```

### 路由参数

```go
s.GET("/users/:id", func(r *mhttp.Request) {
    r.JSON(200, map[string]any{
        "user_id": r.Param("id"),
    })
})

s.GET("/files/*filepath", func(r *mhttp.Request) {
    r.JSON(200, map[string]any{
        "filepath": r.Param("filepath"),
    })
})
```

### 路由分组

```go
v1 := s.Group("/api/v1")
v1.GET("/users", listUsers)
v1.POST("/users", createUser)

admin := s.Group("/admin")
admin.Middleware(AuthMiddleware())
admin.GET("/dashboard", dashboardHandler)
admin.POST("/settings", updateSettingsHandler)
```

### 单路由中间件

路由方法签名是 `GET(path, handler, middlewares...)`。

```go
s.GET("/admin/profile", profileHandler, AuthMiddleware())
```

## 使用建议

- 对外正式 API 优先使用控制器绑定，结构更稳定。
- 自定义文件下载、流式输出、Webhook 等特殊接口时，直接用传统处理器更直观。
- 如果项目依赖 OpenAPI 生成，务必保持 `m.Meta` 标签和真实字段一致。
