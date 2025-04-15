# 响应处理

`mhttp` 组件提供了丰富的响应处理功能，使开发者能够轻松构建各种类型的 HTTP 响应。

## 响应类型

### 文本响应

发送纯文本响应：

```go
server := mhttp.New()

server.GET("/text", func(r *mhttp.Request) {
    // 返回文本响应
    r.Response.Text("Hello World")
})

// 带状态码的文本响应
server.GET("/text-status", func(r *mhttp.Request) {
    r.Response.TextWithStatus("Resource not found", http.StatusNotFound)
})
```

### JSON 响应

发送 JSON 格式的响应：

```go
server.GET("/json", func(r *mhttp.Request) {
    // 返回JSON响应
    r.Response.JSON(map[string]interface{}{
        "message": "Success",
        "data": []string{"item1", "item2", "item3"},
        "count": 3,
    })
})

// 带状态码的JSON响应
server.GET("/json-status", func(r *mhttp.Request) {
    r.Response.JSONWithStatus(map[string]string{
        "error": "Unauthorized access",
    }, http.StatusUnauthorized)
})

// 结构体自动转JSON
type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

server.GET("/user", func(r *mhttp.Request) {
    user := User{
        ID:    1,
        Name:  "张三",
        Email: "zhangsan@example.com",
    }

    r.Response.JSON(user)
})
```

### XML 响应

发送 XML 格式的响应：

```go
// 定义支持XML的结构体
type Product struct {
    ID    int     `xml:"id"`
    Name  string  `xml:"name"`
    Price float64 `xml:"price"`
}

server.GET("/xml", func(r *mhttp.Request) {
    product := Product{
        ID:    101,
        Name:  "智能手机",
        Price: 999.99,
    }

    // 返回XML响应
    r.Response.XML(product)
})

// 带状态码的XML响应
server.GET("/xml-status", func(r *mhttp.Request) {
    products := []Product{
        {ID: 101, Name: "智能手机", Price: 999.99},
        {ID: 102, Name: "笔记本电脑", Price: 1299.99},
    }

    r.Response.XMLWithStatus(products, http.StatusOK)
})
```

### HTML 响应

发送 HTML 内容响应：

```go
server.GET("/html", func(r *mhttp.Request) {
    html := `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Maltose示例</title>
    </head>
    <body>
        <h1>欢迎使用Maltose</h1>
        <p>这是一个HTML响应示例</p>
    </body>
    </html>
    `

    // 返回HTML响应
    r.Response.HTML(html)
})

// 带状态码的HTML响应
server.GET("/html-status", func(r *mhttp.Request) {
    r.Response.HTMLWithStatus("<h1>404 - 页面未找到</h1>", http.StatusNotFound)
})
```

### 文件响应

发送文件内容：

```go
server.GET("/file", func(r *mhttp.Request) {
    // 返回文件内容
    r.Response.File("./static/document.pdf")
})

// 指定文件名的下载
server.GET("/download", func(r *mhttp.Request) {
    r.Response.FileAttachment("./reports/data.xlsx", "报表.xlsx")
})
```

### 二进制数据响应

发送二进制数据：

```go
server.GET("/binary", func(r *mhttp.Request) {
    // 二进制数据
    data := []byte{0x48, 0x65, 0x6C, 0x6C, 0x6F}

    // 设置Content-Type
    r.SetHeader("Content-Type", "application/octet-stream")

    // 返回二进制数据
    r.Response.Data(data)
})
```

## 状态码设置

### 设置 HTTP 状态码

```go
server.GET("/status", func(r *mhttp.Request) {
    // 设置HTTP状态码
    r.Response.Status(http.StatusCreated)

    r.Response.JSON(map[string]string{
        "message": "资源创建成功",
    })
})
```

### 常用状态码响应

```go
server.GET("/ok", func(r *mhttp.Request) {
    // 200 OK
    r.Response.OK("操作成功")
})

server.GET("/created", func(r *mhttp.Request) {
    // 201 Created
    r.Response.Created(map[string]interface{}{
        "id": 12345,
        "name": "新建项目",
    })
})

server.GET("/no-content", func(r *mhttp.Request) {
    // 204 No Content
    r.Response.NoContent()
})

server.GET("/bad-request", func(r *mhttp.Request) {
    // 400 Bad Request
    r.Response.BadRequest("无效的请求参数")
})

server.GET("/unauthorized", func(r *mhttp.Request) {
    // 401 Unauthorized
    r.Response.Unauthorized("身份验证失败")
})

server.GET("/forbidden", func(r *mhttp.Request) {
    // 403 Forbidden
    r.Response.Forbidden("没有操作权限")
})

server.GET("/not-found", func(r *mhttp.Request) {
    // 404 Not Found
    r.Response.NotFound("资源不存在")
})

server.GET("/server-error", func(r *mhttp.Request) {
    // 500 Internal Server Error
    r.Response.InternalServerError("服务器内部错误")
})
```

## 响应头设置

### 设置单个响应头

```go
server.GET("/header", func(r *mhttp.Request) {
    // 设置单个响应头
    r.SetHeader("X-API-Version", "1.0")
    r.SetHeader("X-Request-ID", uuid.New().String())

    r.Response.JSON(map[string]string{
        "message": "响应头已设置",
    })
})
```

### 设置多个响应头

```go
server.GET("/headers", func(r *mhttp.Request) {
    // 设置多个响应头
    r.SetHeaders(map[string]string{
        "X-API-Version": "1.0",
        "X-Request-ID": uuid.New().String(),
        "X-Response-Time": time.Now().Format(time.RFC3339),
    })

    r.Response.JSON(map[string]string{
        "message": "多个响应头已设置",
    })
})
```

### 常用响应头设置

```go
server.GET("/common-headers", func(r *mhttp.Request) {
    // 设置内容类型
    r.SetContentType("application/json; charset=utf-8")

    // 设置缓存控制
    r.SetHeader("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate")
    r.SetHeader("Pragma", "no-cache")
    r.SetHeader("Expires", "0")

    // 设置CORS头
    r.SetHeader("Access-Control-Allow-Origin", "*")
    r.SetHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

    r.Response.JSON(map[string]string{
        "message": "常用响应头已设置",
    })
})
```

## Cookie 设置

### 设置 Cookie

```go
server.GET("/set-cookie", func(r *mhttp.Request) {
    // 设置简单Cookie
    r.SetCookie("user_id", "12345")

    // 设置Cookie带选项
    r.SetCookieWithOptions("session", "abcdef123456", &http.Cookie{
        Path:     "/",
        Domain:   "example.com",
        MaxAge:   3600,           // 1小时过期
        Secure:   true,           // 仅HTTPS
        HttpOnly: true,           // JavaScript无法访问
        SameSite: http.SameSiteStrictMode,
    })

    r.Response.JSON(map[string]string{
        "message": "Cookie已设置",
    })
})
```

### 删除 Cookie

```go
server.GET("/delete-cookie", func(r *mhttp.Request) {
    // 删除Cookie
    r.DeleteCookie("user_id")
    r.DeleteCookie("session")

    r.Response.JSON(map[string]string{
        "message": "Cookie已删除",
    })
})
```

## 重定向

### 响应重定向

```go
server.GET("/redirect", func(r *mhttp.Request) {
    // 临时重定向 (302)
    r.Response.Redirect("/new-page")
})

server.GET("/redirect-permanent", func(r *mhttp.Request) {
    // 永久重定向 (301)
    r.Response.RedirectPermanent("/new-location")
})

server.GET("/redirect-status", func(r *mhttp.Request) {
    // 自定义状态码重定向
    r.Response.RedirectWithStatus("/special-page", http.StatusTemporaryRedirect) // 307
})

// 外部URL重定向
server.GET("/external", func(r *mhttp.Request) {
    r.Response.Redirect("https://example.com")
})
```

## 流式响应

### 分块传输

长时间运行的请求或大型数据集的分块响应：

```go
server.GET("/stream", func(r *mhttp.Request) {
    // 设置分块传输
    r.SetHeader("Transfer-Encoding", "chunked")
    r.SetHeader("Content-Type", "text/plain; charset=utf-8")

    // 获取响应写入器
    w := r.Response.Writer()

    // 刷新缓冲区确保头信息被发送
    if f, ok := w.(http.Flusher); ok {
        f.Flush()
    }

    // 发送多个数据块
    for i := 1; i <= 5; i++ {
        fmt.Fprintf(w, "数据块 %d\n", i)

        // 刷新发送这个块
        if f, ok := w.(http.Flusher); ok {
            f.Flush()
        }

        // 模拟处理时间
        time.Sleep(1 * time.Second)
    }
})
```

### 服务器发送事件(SSE)

实现服务器发送事件：

```go
server.GET("/sse", func(r *mhttp.Request) {
    // 设置SSE头
    r.SetHeader("Content-Type", "text/event-stream")
    r.SetHeader("Cache-Control", "no-cache")
    r.SetHeader("Connection", "keep-alive")

    // 获取响应写入器
    w := r.Response.Writer()

    // 发送SSE事件
    for i := 1; i <= 10; i++ {
        // 发送事件
        fmt.Fprintf(w, "event: update\n")
        fmt.Fprintf(w, "data: {\"id\": %d, \"message\": \"更新事件\", \"time\": \"%s\"}\n\n",
            i, time.Now().Format(time.RFC3339))

        // 刷新缓冲区
        if f, ok := w.(http.Flusher); ok {
            f.Flush()
        }

        // 等待一秒钟
        time.Sleep(1 * time.Second)

        // 检查客户端是否已断开连接
        if r.Context().Done() != nil {
            select {
            case <-r.Context().Done():
                return
            default:
            }
        }
    }
})
```

## 压缩响应

配合中间件使用的响应压缩：

```go
// 注册压缩中间件
server.Use(mhttp.GzipMiddleware())

server.GET("/compressed", func(r *mhttp.Request) {
    // 大量文本内容，将自动压缩
    largeText := strings.Repeat("这是一段将被压缩的大文本内容。", 1000)

    r.Response.Text(largeText)
})
```

## 跨域响应(CORS)

配合中间件处理跨域请求：

```go
// 设置CORS中间件
corsMiddleware := mhttp.CorsMiddleware(mhttp.CorsOptions{
    AllowOrigins:     []string{"https://example.com", "https://api.example.com"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
    ExposeHeaders:    []string{"Content-Length", "X-Request-ID"},
    AllowCredentials: true,
    MaxAge:           86400, // 24小时
})

// 应用CORS中间件
server.Use(corsMiddleware)

server.GET("/api/data", func(r *mhttp.Request) {
    r.Response.JSON(map[string]string{
        "message": "这是一个支持CORS的API响应",
    })
})
```

## 性能优化

### 提前写入状态和头

对于长时间运行的请求，先发送状态和头：

```go
server.GET("/long-process", func(r *mhttp.Request) {
    // 设置头部
    r.SetHeader("Content-Type", "application/json")

    // 先写入状态和头部
    r.Response.WriteHeader(http.StatusOK)

    // 获取响应写入器
    w := r.Response.Writer()

    // 执行长时间运行的任务
    result := performLongRunningTask()

    // 写入处理结果
    json.NewEncoder(w).Encode(result)
})

func performLongRunningTask() map[string]interface{} {
    // 模拟长时间处理
    time.Sleep(5 * time.Second)

    return map[string]interface{}{
        "status": "completed",
        "result": "处理完成",
    }
}
```

## 响应模板

### 标准 API 响应

使用统一的 API 响应格式：

```go
// 定义API响应结构
type APIResponse struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

// 成功响应
server.GET("/api/success", func(r *mhttp.Request) {
    response := APIResponse{
        Code:    200,
        Message: "操作成功",
        Data:    map[string]interface{}{
            "items": []string{"item1", "item2", "item3"},
            "total": 3,
        },
    }

    r.Response.JSON(response)
})

// 错误响应
server.GET("/api/error", func(r *mhttp.Request) {
    response := APIResponse{
        Code:    400,
        Message: "操作失败",
        Error:   "参数验证错误：'id'字段为必填项",
    }

    r.Response.JSONWithStatus(response, http.StatusBadRequest)
})
```

## 最佳实践

1. **使用恰当的状态码**：根据操作的结果选择合适的 HTTP 状态码
2. **保持响应格式一致**：在整个 API 中使用一致的响应结构
3. **设置正确的内容类型**：确保 Response 的 Content-Type 与实际内容匹配
4. **考虑压缩大响应**：对于大型响应，使用 Gzip 等压缩算法
5. **控制 Cookie 的使用**：仅在必要时设置 Cookie，并使用合适的安全选项
6. **避免过度暴露**：仅返回客户端需要的数据，避免敏感信息泄露
7. **使用 HTTPS**：保护所有响应数据的传输安全
8. **考虑响应缓存**：适当设置缓存控制头以优化性能
