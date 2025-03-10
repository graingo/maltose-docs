# 获取请求参数

在 Web 开发中，获取客户端提交的参数是非常基础的需求。Maltose 框架提供了简便的方式来获取请求参数，包括查询参数(Query)、表单参数(Form)和 JSON 数据。

## 基本使用

以下示例展示了如何获取不同类型的请求参数:

```go
package main

import (
    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

func main() {
    s := m.Server()

    // 获取查询参数(Query)
    s.GET("/query", func(r *mhttp.Request) {
        // 获取名称为 "name" 的参数，默认值为 "world"
        name := r.Query("name", "world")
        r.String(200, "Hello "+name)
    })

    // 获取表单参数(Form)
    s.POST("/form", func(r *mhttp.Request) {
        // 获取表单参数
        username := r.PostForm("username", "guest")
        password := r.PostForm("password", "")

        if password == "" {
            r.String(400, "Password is required")
            return
        }

        r.JSON(200, map[string]interface{}{
            "username": username,
            "status": "success",
        })
    })

    // 获取JSON参数
    s.POST("/json", func(r *mhttp.Request) {
        // 将请求体绑定到 map
        var data map[string]interface{}
        if err := r.ShouldBindJSON(&data); err != nil {
            r.String(400, "Invalid JSON: "+err.Error())
            return
        }

        r.JSON(200, map[string]interface{}{
            "received": data,
            "status": "success",
        })
    })

    // 获取多种来源的参数
    s.GET("/all", func(r *mhttp.Request) {
        // 获取不同来源的参数
        fromQuery := r.Query("from")
        fromHeader := r.GetHeader("X-Custom-Header")
        fromCookie, _ := r.Cookie("session_id")

        r.JSON(200, map[string]interface{}{
            "from_query": fromQuery,
            "from_header": fromHeader,
            "from_cookie": fromCookie,
        })
    })

    s.Run()
}
```

## 参数获取方法

Maltose 提供了以下方法来获取不同类型的参数:

### 查询参数 (URL Query String)

```go
// 获取查询参数，不存在时返回默认值
name := r.Query("name", "default")

// 获取查询参数数组
ids := r.QueryArray("ids")

// 获取所有查询参数
queries := r.QueryMap()
```

### 表单参数 (POST Form)

```go
// 获取表单参数，不存在时返回默认值
username := r.PostForm("username", "guest")

// 获取表单参数数组
tags := r.PostFormArray("tags")

// 获取所有表单参数
forms := r.PostFormMap()
```

### JSON 数据

```go
// 绑定到结构体
var user User
if err := r.ShouldBindJSON(&user); err != nil {
    // 处理错误
}

// 绑定到 map
var data map[string]interface{}
if err := r.ShouldBindJSON(&data); err != nil {
    // 处理错误
}
```

### 其他来源

```go
// 获取路径参数
id := r.Param("id")

// 获取请求头
token := r.GetHeader("Authorization")

// 获取 Cookie
sessionID, err := r.Cookie("session_id")
```

## 参数类型自动识别

Maltose 基于 Gin，在获取参数时会自动进行类型转换，例如:

```go
// 自动将字符串转为整数
page := r.QueryInt("page", 1)
limit := r.QueryInt("limit", 10)

// 自动将字符串转为布尔值
enabled := r.QueryBool("enabled", false)
```

## 测试示例

可以使用以下 `curl` 命令测试上面的示例:

```bash
# 测试查询参数
curl "http://127.0.0.1:8080/query?name=maltose"

# 测试表单参数
curl -X POST -d "username=admin&password=secret" http://127.0.0.1:8080/form

# 测试 JSON 参数
curl -X POST -H "Content-Type: application/json" -d '{"username":"admin","info":{"age":20}}' http://127.0.0.1:8080/json

# 测试多种来源的参数
curl -H "X-Custom-Header: from-header" --cookie "session_id=123456" "http://127.0.0.1:8080/all?from=query"
```

## 参数获取建议

1. **始终设置默认值**: 使用参数获取方法的第二个参数设置默认值，避免空值引起的错误。
2. **使用参数校验**: 对关键参数进行必要的验证。
3. **考虑数据结构化**: 对于复杂的请求参数，考虑使用[请求数据结构](request-struct.md)进行处理。

参数获取是 Web 服务开发的基础，掌握了这些方法，您就可以轻松处理各种客户端请求数据。接下来，让我们学习[请求数据结构化](request-struct.md)。
