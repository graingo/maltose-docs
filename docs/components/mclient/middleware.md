# 中间件

## 基本概念

中间件是一种在请求处理过程中插入自定义逻辑的机制。mclient 支持在请求发送前和响应接收后执行中间件。

## 使用中间件

### 添加中间件

```go
client := mclient.New()

// 添加日志中间件
client.Use(func(next mclient.HandlerFunc) mclient.HandlerFunc {
    return func(req *mclient.Request) (*mclient.Response, error) {
        start := time.Now()

        // 执行请求
        resp, err := next(req)

        // 记录请求耗时
        duration := time.Since(start)
        fmt.Printf("Request took %v\n", duration)

        return resp, err
    }
})
```

### 使用内置中间件

#### 日志中间件

```go
client := mclient.New()

// 添加日志中间件
logger := mlog.DefaultLogger()
client.Use(mclient.MiddlewareLog(logger))
```

#### 速率限制中间件

```go
client := mclient.New()

// 添加速率限制中间件
client.Use(mclient.MiddlewareRateLimit(mclient.RateLimitConfig{
    RequestsPerSecond: 5,  // 每秒 5 个请求
    Burst:             2,  // 允许突发 2 个请求
}))
```

## 创建自定义中间件

### 认证中间件

```go
// 创建认证中间件
authMiddleware := func(token string) mclient.MiddlewareFunc {
    return func(next mclient.HandlerFunc) mclient.HandlerFunc {
        return func(req *mclient.Request) (*mclient.Response, error) {
            // 添加认证头
            req.SetHeader("Authorization", "Bearer "+token)
            return next(req)
        }
    }
}

// 使用认证中间件
client.Use(authMiddleware("your-token"))
```

### 重试中间件

```go
// 创建重试中间件
retryMiddleware := func(maxRetries int) mclient.MiddlewareFunc {
    return func(next mclient.HandlerFunc) mclient.HandlerFunc {
        return func(req *mclient.Request) (*mclient.Response, error) {
            var resp *mclient.Response
            var err error

            // 尝试请求，最多重试 maxRetries 次
            for attempt := 0; attempt <= maxRetries; attempt++ {
                if attempt > 0 {
                    // 指数退避
                    backoff := time.Duration(1<<uint(attempt-1)) * 100 * time.Millisecond
                    time.Sleep(backoff)
                }

                resp, err = next(req)

                // 成功或不可重试的错误
                if err == nil && resp.StatusCode < 500 {
                    return resp, err
                }

                // 关闭响应以便重试
                if resp != nil {
                    resp.Close()
                }
            }

            return resp, err
        }
    }
}

// 使用重试中间件
client.Use(retryMiddleware(3))
```

## 中间件链

中间件按照添加的顺序执行，形成一个处理链。每个中间件可以选择是否继续执行下一个中间件。

```go
client := mclient.New()

// 添加多个中间件
client.Use(
    // 日志中间件
    func(next mclient.HandlerFunc) mclient.HandlerFunc {
        return func(req *mclient.Request) (*mclient.Response, error) {
            fmt.Printf("Request: %s %s\n", req.Request.Method, req.Request.URL.String())
            return next(req)
        }
    },

    // 认证中间件
    func(next mclient.HandlerFunc) mclient.HandlerFunc {
        return func(req *mclient.Request) (*mclient.Response, error) {
            req.SetHeader("Authorization", "Bearer token")
            return next(req)
        }
    },

    // 速率限制中间件
    mclient.MiddlewareRateLimit(mclient.RateLimitConfig{
        RequestsPerSecond: 5,
        Burst:             2,
    }),
)
```

## 中间件类型

```go
// 中间件函数类型
type MiddlewareFunc func(next HandlerFunc) HandlerFunc

// 处理器函数类型
type HandlerFunc func(req *Request) (*Response, error)
```
