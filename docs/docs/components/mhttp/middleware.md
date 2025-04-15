# 中间件机制

`mhttp` 组件提供了强大的中间件机制，允许开发者在 HTTP 请求处理流程中插入自定义逻辑。中间件是实现横切关注点(如日志记录、认证、监控等)的理想方式。

## 中间件工作原理

中间件在 `mhttp` 中以责任链模式工作，每个中间件都可以：

1. 在请求处理前执行操作
2. 调用链中的下一个中间件
3. 在下一个中间件完成后执行操作

![中间件工作流程](./images/middleware-flow.png)

## 内置中间件

`mhttp` 提供了以下内置中间件：

### Logger 日志中间件

记录每个 HTTP 请求的详细信息，包括路径、方法、状态码、处理时间等：

```go
server := mhttp.New()
// 全局使用日志中间件
server.Use(mhttp.Logger())
```

### Recovery 恢复中间件

捕获处理过程中的 panic，避免服务器崩溃，并返回 500 错误：

```go
server := mhttp.New()
// 全局使用恢复中间件
server.Use(mhttp.Recovery())
```

### CORS 跨域中间件

处理跨域请求，支持自定义跨域规则：

```go
server := mhttp.New()
// 使用默认CORS配置
server.Use(mhttp.CORS())

// 使用自定义CORS配置
config := mhttp.CORSConfig{
    AllowOrigins:     []string{"https://example.com"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
    AllowHeaders:     []string{"Origin", "Content-Type"},
    ExposeHeaders:    []string{"Content-Length"},
    AllowCredentials: true,
    MaxAge:           12 * time.Hour,
}
server.Use(mhttp.CORSWithConfig(config))
```

### RequestID 请求 ID 中间件

为每个请求生成唯一 ID，便于跟踪和日志分析：

```go
server := mhttp.New()
server.Use(mhttp.RequestID())
```

### Gzip 压缩中间件

对响应内容进行 Gzip 压缩，减少传输数据量：

```go
server := mhttp.New()
server.Use(mhttp.Gzip())
```

### Static 静态文件中间件

提供静态文件服务：

```go
server := mhttp.New()
server.Use(mhttp.Static("/assets", "./public"))
```

### BasicAuth 基本认证中间件

实现 HTTP 基本认证：

```go
server := mhttp.New()
// 创建用户名/密码映射
accounts := map[string]string{
    "admin": "password",
    "user":  "secret",
}
server.Use(mhttp.BasicAuth(accounts))
```

## 中间件使用方法

中间件可以在不同级别应用：

### 全局中间件

应用于所有路由：

```go
server := mhttp.New()
// 添加全局中间件
server.Use(mhttp.Logger(), mhttp.Recovery())
```

### 路由组中间件

仅应用于特定路由组：

```go
server := mhttp.New()
// 创建带中间件的路由组
api := server.Group("/api", mhttp.Logger())
admin := server.Group("/admin", mhttp.BasicAuth(accounts))
```

### 单个路由中间件

仅应用于特定路由：

```go
server := mhttp.New()
// 为单个路由添加中间件
server.GET("/users", mhttp.Auth(), getUsers)
```

## 自定义中间件

开发自定义中间件非常简单，只需创建一个返回 `mhttp.HandlerFunc` 的函数：

```go
// 简单的计时中间件
func Timer() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        // 请求处理前的逻辑
        start := time.Now()

        // 调用下一个中间件
        r.Next()

        // 请求处理后的逻辑
        duration := time.Since(start)
        r.SetHeader("X-Response-Time", duration.String())
    }
}

// 使用自定义中间件
server := mhttp.New()
server.Use(Timer())
```

### 带配置的中间件

对于需要配置的中间件，可以创建配置结构体和工厂函数：

```go
// 限流中间件配置
type RateLimitConfig struct {
    Rate     int
    Burst    int
    TimeUnit time.Duration
}

// 限流中间件工厂函数
func RateLimit(config RateLimitConfig) mhttp.HandlerFunc {
    // 初始化限流器
    limiter := rate.NewLimiter(rate.Limit(config.Rate), config.Burst)

    return func(r *mhttp.Request) {
        // 检查是否允许请求
        if !limiter.Allow() {
            r.AbortWithStatus(http.StatusTooManyRequests)
            return
        }

        // 继续处理请求
        r.Next()
    }
}

// 使用带配置的自定义中间件
server := mhttp.New()
server.Use(RateLimit(RateLimitConfig{
    Rate:     10,
    Burst:    5,
    TimeUnit: time.Second,
}))
```

## 中断中间件链

在中间件中，可以使用 `Abort` 或 `AbortWithStatus` 终止后续中间件的执行：

```go
func AuthRequired() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        token := r.GetHeader("Authorization")
        if token == "" {
            // 终止后续中间件，返回401状态码
            r.AbortWithStatus(http.StatusUnauthorized)
            return
        }

        // 验证通过，继续处理
        r.Next()
    }
}
```

## 中间件顺序

中间件的执行顺序与注册顺序相同：

```go
server := mhttp.New()
// 中间件按照以下顺序执行
server.Use(mhttp.Logger())    // 第一个执行
server.Use(mhttp.Recovery())  // 第二个执行
server.Use(CustomMiddleware()) // 第三个执行
```

## 中间件最佳实践

1. **保持中间件轻量**：中间件应该只执行单一职责，避免复杂逻辑
2. **注意执行顺序**：Recovery 中间件通常应首先注册，以捕获其他中间件中的 panic
3. **避免阻塞操作**：耗时操作应异步处理，不要阻塞请求处理流程
4. **正确处理错误**：适当使用 Abort 方法，并设置正确的状态码
5. **共享数据**：使用 `r.Set()` 和 `r.Get()` 在中间件之间传递数据
6. **合理组织中间件**：将中间件按功能分组，并在适当的级别应用

## 示例：完整的中间件链

```go
server := mhttp.New()

// 全局中间件
server.Use(mhttp.Recovery())
server.Use(mhttp.Logger())
server.Use(mhttp.RequestID())

// API路由组
api := server.Group("/api")
api.Use(mhttp.CORS())
api.Use(RateLimit(RateLimitConfig{Rate: 100, Burst: 20}))

// 管理员路由组
admin := api.Group("/admin")
admin.Use(AuthRequired())
admin.Use(mhttp.BasicAuth(accounts))

// 特定路由中间件
admin.GET("/reports", CheckPermission("reports"), getReports)
```

## 常见问题与注意事项

1. 中间件中修改请求和响应必须在 `r.Next()` 之前进行
2. 响应体修改通常应在 `r.Next()` 之后进行
3. 避免在中间件链中多次写入响应体
4. 使用 `r.IsAborted()` 检查请求是否已经被中止
