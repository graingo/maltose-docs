# 错误处理策略

Maltose 的错误处理核心由 `mcode` 和 `merror` 组成：

- `mcode` 定义错误码
- `merror` 让错误码和 Go 的 `error` 体系结合

## 基本原则

- DAO 层返回原始错误
- Logic 层把原始错误转换成业务错误
- Controller 层直接返回 `(*Res, error)`，让框架统一处理

## `mcode`

框架内置了一组通用错误码，例如：

- `mcode.CodeValidationFailed`
- `mcode.CodeNotFound`
- `mcode.CodeNotAuthorized`
- `mcode.CodeForbidden`
- `mcode.CodeInternalError`

也可以定义自己的业务码：

```go
var (
    CodeUserNotFound        = mcode.New(20001, "用户不存在", nil)
    CodeInvalidCredentials  = mcode.New(20002, "用户名或密码错误", nil)
)
```

## `merror`

### 创建业务错误

```go
return nil, merror.NewCode(CodeUserNotFound)
```

### 包装底层错误

```go
if err := repo.Save(ctx, user); err != nil {
    return nil, merror.WrapCode(err, mcode.CodeInternalError, "保存用户失败")
}
```

## 与 `MiddlewareResponse()` 的配合

启用 `mhttp.MiddlewareResponse()` 后：

- 成功响应会输出 `{code, message, data}`
- 失败响应会从 `error` 中提取业务码和错误信息

当前内置 HTTP 状态码映射如下：

| 业务码 | HTTP 状态码 |
| --- | --- |
| `CodeOK` | `200` |
| `CodeValidationFailed` | `400` |
| `CodeNotFound` | `404` |
| `CodeNotAuthorized` | `401` |
| `CodeForbidden` | `403` |
| 其他错误 | `500` |

因此，业务错误并不总是 `200 OK`。

## 推荐写法

### Logic 层

```go
func (s *UserLogic) Login(ctx context.Context, req *v1.LoginReq) (*v1.LoginRes, error) {
    user, err := s.repo.FindByUsername(ctx, req.Username)
    if err != nil {
        return nil, convertGormError(err)
    }
    if !checkPassword(user, req.Password) {
        return nil, merror.NewCode(CodeInvalidCredentials)
    }

    return &v1.LoginRes{Token: "some-token"}, nil
}
```

### Controller 层

```go
func (c *Controller) Login(ctx context.Context, req *v1.LoginReq) (*v1.LoginRes, error) {
    return service.User().Login(ctx, req)
}
```

## 普通处理器的写法

如果你不是用控制器绑定，而是直接写 `func(*mhttp.Request)`，在启用了 `MiddlewareResponse()` 的前提下：

- 成功时使用 `r.SetHandlerResponse(...)`
- 失败时使用 `r.Error(err)`

```go
func getUserHandler(r *mhttp.Request) {
    user, err := service.User().GetUser(r.Request.Context(), 1)
    if err != nil {
        r.Error(err)
        return
    }

    r.SetHandlerResponse(user)
}
```

## 第三方错误转换

### GORM

```go
func convertGormError(err error) error {
    if err == nil {
        return nil
    }
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return merror.NewCode(CodeUserNotFound)
    }
    return merror.WrapCode(err, mcode.CodeInternalError, "数据库操作失败")
}
```

### Redis

`mredis.Get` 返回的是 `(*mvar.Var, error)`，不存在时 `val == nil`。

```go
func getUserCache(ctx context.Context, userID string) (*User, error) {
    val, err := m.Redis().Get(ctx, "user:"+userID)
    if err != nil {
        return nil, merror.WrapCode(err, mcode.CodeInternalError, "缓存读取失败")
    }
    if val == nil {
        return nil, merror.NewCode(CodeUserNotFound)
    }

    var user User
    if err := json.Unmarshal([]byte(val.String()), &user); err != nil {
        return nil, merror.WrapCode(err, mcode.CodeInternalError, "缓存反序列化失败")
    }
    return &user, nil
}
```

## 自定义响应结构

如果你不想使用 `MiddlewareResponse()` 的默认结构，可以自定义中间件，但不要和默认标准响应中间件同时挂载。

```go
func CustomResponseMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        r.Next()

        if r.Writer.Written() {
            return
        }

        if len(r.Errors) > 0 {
            err := r.Errors.Last().Err
            code := merror.Code(err)
            httpStatus := http.StatusInternalServerError

            switch code {
            case mcode.CodeValidationFailed:
                httpStatus = http.StatusBadRequest
            case mcode.CodeNotFound:
                httpStatus = http.StatusNotFound
            case mcode.CodeNotAuthorized:
                httpStatus = http.StatusUnauthorized
            case mcode.CodeForbidden:
                httpStatus = http.StatusForbidden
            }

            r.JSON(httpStatus, map[string]any{
                "success": false,
                "code":    code.Code(),
                "message": err.Error(),
            })
            return
        }

        r.JSON(http.StatusOK, map[string]any{
            "success": true,
            "data":    r.GetHandlerResponse(),
        })
    }
}
```

## 最佳实践

- 业务错误要有稳定的业务码，不要只靠字符串判断。
- 系统错误尽量包装后再往上抛，保留错误链。
- 日志记录用 `mlog.Warnw`、`mlog.Errorw` 或 `mlog.Errorf`，不要吞错。
- 统一在 Logic 层做错误语义转换，避免 Controller 层出现一堆底层库判断。
