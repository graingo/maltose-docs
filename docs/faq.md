# 常见问题 (FAQ)

### Q: Maltose 和 Go-Frame (GF) 是什么关系？

**A:** Maltose 在设计哲学和分层思想上深度参考了 [Go-Frame](https://goframe.org)，特别是其工程化的目录结构、模块化的组件设计以及面向接口的开发模式。然而，Maltose 并非 GF 的封装或分支。Maltose 在底层技术选型上更为轻量，例如 Web 框架基于 Gin（而非 GF 自研的 ghttp），ORM 基于 GORM（而非 GF 的 gorm），配置和日志组件也选择了 Logrus 等社区广泛认可的库。

您可以将 Maltose 看作是 "GF 的设计思想" + "Gin 生态" 的一个实践，旨在提供一个同样强大但更易于上手和定制的开发框架。

### Q: Maltose 和 Gin 是什么关系？

**A:** Maltose 的 Web 服务核心 (`mhttp`) 是基于 [Gin](https://github.com/gin-gonic/gin) 构建的。我们没有重新发明轮子，而是选择站在巨人的肩膀上，继承了 Gin 的高性能 Radix 树路由和广泛的中间件生态。

在 Gin 的基础上，Maltose 提供了更高级别的抽象和封装，例如：

- 结构化的配置驱动服务器。
- 与 `mlog`, `mtrace`, `mmetric` 等可观测性组件的深度集成。
- 标准化的路由注册、分组和控制器绑定流程。
- 统一的请求/响应模型和错误处理机制。

### Q: 如何在 Maltose 中使用 WebSocket？

**A:** 由于 `mhttp` 基于 Gin，您可以直接使用社区中成熟的 Gin WebSocket 中间件或库。一个常见的做法是，在 Controller 中，将 HTTP 请求升级（Upgrade）为 WebSocket 连接，然后进行后续处理。

```go
import (
    "github.com/gorilla/websocket"
    "github.com/graingo/maltose/net/mhttp"
)

var upgrader = websocket.Upgrader{
    // ... 配置，例如 CheckOrigin
}

func WsHandler(r *mhttp.Request) {
    // 将 HTTP 连接升级为 WebSocket 连接
    conn, err := upgrader.Upgrade(r.Writer, r.Request, nil)
    if err != nil {
        // 处理错误
        return
    }
    defer conn.Close()

    // 开始 WebSocket 的读写循环
    for {
        mt, message, err := conn.ReadMessage()
        if err != nil {
            // 处理读错误，通常意味着连接已关闭
            break
        }

        // ... 处理收到的消息 ...

        // 将消息写回客户端
        err = conn.WriteMessage(mt, message)
        if err != nil {
            // 处理写错误
            break
        }
    }
}
```

### Q: 如何自定义框架的错误响应格式？

**A:** 框架默认的响应格式是由 `mhttp.MiddlewareResponse()` 中间件控制的。如果您想完全替换它，可以移除这个中间件，并编写您自己的响应处理中间件。

您的自定义中间件可以：

1.  调用 `r.Next()` 执行业务逻辑。
2.  检查 `r.Response.GetError()` 是否有错误。
3.  根据错误类型（是否为 `*merror.Error`）来构建您自己的 JSON 结构。
4.  使用 `r.SetJson()` 或类似方法将最终的响应写入 `http.ResponseWriter`。

### Q: 我该如何为一个 Logic/Service 编写单元测试？

**A:** 请参考我们的 [测试指南](./advanced/testing.md#单元测试)，其中详细介绍了如何利用 Mock 技术（如 `gomock`）来解耦依赖，从而对业务逻辑进行独立的单元测试。
