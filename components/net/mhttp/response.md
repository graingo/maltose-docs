# 响应处理

Maltose 框架提供了便捷的 HTTP 响应处理功能，简化了返回各种类型数据的过程。

## 基本响应机制

在 Maltose 中，控制器方法的返回值会被自动转换为 HTTP 响应：

```go
func (c *UserController) GetUser(ctx context.Context, req *GetUserReq) (*GetUserRes, error) {
    // 返回响应结构体和 nil 错误
    return &GetUserRes{
        ID:   req.ID,
        Name: "Test User",
    }, nil
}
```

默认情况下，Maltose 使用内置的 `internalMiddlewareDefaultResponse` 中间件将响应转换为适当的格式。该中间件将会：

1. 检查响应是否已经被写入
2. 处理错误情况
3. 处理控制器返回值
4. 如果没有明确的响应，返回空字符串

## 错误响应

返回错误会被转换为错误响应：

```go
import "errors"

func (c *UserController) GetUser(ctx context.Context, req *GetUserReq) (*GetUserRes, error) {
    // 返回标准错误
    return nil, errors.New("user not found")
}
```

### 使用错误码

使用 Maltose 的错误码机制可以设置自定义状态码和错误信息：

```go
import "github.com/graingo/maltose/errors/merror"
import "github.com/graingo/maltose/errors/mcode"

func (c *UserController) GetUser(ctx context.Context, req *GetUserReq) (*GetUserRes, error) {
    // 使用预定义错误码
    return nil, merror.NewCode(mcode.CodeNotFound, "用户不存在")
}
```

## 标准响应中间件

如果需要统一的 JSON 响应格式，可以使用 `MiddlewareResponse` 中间件：

```go
import "github.com/graingo/maltose/net/mhttp"

func main() {
    s := m.Server()

    // 使用标准响应中间件
    s.Use(mhttp.MiddlewareResponse())

    // ...
}
```

这会将所有响应转换为以下标准格式：

```json
{
  "code": 0, // 业务码
  "message": "success", // 提示信息
  "data": {} // 业务数据
}
```

## 直接使用 Gin 的响应方法

由于 Maltose 是基于 Gin 构建的，您可以直接使用 Gin 提供的所有响应方法：

```go
func handler(r *mhttp.Request) {
    // JSON 响应
    r.JSON(200, map[string]interface{}{
        "message": "success",
        "data": "some data",
    })

    // 字符串响应
    r.String(200, "Hello World")

    // 更多 Gin 提供的响应方法...
}
```

完整的 Gin 响应方法列表可以参考 [Gin 文档](https://gin-gonic.com/docs/examples/rendering/)。

## 最佳实践

- 对于简单 API 使用标准的控制器返回方式
- 对于需要统一格式的 API 使用响应中间件
- 对于需要特殊处理的响应使用 Gin 的原生方法
- 创建一致的错误处理机制，便于客户端处理错误情况
