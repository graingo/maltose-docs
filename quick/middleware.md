# 中间件初试用

中间件允许您在请求处理前后执行自定义逻辑，例如日志记录、权限验证等。

## 基本概念

中间件是一个接收 `*mhttp.Request` 参数的函数，通过调用 `r.Next()` 传递控制权给下一个中间件或处理函数：

```go
package main

import (
    "time"
    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

// 日志中间件
func LogMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        // 请求处理前逻辑
        start := time.Now()
        path := r.Request.URL.Path

        // 继续处理请求
        r.Next()

        // 请求处理后逻辑
        latency := time.Since(start)
        statusCode := r.Writer.Status()
        m.Log().Infof(r.Request.Context(),
            "[HTTP] %s %s | Status: %d | Latency: %v",
            r.Method, path, statusCode, latency)
    }
}

func main() {
    s := m.Server()

    // 使用中间件
    s.Use(LogMiddleware())

    // 注册路由
    s.GET("/hello", func(r *mhttp.Request) {
        r.String(200, "Hello World")
    })

    s.Run()
}
```

## 中间件注册

Maltose 提供了多种方式注册中间件：

### 全局中间件

```go
// 注册全局中间件
s.Use(LogMiddleware())
s.Use(AuthMiddleware())
```

### 路由组中间件

```go
// 创建路由组
api := s.Group("/api")

// 为路由组添加中间件
api.Use(AuthMiddleware())

// 注册组内路由
api.GET("/users", GetUsers)
```

## 终止请求处理

在中间件中可以通过 `r.Abort()` 终止请求处理流程：

```go
// 认证中间件
func AuthMiddleware() mhttp.MiddlewareFunc {
    return func(r *mhttp.Request) {
        token := r.GetHeader("Authorization")
        if token == "" {
            r.JSON(401, map[string]interface{}{
                "code": 401,
                "message": "未授权访问",
            })
            // 终止请求
            r.Abort()
            return
        }

        // 继续处理
        r.Next()
    }
}
```

## 中间件执行顺序

中间件按照注册的顺序执行，每个中间件可以在请求处理前后执行逻辑：

```
请求 -> 中间件1(前) -> 中间件2(前) -> 处理函数 -> 中间件2(后) -> 中间件1(后) -> 响应
```

## 内置中间件

Maltose 提供了一些内置中间件：

```go
// 标准响应中间件
s.Use(mhttp.MiddlewareResponse())

// 日志中间件
s.Use(mhttp.MiddlewareLog())
```

## 小结

中间件是 Web 应用开发中不可或缺的工具，通过合理使用中间件，可以：

1. 分离关注点，使代码更加模块化
2. 实现横切关注点（如日志、认证）
3. 提高代码的复用性
4. 简化请求处理逻辑

在下一节中，我们将介绍如何实现[统一返回结构](uniform-response.md)，提供标准化的 API 响应格式。
