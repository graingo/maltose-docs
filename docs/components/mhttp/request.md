# 请求处理

Maltose 框架提供了强大而灵活的 HTTP 请求处理功能，简化了参数获取、请求绑定和验证等操作。

## 请求对象

在 Maltose 中，可以通过 `m.RequestFromCtx` 从上下文中获取请求对象：

```go
import "github.com/graingo/maltose/frame/m"

func handler(ctx context.Context) {
    // 从上下文中获取请求对象
    req := m.RequestFromCtx(ctx)

    // 使用请求对象
    path := req.Path
    method := req.Method
    // ...
}
```

## 参数绑定

Maltose 支持多种参数绑定方式，通过结构体标签定义：

### URI 参数

```go
type UserReq struct {
    m.Meta `path:"/user/:id" method:"GET"`
    ID     string `uri:"id"` // 绑定 URI 参数
}

func (c *UserController) GetUser(ctx context.Context, req *UserReq) (*UserRes, error) {
    // req.ID 已经被自动绑定
    return &UserRes{ID: req.ID}, nil
}
```

### 查询参数

```go
type ListUserReq struct {
    m.Meta `path:"/users" method:"GET"`
    Page   int    `form:"page"`      // 绑定查询参数
    Size   int    `form:"size"`
    Sort   string `form:"sort"`
}
```

### 表单参数

```go
type CreateUserReq struct {
    m.Meta `path:"/users" method:"POST"`
    Name   string `form:"name"`      // 绑定表单参数
    Email  string `form:"email"`
    Age    int    `form:"age"`
}
```

### JSON 参数

```go
type UpdateUserReq struct {
    m.Meta `path:"/users/:id" method:"PUT"`
    ID     string `uri:"id"`         // URI 参数
    Name   string `json:"name"`      // JSON 参数
    Email  string `json:"email"`
    Age    int    `json:"age"`
}
```

### 混合绑定

Maltose 支持在同一请求中混合绑定不同来源的参数：

```go
type SearchUserReq struct {
    m.Meta  `path:"/users/search/:type" method:"POST"`
    Type    string `uri:"type"`        // URI 参数
    Query   string `form:"q"`          // 查询参数
    Page    int    `form:"page"`       // 查询参数
    Filters struct {
        Age    int    `json:"age"`     // JSON 参数
        Gender string `json:"gender"`  // JSON 参数
    } `json:"filters"`
}
```

## 参数验证

Maltose 使用 [validator](https://github.com/go-playground/validator) 库进行参数验证，支持丰富的验证规则：

```go
type RegisterReq struct {
    m.Meta   `path:"/register" method:"POST"`
    Username string `json:"username" binding:"required,min=4,max=20"`
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
    Age      int    `json:"age" binding:"required,gte=18"`
}
```

当参数验证失败时，框架会自动返回包含详细错误信息的响应。

### 自定义验证

您可以注册自定义验证规则：

```go
// 注册自定义验证规则
mhttp.RegisterRuleWithTranslation("mobile", ValidateMobile, map[string]string{
    "zh": "{0}必须是有效的手机号码",
    "en": "{0} must be a valid mobile number",
})

// 然后在请求结构体中使用
type UserReq struct {
    Mobile string `json:"mobile" binding:"required,mobile"`
}
```

更多验证规则和用法请参考 [validator 文档](https://pkg.go.dev/github.com/go-playground/validator/v10)。

## 文件上传

处理文件上传请求：

```go
type UploadReq struct {
    m.Meta `path:"/upload" method:"POST"`
    File   *multipart.FileHeader `form:"file"`
}

func (c *FileController) Upload(ctx context.Context, req *UploadReq) (*UploadRes, error) {
    // 获取文件信息
    filename := req.File.Filename
    size := req.File.Size

    // 保存文件
    dst := filepath.Join("./uploads", filename)
    if err := c.SaveUploadedFile(req.File, dst); err != nil {
        return nil, err
    }

    return &UploadRes{
        Filename: filename,
        Size:     size,
        Path:     dst,
    }, nil
}
```

## 获取请求信息

获取 HTTP 请求头、Cookie 及客户端信息：

```go
func handler(ctx context.Context) {
    req := m.RequestFromCtx(ctx)

    // 获取请求头
    userAgent := req.Header("User-Agent")

    // 获取 Cookie
    sessionID, err := req.Cookie("session_id")

    // 获取客户端 IP
    clientIP := req.ClientIP()

    // 获取请求方法和路径
    method := req.Method
    path := req.Path
}
```

## 请求上下文管理

设置和获取上下文值：

```go
func middleware(c *gin.Context) {
    // 设置上下文值
    c.Set("userId", "12345")
    c.Next()
}

func handler(ctx context.Context) {
    req := m.RequestFromCtx(ctx)
    ginCtx := req.Context

    // 获取上下文值
    userId, exists := ginCtx.Get("userId")
}
```

## Gin 兼容

Maltose 的 Request 对象是对 Gin 的 Context 对象的包装，所以您可以使用所有 Gin 的功能：

```go
func handler(ctx context.Context) {
    req := m.RequestFromCtx(ctx)
    ginCtx := req.Context

    // 使用任何 Gin 的方法
    // ...
}
```

更多关于 Gin 的使用方法可以参考 [Gin 文档](https://gin-gonic.com/docs/)。
