# 中间件开发

中间件（Middleware）是 Maltose（以及其底层的 Gin）Web 框架中的一个核心概念。它允许您在请求处理链中插入自定义逻辑，用于处理认证、日志、限流、CORS 等横切关注点。

## 中间件是什么？

在 `mhttp` 中，一个中间件本质上就是一个函数，其签名为 `func(*mhttp.Request)`。它接收一个 `*mhttp.Request` 对象作为参数，该对象封装了当前的 HTTP 请求和响应。

在这个函数内部，您可以执行以下操作：

1.  在请求到达最终的业务 Handler 之前，执行某些代码（例如：身份验证）。
2.  调用 `r.Next()` 将控制权传递给请求处理链中的下一个中间件或最终的 Handler。
3.  在业务 Handler 执行完毕后，执行某些代码（例如：记录响应日志、修改响应头）。
4.  在特定条件下，通过调用 `r.Abort()` 或不调用 `r.Next()` 来提前终止请求链（例如：认证失败）。

## 示例：JWT 认证中间件

下面，我们将通过一个完整的示例，展示如何编写一个用于 JWT（JSON Web Token）身份验证的中间件。

### 1. 定义中间件函数

```go
package middleware

import (
    "context"
    "strings"
    "github.com/graingo/maltose/errors/mcode"
    "github.com/graingo/maltose/errors/merror"
    "github.com/graingo/maltose/net/mhttp"
)

// claims a struct that will be encoded to a JWT.
type claims struct {
    UserID   uint   `json:"user_id"`
    Username string `json:"username"`
    // ... other claims
}

// AuthMiddleware creates a JWT authentication middleware.
func AuthMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        // 1. 从 Authorization header 获取 token
        authHeader := r.GetHeader("Authorization")
        if authHeader == "" {
            r.Error(merror.NewCode(mcode.CodeNotAuthorized, "缺少认证头"))
            r.Abort()
            return
        }

        parts := strings.SplitN(authHeader, " ", 2)
        if !(len(parts) == 2 && parts[0] == "Bearer") {
            r.Error(merror.NewCode(mcode.CodeNotAuthorized, "认证头格式错误"))
            r.Abort()
            return
        }

        tokenString := parts[1]

        // 2. 解析和验证 token
        // 注意：这里的 "my-secret-key" 应该从配置中安全地获取
        // "your_jwt_library" 是您选择的 JWT 库，例如 jwt-go, jwx 等
        claims, err := your_jwt_library.ParseToken(tokenString, "my-secret-key")
        if err != nil {
            r.Error(merror.NewCode(mcode.CodeNotAuthorized, "无效的 Token"))
            r.Abort()
            return
        }

        // 3. 将解析出的用户信息存入 context
        // 这样，后续的业务逻辑就可以从中获取当前用户信息
        ctx := r.Request.Context()
        ctx = context.WithValue(ctx, "userID", claims.UserID)
        ctx = context.WithValue(ctx, "username", claims.Username)

        // 用新的 context 替换掉旧的
        r.Request = r.Request.WithContext(ctx)

        // 4. 调用 Next() 继续处理请求
        r.Next()
    }
}
```

**代码解释**:

- 我们从 `Authorization` 请求头中提取 `Bearer Token`。
- 我们使用一个（假设的）JWT 库来解析和验证这个 Token。在实际项目中，您需要选择一个具体的库来完成这部分工作。
- 如果 Token 无效或缺失，我们通过 `r.Error()` 记录一个错误，并调用 `r.Abort()` 来立即终止请求，防止它进入后续的业务逻辑。
- 如果 Token 有效，我们将解析出的用户信息（如 `UserID`）存入 `context.Context` 中。这是一个非常重要的实践，它使得下游的任何函数都能安全地获取到当前用户的身份信息。
- 最后，我们调用 `r.Next()`，允许请求继续传递。

### 2. 使用中间件

现在，您可以将这个中间件应用到需要保护的路由上。

```go
package route

import (
    "my-app/internal/controller/user"
    "my-app/internal/middleware" // 引入我们刚刚创建的中间件
    "github.com/graingo/maltose/net/mhttp"
)

func Register(s *mhttp.Server) {
    // 公共接口，无需认证
    s.POST("/login", user.Login)
    s.POST("/register", user.Register)

    // 需要认证的接口分组
    // 我们将 AuthMiddleware 应用到这个分组上
    authGroup := s.Group("/api", mhttp.WithMiddleware(middleware.AuthMiddleware()))
    {
        authGroup.GET("/profile", user.GetProfile)
        authGroup.PUT("/profile", user.UpdateProfile)
        // ... 其他需要认证的路由
    }
}
```

通过这种方式，所有 `/api` 前缀下的路由都会先经过 `AuthMiddleware` 的检查，只有在认证通过后，请求才能真正到达 `user.GetProfile` 等业务处理器。这极大地提高了代码的模块化和复用性。
