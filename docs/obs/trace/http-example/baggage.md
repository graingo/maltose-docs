# HTTP 示例-Baggage

本文档将展示如何在 Maltose 框架中使用 Baggage 功能，在服务间传递自定义上下文信息。

## 什么是 Baggage？

Baggage 是 OpenTelemetry 提供的一种机制，用于在分布式系统的服务间传递键值对形式的上下文信息。与 TraceID 和 SpanID 不同，Baggage 可以携带任意的业务数据，例如用户 ID、租户 ID、请求 ID 等。

Baggage 的主要特点包括：

1. **跨服务传递**：Baggage 会随着追踪上下文一起在服务间传递
2. **业务数据传递**：可以携带任意的业务数据
3. **不直接显示在追踪系统中**：Baggage 中的信息不会自动显示在追踪系统中，需要显式地添加到 Span 的属性中才能可见

## Baggage 的使用场景

Baggage 在以下场景中特别有用：

1. **用户身份传递**：将用户 ID 或会话 ID 传递给下游服务，便于下游服务了解请求的用户上下文
2. **租户信息传递**：在多租户系统中，将租户 ID 传递给下游服务
3. **请求元数据传递**：传递请求 ID、来源渠道等元数据
4. **调试信息传递**：传递调试标志或配置

## 基本用法

### 设置 Baggage

```go
package main

import (
    "context"
    "log"

    "go.opentelemetry.io/otel/baggage"
    "go.opentelemetry.io/otel/attribute"
)

func main() {
    // 创建一个上下文
    ctx := context.Background()

    // 创建 Baggage 成员
    userID, err := baggage.NewMember("user.id", "12345")
    if err != nil {
        log.Fatalf("创建 Baggage 成员失败: %v", err)
    }

    tenantID, err := baggage.NewMember("tenant.id", "acme-corp")
    if err != nil {
        log.Fatalf("创建 Baggage 成员失败: %v", err)
    }

    // 创建 Baggage
    bag, err := baggage.New(userID, tenantID)
    if err != nil {
        log.Fatalf("创建 Baggage 失败: %v", err)
    }

    // 将 Baggage 添加到上下文
    ctx = baggage.ContextWithBaggage(ctx, bag)

    // 使用带有 Baggage 的上下文
    processRequest(ctx)
}

func processRequest(ctx context.Context) {
    // 从上下文中获取 Baggage
    bag := baggage.FromContext(ctx)

    // 获取 Baggage 成员的值
    userID := bag.Member("user.id").Value()
    tenantID := bag.Member("tenant.id").Value()

    log.Printf("处理用户 %s 的请求，租户: %s", userID, tenantID)
}
```

在这个示例中，我们：

1. 创建了两个 Baggage 成员：`user.id` 和 `tenant.id`
2. 创建了一个包含这两个成员的 Baggage
3. 将 Baggage 添加到上下文中
4. 在 `processRequest` 函数中，从上下文中获取 Baggage 并读取成员的值

### 简化的 Baggage API

Maltose 框架提供了简化的 Baggage API，使得设置和获取 Baggage 更加方便：

```go
package main

import (
    "context"
    "log"

    "github.com/graingo/maltose/trace"
)

func main() {
    // 创建一个上下文
    ctx := context.Background()

    // 设置 Baggage
    ctx = trace.WithBaggage(ctx, map[string]string{
        "user.id":   "12345",
        "tenant.id": "acme-corp",
    })

    // 使用带有 Baggage 的上下文
    processRequest(ctx)
}

func processRequest(ctx context.Context) {
    // 获取 Baggage 值
    userID := trace.BaggageValue(ctx, "user.id")
    tenantID := trace.BaggageValue(ctx, "tenant.id")

    log.Printf("处理用户 %s 的请求，租户: %s", userID, tenantID)
}
```

在这个示例中，我们使用了 Maltose 框架提供的 `trace.WithBaggage` 和 `trace.BaggageValue` 函数，简化了 Baggage 的设置和获取。

## 在 HTTP 服务中使用 Baggage

### 服务端设置 Baggage

```go
package main

import (
    "log"
    "net/http"

    "github.com/graingo/maltose"
    "github.com/graingo/maltose/trace"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "baggage-server",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建 Maltose 应用
    app := maltose.New()

    // 使用链路追踪中间件
    app.Use(trace.Middleware())

    // 添加 Baggage 中间件
    app.Use(func(c *maltose.Context) {
        // 从请求头中获取用户 ID
        userID := c.GetHeader("X-User-ID")
        if userID != "" {
            // 设置 Baggage
            ctx := trace.WithBaggage(c.Request.Context(), map[string]string{
                "user.id": userID,
            })

            // 更新请求上下文
            c.Request = c.Request.WithContext(ctx)
        }

        c.Next()
    })

    // 注册路由
    app.GET("/api/users/:id/profile", func(c *maltose.Context) {
        ctx := c.Request.Context()

        // 获取 Baggage 值
        userID := trace.BaggageValue(ctx, "user.id")

        // 获取当前请求的 Span
        span := trace.SpanFromContext(ctx)

        // 将 Baggage 值添加到 Span 属性中，使其在追踪系统中可见
        span.SetAttributes(
            attribute.String("user.id", userID),
        )

        // 返回响应
        c.JSON(http.StatusOK, map[string]interface{}{
            "id":    c.Param("id"),
            "name":  "Test User",
            "email": "test@example.com",
        })
    })

    // 启动服务
    app.Run(":8080")
}
```

在这个示例中，我们：

1. 添加了一个中间件，从请求头中获取用户 ID 并设置到 Baggage 中
2. 在路由处理函数中，获取 Baggage 值并将其添加到 Span 属性中
3. 这样，用户 ID 就会显示在追踪系统中，便于分析和调试

### 客户端传递 Baggage

```go
package main

import (
    "context"
    "io/ioutil"
    "log"
    "net/http"

    "github.com/graingo/maltose/trace"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "baggage-client",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建上下文
    ctx := context.Background()

    // 创建 Span
    ctx, span := trace.NewSpan(ctx, "client-request")
    defer span.End()

    // 设置 Baggage
    ctx = trace.WithBaggage(ctx, map[string]string{
        "user.id":   "12345",
        "tenant.id": "acme-corp",
    })

    // 创建 HTTP 请求
    req, err := http.NewRequestWithContext(ctx, "GET", "http://localhost:8080/api/users/12345/profile", nil)
    if err != nil {
        log.Fatalf("创建请求失败: %v", err)
    }

    // 添加请求头
    req.Header.Set("X-User-ID", "12345")

    // 使用支持链路追踪的 HTTP 客户端
    client := &http.Client{Transport: trace.HTTPTransport}

    // 发送请求
    resp, err := client.Do(req)
    if err != nil {
        log.Fatalf("发送请求失败: %v", err)
    }
    defer resp.Body.Close()

    // 读取响应
    body, err := ioutil.ReadAll(resp.Body)
    if err != nil {
        log.Fatalf("读取响应失败: %v", err)
    }

    log.Printf("响应: %s", body)
}
```

在这个示例中，我们：

1. 创建了一个 Span 和上下文
2. 设置了 Baggage，包含用户 ID 和租户 ID
3. 创建了一个 HTTP 请求，并将上下文传递给请求
4. 使用支持链路追踪的 HTTP 客户端发送请求

当这个请求发送到服务端时，Baggage 会通过 HTTP 头部传递，服务端可以读取这些值。

## 完整示例：微服务间传递用户上下文

下面是一个完整的示例，展示了如何在微服务架构中使用 Baggage 传递用户上下文。我们将创建三个服务：

1. **API 网关**：接收用户请求，设置用户上下文，调用用户服务
2. **用户服务**：提供用户信息，调用订单服务
3. **订单服务**：提供用户的订单信息

### API 网关服务

```go
package main

import (
    "context"
    "io/ioutil"
    "log"
    "net/http"

    "github.com/graingo/maltose"
    "github.com/graingo/maltose/trace"
    "go.opentelemetry.io/otel/attribute"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "api-gateway",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建 Maltose 应用
    app := maltose.New()

    // 使用链路追踪中间件
    app.Use(trace.Middleware())

    // 添加用户上下文中间件
    app.Use(func(c *maltose.Context) {
        // 从请求头或 Cookie 中获取用户 ID
        userID := c.GetHeader("X-User-ID")
        if userID == "" {
            // 从 Cookie 中获取
            userID = c.Cookie("user_id")
        }

        if userID != "" {
            // 设置 Baggage
            ctx := trace.WithBaggage(c.Request.Context(), map[string]string{
                "user.id": userID,
            })

            // 更新请求上下文
            c.Request = c.Request.WithContext(ctx)

            // 获取当前请求的 Span
            span := trace.SpanFromContext(ctx)

            // 将用户 ID 添加到 Span 属性中
            span.SetAttributes(
                attribute.String("user.id", userID),
            )
        }

        c.Next()
    })

    // 注册路由
    app.GET("/api/profile", func(c *maltose.Context) {
        ctx := c.Request.Context()

        // 获取 Baggage 值
        userID := trace.BaggageValue(ctx, "user.id")
        if userID == "" {
            c.String(http.StatusUnauthorized, "未授权")
            return
        }

        // 创建 HTTP 请求
        req, err := http.NewRequestWithContext(ctx, "GET", "http://localhost:8081/users/"+userID, nil)
        if err != nil {
            c.String(http.StatusInternalServerError, "创建请求失败")
            return
        }

        // 使用支持链路追踪的 HTTP 客户端
        client := &http.Client{Transport: trace.HTTPTransport}

        // 发送请求
        resp, err := client.Do(req)
        if err != nil {
            c.String(http.StatusInternalServerError, "调用用户服务失败")
            return
        }
        defer resp.Body.Close()

        // 读取响应
        body, err := ioutil.ReadAll(resp.Body)
        if err != nil {
            c.String(http.StatusInternalServerError, "读取响应失败")
            return
        }

        // 返回响应
        c.Data(resp.StatusCode, "application/json", body)
    })

    // 启动服务
    app.Run(":8080")
}
```

### 用户服务

```go
package main

import (
    "context"
    "io/ioutil"
    "log"
    "net/http"

    "github.com/graingo/maltose"
    "github.com/graingo/maltose/trace"
    "go.opentelemetry.io/otel/attribute"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "user-service",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建 Maltose 应用
    app := maltose.New()

    // 使用链路追踪中间件
    app.Use(trace.Middleware())

    // 注册路由
    app.GET("/users/:id", func(c *maltose.Context) {
        ctx := c.Request.Context()

        // 获取 Baggage 值
        userID := trace.BaggageValue(ctx, "user.id")

        // 获取当前请求的 Span
        span := trace.SpanFromContext(ctx)

        // 将 Baggage 值添加到 Span 属性中
        span.SetAttributes(
            attribute.String("user.id", userID),
            attribute.String("param.id", c.Param("id")),
        )

        // 验证用户 ID
        if userID != c.Param("id") {
            span.AddEvent("user.id mismatch")
            c.String(http.StatusForbidden, "禁止访问其他用户的信息")
            return
        }

        // 创建 HTTP 请求，获取用户订单
        req, err := http.NewRequestWithContext(ctx, "GET", "http://localhost:8082/orders?user_id="+userID, nil)
        if err != nil {
            c.String(http.StatusInternalServerError, "创建请求失败")
            return
        }

        // 使用支持链路追踪的 HTTP 客户端
        client := &http.Client{Transport: trace.HTTPTransport}

        // 发送请求
        resp, err := client.Do(req)
        if err != nil {
            c.String(http.StatusInternalServerError, "调用订单服务失败")
            return
        }
        defer resp.Body.Close()

        // 读取响应
        ordersBody, err := ioutil.ReadAll(resp.Body)
        if err != nil {
            c.String(http.StatusInternalServerError, "读取响应失败")
            return
        }

        // 返回用户信息和订单信息
        c.JSON(http.StatusOK, map[string]interface{}{
            "id":     userID,
            "name":   "Test User",
            "email":  "test@example.com",
            "orders": string(ordersBody),
        })
    })

    // 启动服务
    app.Run(":8081")
}
```

### 订单服务

```go
package main

import (
    "log"
    "net/http"

    "github.com/graingo/maltose"
    "github.com/graingo/maltose/trace"
    "go.opentelemetry.io/otel/attribute"
)

func main() {
    // 初始化链路追踪
    tp, err := trace.InitTracer(trace.Config{
        ServiceName: "order-service",
        Endpoint:    "http://localhost:14268/api/traces",
    })
    if err != nil {
        log.Fatalf("初始化链路追踪失败: %v", err)
    }
    defer tp.Shutdown(context.Background())

    // 创建 Maltose 应用
    app := maltose.New()

    // 使用链路追踪中间件
    app.Use(trace.Middleware())

    // 注册路由
    app.GET("/orders", func(c *maltose.Context) {
        ctx := c.Request.Context()

        // 获取查询参数
        queryUserID := c.Query("user_id")

        // 获取 Baggage 值
        baggageUserID := trace.BaggageValue(ctx, "user.id")

        // 获取当前请求的 Span
        span := trace.SpanFromContext(ctx)

        // 将 Baggage 值和查询参数添加到 Span 属性中
        span.SetAttributes(
            attribute.String("baggage.user.id", baggageUserID),
            attribute.String("query.user.id", queryUserID),
        )

        // 验证用户 ID
        if baggageUserID != queryUserID {
            span.AddEvent("user.id mismatch")
            c.String(http.StatusForbidden, "禁止访问其他用户的订单")
            return
        }

        // 返回用户订单
        c.JSON(http.StatusOK, []map[string]interface{}{
            {
                "id":          "order-001",
                "user_id":     baggageUserID,
                "product":     "Product 1",
                "amount":      99.99,
                "create_time": "2023-01-01T12:00:00Z",
            },
            {
                "id":          "order-002",
                "user_id":     baggageUserID,
                "product":     "Product 2",
                "amount":      149.99,
                "create_time": "2023-01-02T14:30:00Z",
            },
        })
    })

    // 启动服务
    app.Run(":8082")
}
```

### 测试微服务 Baggage 传递

1. 启动 Jaeger：

```bash
docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

2. 启动订单服务：

```bash
go run order-service.go
```

3. 启动用户服务：

```bash
go run user-service.go
```

4. 启动 API 网关服务：

```bash
go run api-gateway.go
```

5. 发送请求：

```bash
curl -H "X-User-ID: 12345" http://localhost:8080/api/profile
```

6. 在 Jaeger UI 中查看追踪信息：

```
http://localhost:16686
```

在 Jaeger UI 中，您可以看到一个完整的追踪链路，包括：

1. API 网关接收请求，设置用户上下文
2. API 网关调用用户服务
3. 用户服务验证用户 ID
4. 用户服务调用订单服务
5. 订单服务验证用户 ID
6. 订单服务返回用户订单
7. 用户服务返回用户信息和订单信息
8. API 网关返回响应

在每个 Span 中，您可以看到 `user.id` 属性，这是从 Baggage 中提取并添加到 Span 属性中的。这样，您可以清晰地看到请求是由哪个用户发起的，以及用户上下文是如何在服务间传递的。

## 最佳实践

### 1. 选择合适的 Baggage 键

Baggage 键应该具有明确的含义和命名空间，例如：

- `user.id`：用户 ID
- `tenant.id`：租户 ID
- `request.id`：请求 ID
- `session.id`：会话 ID

### 2. 限制 Baggage 数量和大小

Baggage 会在每个请求中传递，过多或过大的 Baggage 会增加网络开销。建议：

- 只传递必要的信息
- 限制 Baggage 的数量和大小
- 避免在 Baggage 中存储大型对象或敏感信息

### 3. 将 Baggage 值添加到 Span 属性中

Baggage 中的信息不会自动显示在追踪系统中，建议将重要的 Baggage 值添加到 Span 属性中：

```go
// 获取 Baggage 值
userID := trace.BaggageValue(ctx, "user.id")

// 获取当前请求的 Span
span := trace.SpanFromContext(ctx)

// 将 Baggage 值添加到 Span 属性中
span.SetAttributes(
    attribute.String("user.id", userID),
)
```

### 4. 验证 Baggage 值

在安全敏感的场景中，应该验证 Baggage 值的合法性：

```go
// 获取 Baggage 值
userID := trace.BaggageValue(ctx, "user.id")

// 验证用户 ID
if userID != c.Param("id") {
    c.String(http.StatusForbidden, "禁止访问其他用户的信息")
    return
}
```

### 5. 使用中间件统一处理 Baggage

使用中间件可以统一处理 Baggage 的设置和验证：

```go
// 添加用户上下文中间件
app.Use(func(c *maltose.Context) {
    // 从请求头或 Cookie 中获取用户 ID
    userID := c.GetHeader("X-User-ID")
    if userID != "" {
        // 设置 Baggage
        ctx := trace.WithBaggage(c.Request.Context(), map[string]string{
            "user.id": userID,
        })

        // 更新请求上下文
        c.Request = c.Request.WithContext(ctx)
    }

    c.Next()
})
```

## 总结

在本文档中，我们展示了如何在 Maltose 框架中使用 Baggage 功能，在服务间传递自定义上下文信息，包括：

1. Baggage 的基本概念和使用场景
2. 设置和获取 Baggage 的基本用法
3. 在 HTTP 服务中使用 Baggage
4. 完整的微服务 Baggage 传递示例
5. Baggage 使用的最佳实践

通过使用 Baggage，您可以在分布式系统中轻松传递业务上下文信息，提高系统的可观测性和可调试性。
