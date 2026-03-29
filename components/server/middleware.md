# 中间件

`mhttp` 的中间件类型是 `mhttp.MiddlewareFunc`，底层基于 Gin 的执行模型，适合处理认证、日志、限流、请求上下文注入等横切逻辑。

## 中间件类型

```go
type MiddlewareFunc func(*mhttp.Request)
```

`Request` 内嵌了 `*gin.Context`，因此常用的 `Next`、`Abort`、`AbortWithError`、`Set`、`Get`、`JSON`、`Header` 等方法都可以直接使用。

## 默认中间件

`mhttp.New()` 创建服务器时会自动注册以下内部中间件：

| 中间件 | 作用 |
| --- | --- |
| `Trace` | 为请求创建和传播链路上下文 |
| `Recovery` | 捕获 panic，避免进程崩溃 |
| `Metric` | 记录 HTTP 指标 |
| `DefaultResponse` | 保证未显式写响应的请求也有默认返回 |

以下中间件需要手动启用：

| 中间件 | 作用 |
| --- | --- |
| `mhttp.MiddlewareResponse()` | 统一输出标准 JSON 响应 |
| `mhttp.MiddlewareLog()` | 记录请求日志 |
| `mhttp.MiddlewareRateLimit(...)` | 全局限流 |
| `mhttp.MiddlewareRateLimitByIP(...)` | 按 IP 限流 |

## 使用方式

### 全局中间件

```go
s := mhttp.New()

s.Use(
    mhttp.MiddlewareLog(),
    mhttp.MiddlewareResponse(),
)
```

### 路由组中间件

`RouterGroup.Use` 接收的是切片，文档示例更推荐直接使用变参形式的 `Middleware(...)`。

```go
api := s.Group("/api")
api.Middleware(AuthMiddleware())

api.GET("/profile", profileHandler)
api.POST("/logout", logoutHandler)
```

### 单个路由中间件

路由注册顺序是 `GET(path, handler, middlewares...)`。

```go
s.GET("/admin/profile", profileHandler, AuthMiddleware())
```

## 自定义中间件

### 基础结构

```go
func MyMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        // 前置处理

        r.Next()

        // 后置处理
    }
}
```

### 认证中间件示例

```go
package middleware

import (
    "net/http"
    "strings"

    "github.com/golang-jwt/jwt/v5"
    "github.com/graingo/maltose/errors/mcode"
    "github.com/graingo/maltose/errors/merror"
    "github.com/graingo/maltose/net/mhttp"
)

func AuthMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        authHeader := r.GetHeader("Authorization")
        if authHeader == "" {
            r.AbortWithError(http.StatusUnauthorized, merror.NewCode(mcode.CodeNotAuthorized, "missing authorization header"))
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            r.AbortWithError(http.StatusUnauthorized, merror.NewCode(mcode.CodeNotAuthorized, "invalid authorization header"))
            return
        }

        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return []byte("your-secret-key"), nil
        })
        if err != nil || !token.Valid {
            r.AbortWithError(http.StatusUnauthorized, merror.WrapCode(err, mcode.CodeNotAuthorized, "invalid token"))
            return
        }

        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            r.Set("user_id", claims["user_id"])
            r.Set("username", claims["username"])
        }

        r.Next()
    }
}
```

### 在处理器中读取中间件写入的数据

```go
func profileHandler(r *mhttp.Request) {
    userID, _ := r.Get("user_id")
    username, _ := r.Get("username")

    r.JSON(http.StatusOK, map[string]any{
        "user_id":  userID,
        "username": username,
    })
}
```

## 常见模式

### 自定义 CORS

当前公开 API 中没有内置 `MiddlewareCORS()`，需要自行编写。

```go
func CORSMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        r.Header("Access-Control-Allow-Origin", "*")
        r.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        r.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if r.Request.Method == "OPTIONS" {
            r.AbortWithStatus(http.StatusNoContent)
            return
        }

        r.Next()
    }
}
```

### 请求 ID

```go
func RequestIDMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        requestID := r.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = generateRequestID()
        }

        r.Set("request_id", requestID)
        r.Header("X-Request-ID", requestID)
        r.Next()
    }
}
```

### 统一错误兜底

```go
func SafeMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        defer func() {
            if recoverErr := recover(); recoverErr != nil {
                r.AbortWithError(
                    http.StatusInternalServerError,
                    merror.NewCode(mcode.CodeInternalError, "internal server error"),
                )
            }
        }()

        r.Next()
    }
}
```

## 最佳实践

- 中间件只做一类事情，例如认证、审计、限流、上下文注入。
- 如果想让 `MiddlewareResponse()` 接管输出，不要在处理器里提前调用 `r.JSON(...)`，而是写入 `r.SetHandlerResponse(...)` 或 `r.Error(err)`。
- 需要在处理器和后续逻辑之间传值时，优先使用 `r.Set(...)` / `r.Get(...)`。
- 需要写入日志链路字段时，优先从 `r.Request.Context()` 获取上下文，不要自己维护另一套 TraceID。
