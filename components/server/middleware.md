# 中间件

中间件是 Web 开发中的核心概念，它允许您在请求到达最终处理器之前或响应发送给客户端之前执行通用逻辑。Maltose 基于 Gin 的中间件机制，提供了强大且灵活的中间件支持。

## 中间件概念

中间件本质上是一个函数，它可以：

- **预处理请求**：在请求到达业务逻辑之前进行身份验证、参数验证、日志记录等
- **后处理响应**：在响应发送之前进行数据转换、缓存设置、响应头添加等
- **请求拦截**：根据条件决定是否继续处理请求或直接返回响应

### 执行顺序

中间件按照注册顺序执行，形成一个"洋葱模型"：

```
请求 → 中间件1 → 中间件2 → 业务处理器 → 中间件2 → 中间件1 → 响应
```

## 内置中间件

Maltose 自动注册了核心的生产级中间件，同时也提供了一些可选的实用中间件供您按需启用。

| 中间件                 | 功能                     | 自动启用        |
| :--------------------- | :----------------------- | :-------------- |
| **Recovery**           | 捕获 panic，防止服务崩溃 | ✅              |
| **Trace**              | OpenTelemetry 链路追踪   | ✅              |
| **Metric**             | Prometheus 性能指标采集  | ✅              |
| **DefaultResponse**    | 默认响应处理             | ✅              |
| **MiddlewareLog**      | 记录详细的请求和响应日志 | ❌ (需手动启用) |
| **RateLimit**          | 基于令牌桶的请求速率限制 | ❌ (需手动启用) |
| **MiddlewareResponse** | 标准化 JSON 响应结构     | ❌ (需手动启用) |

## 使用中间件

### 全局中间件

全局中间件对所有路由生效：

```go
s := mhttp.New()

// 启用标准响应中间件
s.Use(mhttp.MiddlewareResponse())

// 启用 CORS 中间件
s.Use(mhttp.MiddlewareCORS())
```

### 路由组中间件

为特定路由组添加中间件：

```go
// 需要认证的 API 组
authGroup := s.Group("/api/v1")
authGroup.Use(JWTAuthMiddleware())

authGroup.GET("/profile", getUserProfile)
authGroup.POST("/logout", userLogout)

// 公开 API 组
publicGroup := s.Group("/public")
publicGroup.GET("/health", healthCheck)
```

### 单个路由中间件

为特定路由添加中间件：

```go
// 只有这个路由使用特殊的中间件
s.GET("/admin/sensitive", AdminOnlyMiddleware(), sensitiveHandler)
```

## 自定义中间件开发

### 基础结构

Maltose 中间件的基本结构：

```go
func MyMiddleware() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        // 请求预处理
        // ...

        // 继续执行下一个中间件或处理器
        r.Next()

        // 响应后处理
        // ...
    }
}
```

### 实际示例：JWT 认证中间件

以下是一个完整的 JWT 认证中间件实现：

```go
package middleware

import (
    "strings"

    "github.com/golang-jwt/jwt/v5"
    "github.com/graingo/maltose/errors/merror"
    "github.com/graingo/maltose/errors/mcode"
    "github.com/graingo/maltose/net/mhttp"
)

// JWTAuthMiddleware JWT 认证中间件
func JWTAuthMiddleware() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        // 1. 获取 Authorization 头
        authHeader := r.GetHeader("Authorization")
        if authHeader == "" {
            r.AbortWithError(merror.NewCode(mcode.CodeUnauthorized, "缺少认证头"))
            return
        }

        // 2. 解析 Bearer Token
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        if tokenString == authHeader {
            r.AbortWithError(merror.NewCode(mcode.CodeUnauthorized, "认证头格式错误"))
            return
        }

        // 3. 验证 JWT Token
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            // 验证签名方法
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, merror.NewCode(mcode.CodeUnauthorized, "无效的签名方法")
            }
            return []byte("your-secret-key"), nil
        })

        if err != nil || !token.Valid {
            r.AbortWithError(merror.NewCode(mcode.CodeUnauthorized, "无效的令牌"))
            return
        }

        // 4. 提取用户信息
        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            // 将用户信息存储到上下文中
            r.SetCtxVar("user_id", claims["user_id"])
            r.SetCtxVar("username", claims["username"])
        }

        // 5. 继续执行下一个中间件
        r.Next()
    }
}
```

### 使用认证中间件

```go
func main() {
    s := mhttp.New()

    // 公开路由
    s.POST("/login", loginHandler)
    s.GET("/health", healthHandler)

    // 需要认证的路由组
    authGroup := s.Group("/api/v1")
    authGroup.Use(JWTAuthMiddleware())
    {
        authGroup.GET("/profile", getUserProfile)
        authGroup.PUT("/profile", updateUserProfile)
        authGroup.POST("/logout", userLogout)
    }

    s.Run()
}

// 在处理器中获取用户信息
func getUserProfile(r *mhttp.Request) {
    userID := r.GetCtxVar("user_id")
    username := r.GetCtxVar("username")

    // 使用用户信息处理业务逻辑
    // ...
}
```

## 高级中间件模式

### 条件中间件

根据条件决定是否执行中间件逻辑：

```go
func ConditionalMiddleware(condition func(*mhttp.Request) bool) mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        if condition(r) {
            // 执行特定逻辑
            doSomething(r)
        }
        r.Next()
    }
}

// 使用示例
s.Use(ConditionalMiddleware(func(r *mhttp.Request) bool {
    return strings.HasPrefix(r.Request.URL.Path, "/api/")
}))
```

### 参数化中间件

创建可配置的中间件：

```go
func RateLimitMiddleware(maxRequests int, duration time.Duration) mhttp.HandlerFunc {
    limiter := rate.NewLimiter(rate.Every(duration), maxRequests)

    return func(r *mhttp.Request) {
        if !limiter.Allow() {
            r.AbortWithError(merror.NewCode(mcode.CodeTooManyRequests, "请求过于频繁"))
            return
        }
        r.Next()
    }
}

// 使用示例
s.Use(RateLimitMiddleware(100, time.Minute)) // 每分钟最多 100 次请求
```

### 异步中间件

执行不阻塞请求的后台任务：

```go
func AsyncLoggingMiddleware() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        start := time.Now()

        // 继续处理请求
        r.Next()

        // 异步记录日志
        go func() {
            duration := time.Since(start)
            logEntry := LogEntry{
                Method:     r.Request.Method,
                Path:       r.Request.URL.Path,
                Duration:   duration,
                StatusCode: r.Writer.Status(),
                UserAgent:  r.GetHeader("User-Agent"),
                Timestamp:  time.Now(),
            }

            // 发送到日志系统
            sendToLogSystem(logEntry)
        }()
    }
}
```

## 中间件最佳实践

### 1. 性能考虑

- **避免重复计算**：将计算结果缓存在上下文中
- **异步处理**：对于耗时操作，考虑异步执行
- **资源管理**：及时释放资源，避免内存泄漏

```go
func OptimizedMiddleware() mhttp.HandlerFunc {
    // 预计算或初始化资源
    cache := make(map[string]interface{})

    return func(r *mhttp.Request) {
        // 使用预计算的资源
        if value, exists := cache[r.Request.URL.Path]; exists {
            r.SetCtxVar("cached_value", value)
        }

        r.Next()
    }
}
```

### 2. 错误处理

- **使用统一的错误格式**：配合 `merror` 和 `mcode` 系统
- **适当的 HTTP 状态码**：确保状态码与错误类型匹配
- **详细的错误信息**：帮助调试和问题定位

```go
func SafeMiddleware() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        defer func() {
            if err := recover(); err != nil {
                // 记录错误
                logger.Error("中间件 panic", "error", err)

                // 返回标准错误响应
                r.AbortWithError(merror.NewCode(mcode.CodeInternalError, "服务器内部错误"))
            }
        }()

        r.Next()
    }
}
```

### 3. 可测试性

编写可测试的中间件：

```go
func TestableMiddleware(validator func(string) bool) mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        token := r.GetHeader("X-API-Key")
        if !validator(token) {
            r.AbortWithError(merror.NewCode(mcode.CodeUnauthorized, "无效的 API 密钥"))
            return
        }
        r.Next()
    }
}

// 测试代码
func TestMiddleware(t *testing.T) {
    middleware := TestableMiddleware(func(token string) bool {
        return token == "valid-token"
    })

    // 测试中间件逻辑
    // ...
}
```

## 常用中间件集合

### CORS 中间件

```go
func CORSMiddleware() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        r.Header("Access-Control-Allow-Origin", "*")
        r.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        r.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if r.Request.Method == "OPTIONS" {
            r.AbortWithStatus(204)
            return
        }

        r.Next()
    }
}
```

### 请求 ID 中间件

```go
func RequestIDMiddleware() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        requestID := r.GetHeader("X-Request-ID")
        if requestID == "" {
            requestID = generateUUID()
        }

        r.SetCtxVar("request_id", requestID)
        r.Header("X-Request-ID", requestID)

        r.Next()
    }
}
```

通过合理使用中间件，您可以构建出功能强大、可维护性高的 Web 应用程序。记住，中间件的设计应该遵循单一职责原则，每个中间件只负责一个特定的功能。
