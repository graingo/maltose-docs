# 中间件

中间件是 Maltose HTTP 服务中一个重要的概念，它允许开发者在请求处理过程中插入自定义逻辑，如日志记录、认证授权、请求验证等。

## 中间件的概念

在 Maltose 中，中间件是一个接收 `*Request` 对象的函数，定义如下：

```go
// MiddlewareFunc 定义中间件函数类型
type MiddlewareFunc func(*Request)
```

中间件可以执行以下操作：

- 在请求处理前执行代码
- 修改请求和响应
- 终止请求处理流程
- 调用下一个中间件或最终处理函数

## 内置中间件

Maltose 框架内置了一些中间件：

### 内部默认中间件

服务器初始化时会自动添加以下中间件：

```go
// 添加默认中间件
s.Use(
    internalMiddlewareRecovery(),      // 错误恢复中间件
    internalMiddlewareServerTrace(),   // 追踪中间件
    internalMiddlewareMetric(),        // 指标收集中间件
    internalMiddlewareDefaultResponse(), // 默认响应处理中间件
)
```

#### 恢复中间件

捕获 panic 并返回 500 错误：

```go
// internalMiddlewareRecovery 内部错误恢复中间件
func internalMiddlewareRecovery() MiddlewareFunc {
    return func(r *Request) {
        defer func() {
            if err := recover(); err != nil {
                // 记录错误日志
                r.Logger().Errorf(r.Request.Context(), "Panic recovered: %v", err)
                // 返回 500 错误
                r.String(500, "Internal Server Error")
            }
        }()
        r.Next()
    }
}
```

#### 分布式追踪中间件

自动集成 OpenTelemetry 的分布式追踪：

```go
// internalMiddlewareServerTrace 返回一个中间件用于OpenTelemetry跟踪
func internalMiddlewareServerTrace() MiddlewareFunc {
    // ... 追踪中间件实现
}
```

### 可选内置中间件

#### 标准响应中间件

提供标准的 JSON 响应格式：

```go
import "github.com/graingo/maltose/net/mhttp"

func main() {
    s := m.Server()

    // 使用标准响应中间件
    s.Use(mhttp.MiddlewareResponse())

    // ...
}
```

标准响应格式：

```json
{
  "code": 0, // 业务码
  "message": "success", // 提示信息
  "data": {} // 业务数据
}
```

#### 日志中间件

记录 HTTP 请求的日志：

```go
import "github.com/graingo/maltose/net/mhttp"

func main() {
    s := m.Server()

    // 使用日志中间件
    s.Use(mhttp.MiddlewareLog())

    // ...
}
```

## 自定义中间件

创建自定义中间件：

```go
import "github.com/graingo/maltose/net/mhttp"

// 简单的认证中间件
func AuthMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        token := r.Header.Get("Authorization")

        if token == "" {
            r.JSON(401, map[string]interface{}{
                "code": 401,
                "message": "Unauthorized",
            })
            r.Abort() // 终止后续处理
            return
        }

        // 验证 token 逻辑...

        // 设置用户信息到上下文
        r.Set("userId", "12345")

        r.Next() // 调用下一个处理函数
    }
}

// 使用中间件
func main() {
    s := m.Server()

    // 全局使用
    s.Use(AuthMiddleware())

    // ...
}
```

## 添加中间件

### 全局中间件

```go
// 添加全局中间件
s.Use(AuthMiddleware())
```

### 路由组中间件

```go
// 创建路由组并添加中间件
api := s.Group("/api")
api.Use([]mhttp.MiddlewareFunc{AuthMiddleware()})

// 在组中定义路由
api.GET("/users", GetUsers)
```

## 中间件最佳实践

- **保持简单**：每个中间件应该只关注一个功能
- **性能考虑**：中间件会对性能产生影响，尽量减少不必要的操作
- **错误处理**：妥善处理中间件中的错误，避免影响后续处理
- **避免阻塞**：中间件中的耗时操作应考虑异步处理
- **顺序考虑**：合理安排中间件的执行顺序，如先认证再授权
