# 标准响应

控制器成功响应由 `m.Meta` 决定：`envelope:"none"`（默认）直接返回 DTO，`envelope:"maltose"` 返回标准信封。`status` 决定 HTTP 状态；204 输出空响应。框架默认响应器与 `MiddlewareResponse()` 遵循同一声明。

`MiddlewareResponse()` 还负责业务错误及普通 Handler 的标准响应。自定义 Problem Details 时使用自己的错误中间件。

## 响应结构

声明 `envelope:"maltose"` 后，成功响应格式为：

```json
{
  "code": 0,
  "message": "OK",
  "data": {}
}
```

- `code`: 业务码
- `message`: 业务说明
- `data`: 业务数据

## HTTP 状态码映射

当前中间件内置了以下映射：

| 业务码 | HTTP 状态码 |
| --- | --- |
| `CodeOK` | `200` |
| `CodeValidationFailed` | `400` |
| `CodeNotFound` | `404` |
| `CodeNotAuthorized` | `401` |
| `CodeForbidden` | `403` |
| 其他错误码 | `500` |

这意味着业务错误并不总是 `200 OK`。

## 如何启用

```go
package main

import "github.com/graingo/maltose/net/mhttp"

func main() {
    s := mhttp.New()
    s.Use(mhttp.MiddlewareResponse())
    s.Run()
}
```

## 控制器绑定场景

对控制器绑定路由来说，框架会自动把控制器返回值写入 `Request`，`MiddlewareResponse()` 会继续完成序列化。

```go
func (c *Controller) GetUser(ctx context.Context, req *v1.GetUserReq) (*v1.GetUserRes, error) {
    return &v1.GetUserRes{
        UserID: req.UserID,
    }, nil
}
```

## 普通处理器场景

如果你使用的是普通 `func(*mhttp.Request)` 处理器，并且希望标准响应中间件接管输出，就不要直接 `r.JSON(...)`，而是：

- 成功时调用 `r.SetHandlerResponse(data)`
- 失败时调用 `r.Error(err)`

```go
func getUserHandler(r *mhttp.Request) {
    user, err := loadUser(r.Request.Context())
    if err != nil {
        r.Error(err)
        return
    }

    r.SetHandlerResponse(user)
}
```

## 自定义业务码

你可以定义自己的业务码，并继续复用同一套响应结构：

```go
var CodeInvalidCredentials = mcode.New(40001, "用户名或密码错误", nil)

func (c *Controller) Login(ctx context.Context, req *v1.LoginReq) (*v1.LoginRes, error) {
    return nil, merror.NewCode(CodeInvalidCredentials)
}
```

## 什么时候不要用它

以下场景更适合直接手写响应：

- 文件下载
- 流式输出
- WebSocket
- 已经明确约定了非 JSON 响应格式的接口

这类路由可以不挂载 `MiddlewareResponse()`，或者在处理器里直接写响应并结束请求。
