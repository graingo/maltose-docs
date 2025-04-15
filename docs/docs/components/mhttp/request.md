# 请求处理

`mhttp` 组件提供了丰富的请求处理功能，使开发者能够轻松获取和处理 HTTP 请求中的各种数据。

## 获取请求参数

### 路径参数

使用 `GetParam` 方法获取 URL 路径中的动态参数：

```go
server := mhttp.New()

// 定义带参数的路由
server.GET("/users/:id", func(r *mhttp.Request) {
    // 获取路径参数
    id := r.GetParam("id")
    r.Response.Text(fmt.Sprintf("用户ID: %s", id))
})
```

### 查询参数

使用 `GetQuery` 系列方法获取 URL 查询参数：

```go
server.GET("/search", func(r *mhttp.Request) {
    // 获取查询参数
    keyword := r.GetQuery("keyword")
    page := r.GetQueryInt("page", 1)  // 带默认值
    size := r.GetQueryInt("size", 10) // 带默认值

    // 获取所有查询参数
    queries := r.GetQueries()

    // 检查参数是否存在
    if sortBy, exists := r.GetQueryWithCheck("sort"); exists {
        // 使用sortBy参数
    }

    r.Response.JSON(map[string]interface{}{
        "keyword": keyword,
        "page": page,
        "size": size,
        "queries": queries,
    })
})
```

### 表单数据

使用 `GetForm` 系列方法获取表单数据：

```go
server.POST("/submit", func(r *mhttp.Request) {
    // 获取表单数据
    name := r.GetForm("name")
    age := r.GetFormInt("age", 0)

    // 获取所有表单数据
    forms := r.GetForms()

    r.Response.JSON(map[string]interface{}{
        "name": name,
        "age": age,
        "forms": forms,
    })
})
```

### Cookie

使用 `GetCookie` 系列方法获取 Cookie：

```go
server.GET("/profile", func(r *mhttp.Request) {
    // 获取Cookie
    sessionID := r.GetCookie("session_id")

    // 检查Cookie是否存在
    if userID, exists := r.GetCookieWithCheck("user_id"); exists {
        // 使用userID
    }

    // 获取所有Cookie
    cookies := r.GetCookies()

    r.Response.Text(fmt.Sprintf("会话ID: %s", sessionID))
})
```

### 请求头

使用 `GetHeader` 系列方法获取请求头：

```go
server.GET("/api", func(r *mhttp.Request) {
    // 获取请求头
    userAgent := r.GetHeader("User-Agent")
    contentType := r.GetHeader("Content-Type")

    // 获取所有请求头
    headers := r.GetHeaders()

    r.Response.JSON(map[string]interface{}{
        "userAgent": userAgent,
        "contentType": contentType,
    })
})
```

## 请求体解析

### JSON 解析

使用 `BindJSON` 方法解析 JSON 请求体：

```go
type User struct {
    Name    string `json:"name"`
    Age     int    `json:"age"`
    Email   string `json:"email"`
}

server.POST("/users", func(r *mhttp.Request) {
    var user User
    // 绑定JSON数据到结构体
    if err := r.BindJSON(&user); err != nil {
        r.Response.JSONWithStatus(map[string]string{"error": err.Error()}, http.StatusBadRequest)
        return
    }

    // 使用解析后的数据
    r.Response.JSONWithStatus(user, http.StatusCreated)
})
```

### XML 解析

使用 `BindXML` 方法解析 XML 请求体：

```go
type Product struct {
    ID    string `xml:"id"`
    Name  string `xml:"name"`
    Price float64 `xml:"price"`
}

server.POST("/products", func(r *mhttp.Request) {
    var product Product
    // 绑定XML数据到结构体
    if err := r.BindXML(&product); err != nil {
        r.Response.JSONWithStatus(map[string]string{"error": err.Error()}, http.StatusBadRequest)
        return
    }

    // 使用解析后的数据
    r.Response.JSONWithStatus(product, http.StatusCreated)
})
```

### 参数验证

结合标签验证请求数据：

```go
type LoginRequest struct {
    Username string `json:"username" binding:"required,min=3,max=20"`
    Password string `json:"password" binding:"required,min=6"`
    Email    string `json:"email" binding:"email"`
}

server.POST("/login", func(r *mhttp.Request) {
    var login LoginRequest
    // 绑定并验证数据
    if err := r.BindJSON(&login); err != nil {
        r.Response.JSONWithStatus(map[string]string{"error": err.Error()}, http.StatusBadRequest)
        return
    }

    // 数据验证通过，继续处理
    r.Response.Text("登录成功")
})
```

## 文件处理

### 单文件上传

使用 `GetFile` 方法获取上传的文件：

```go
server.POST("/upload", func(r *mhttp.Request) {
    // 获取上传的文件
    file, err := r.GetFile("file")
    if err != nil {
        r.Response.JSONWithStatus(map[string]string{"error": err.Error()}, http.StatusBadRequest)
        return
    }

    // 保存文件
    if err := r.SaveFile(file, "./uploads/"+file.Filename); err != nil {
        r.Response.JSONWithStatus(map[string]string{"error": err.Error()}, http.StatusInternalServerError)
        return
    }

    r.Response.JSON(map[string]interface{}{
        "filename": file.Filename,
        "size": file.Size,
    })
})
```

### 多文件上传

使用 `GetFiles` 方法获取多个上传的文件：

```go
server.POST("/uploads", func(r *mhttp.Request) {
    // 获取所有上传的文件
    files, err := r.GetFiles("files")
    if err != nil {
        r.Response.JSONWithStatus(map[string]string{"error": err.Error()}, http.StatusBadRequest)
        return
    }

    results := make([]map[string]interface{}, 0)

    // 处理每个文件
    for _, file := range files {
        // 保存文件
        savePath := "./uploads/" + file.Filename
        if err := r.SaveFile(file, savePath); err != nil {
            r.Response.JSONWithStatus(map[string]string{"error": err.Error()}, http.StatusInternalServerError)
            return
        }

        results = append(results, map[string]interface{}{
            "filename": file.Filename,
            "size": file.Size,
            "path": savePath,
        })
    }

    r.Response.JSON(map[string]interface{}{
        "message": "文件上传成功",
        "files": results,
    })
})
```

## 请求上下文

### 请求上下文管理

`mhttp.Request` 提供了强大的上下文管理功能，可以在请求处理过程中存储和获取数据：

```go
server.Use(func(r *mhttp.Request) {
    // 在中间件中设置数据
    r.Set("requestTime", time.Now())
    r.Next()
})

server.GET("/time", func(r *mhttp.Request) {
    // 获取上下文中的数据
    requestTime, _ := r.Get("requestTime").(time.Time)
    duration := time.Since(requestTime)

    r.Response.JSON(map[string]interface{}{
        "requestTime": requestTime,
        "duration": duration.String(),
    })
})
```

### 超时控制

设置请求处理的超时时间：

```go
server.Use(func(r *mhttp.Request) {
    // 设置10秒超时
    ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
    defer cancel()

    // 使用新的上下文
    r.SetContext(ctx)

    // 检测超时
    done := make(chan struct{})
    go func() {
        r.Next()
        close(done)
    }()

    select {
    case <-done:
        return
    case <-ctx.Done():
        r.AbortWithStatus(http.StatusRequestTimeout)
        return
    }
})
```

## 请求信息获取

`mhttp.Request` 提供了多种方法获取请求的基本信息：

```go
server.GET("/info", func(r *mhttp.Request) {
    r.Response.JSON(map[string]interface{}{
        "method": r.Method(),             // 请求方法
        "path": r.Path(),                 // 请求路径
        "ip": r.ClientIP(),               // 客户端IP
        "userAgent": r.UserAgent(),       // 用户代理
        "host": r.Host(),                 // 主机名
        "protocol": r.Protocol(),         // 协议
        "contentType": r.ContentType(),   // 内容类型
        "referer": r.Referer(),           // 来源
        "isWebsocket": r.IsWebsocket(),   // 是否WebSocket请求
        "isAjax": r.IsAjax(),             // 是否AJAX请求
    })
})
```

## 区域化和国际化

获取客户端语言偏好：

```go
server.GET("/lang", func(r *mhttp.Request) {
    // 获取接受的语言
    acceptLanguage := r.GetHeader("Accept-Language")

    // 解析语言偏好
    langs := parseAcceptLanguage(acceptLanguage)

    // 根据偏好选择语言
    lang := chooseBestLanguage(langs, []string{"en", "zh-CN", "fr"})

    r.Response.JSON(map[string]interface{}{
        "acceptLanguage": acceptLanguage,
        "preferredLanguage": lang,
    })
})
```

## 请求调试

在开发过程中，可以使用 `Dump` 方法查看请求的详细信息：

```go
server.Use(func(r *mhttp.Request) {
    // 只在开发环境中启用
    if os.Getenv("APP_ENV") == "development" {
        // 打印请求信息
        r.Dump()
    }
    r.Next()
})
```

## 最佳实践

1. **使用适当的绑定方法**：根据 Content-Type 选择正确的绑定方法
2. **始终验证用户输入**：使用验证标签确保数据合法性
3. **合理设置文件上传限制**：防止大文件攻击
4. **使用上下文传递数据**：避免使用全局变量
5. **优先使用类型化的获取方法**：如 `GetQueryInt` 而不是手动转换
6. **检查错误**：特别是在解析请求体和处理文件上传时
