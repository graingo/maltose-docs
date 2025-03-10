# Hello World

本文将带您快速使用 Maltose 框架创建一个简单的 Hello World Web 服务。

## 基础示例

首先，创建一个简单的 `main.go` 文件，代码如下：

```go
package main

import (
    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

func main() {
    // 创建一个默认的服务器对象
    s := m.Server()

    // 注册一个路由: /hello
    s.GET("/hello", func(r *mhttp.Request) {
        r.String(200, "Hello World!")
    })

    // 启动服务，监听端口默认为 8080
    s.Run()
}
```

## 代码解析

1. 首先，我们导入了必要的 Maltose 包：

   - `m`: Maltose 框架的主入口点
   - `mhttp`: HTTP 服务相关功能

2. 创建服务器对象：

   ```go
   s := m.Server()
   ```

   通过 `m.Server()` 创建一个 HTTP 服务实例。

3. 注册路由处理函数：

   ```go
   s.GET("/hello", func(r *mhttp.Request) {
       r.String(200, "Hello World!")
   })
   ```

   - 通过 `s.GET` 方法注册一个 GET 类型的路由 `/hello`
   - 路由处理函数接收一个 `*mhttp.Request` 参数，代表当前请求
   - 使用 `r.String()` 方法返回一个 HTTP 状态码为 200 的文本响应

4. 启动服务：
   ```go
   s.Run()
   ```
   服务默认监听在 `:8080` 端口上

## 运行结果

使用以下命令运行程序：

```bash
go run main.go
```

控制台将输出类似以下内容：

```
HTTP server default is running on :8080
----------------------------------------------------------------------------------------------------
PATH                         | METHOD  | HANDLER TYPE          | REQUEST/RESPONSE
----------------------------------------------------------------------------------------------------
/hello                       | GET     | Handler               | nil → nil
----------------------------------------------------------------------------------------------------
```

此时可以通过浏览器访问 `http://127.0.0.1:8080/hello`，将看到输出 `Hello World!`。

也可以使用 `curl` 命令行工具测试：

```bash
curl http://127.0.0.1:8080/hello
```

## 端口设置

如果需要修改默认端口，可以在 `s.Run()` 方法中指定，例如：

```go
// 监听 8199 端口
s.SetAddress(":8199")
s.Run()

// 或者直接在 Run 方法中指定
// s.Run(":8199")
```

## 总结

通过这个简单的示例，我们了解了如何使用 Maltose 框架创建一个基本的 Web 服务。Maltose 基于 Gin 构建，提供了简洁而强大的 API，使得 Web 服务开发变得简单高效。

接下来，我们将学习如何[获取请求参数](request-param.md)，处理客户端提交的各种数据。
