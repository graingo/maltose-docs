# mclient - HTTP 客户端

`mclient` 是 Maltose 框架内置的一个功能强大且易于使用的 HTTP 客户端。它在 Go 标准库的 `http.Client` 基础上提供了丰富的功能，包括：

- 链式 API
- 中间件支持（内置日志、指标、链路追踪、恢复）
- 自动重试机制
- 灵活的配置选项
- JSON 和表单数据的轻松处理
- 全局速率限制

## 快速开始

下面是一个发送 GET 请求的简单示例：

```go
package main

import (
	"fmt"
	"log"

	"github.com/graingo/maltose/net/mclient"
)

func main() {
	client := mclient.New()

	// 发送一个简单的 GET 请求
	resp, err := client.R().
		SetHeader("Accept", "application/json").
		Get("https://httpbin.org/get")

	if err != nil {
		log.Printf("请求失败: %v", err)
		return
	}
	defer resp.Body.Close()

	fmt.Printf("响应状态码: %d\n", resp.StatusCode)
	fmt.Println("响应内容:")
	fmt.Println(resp.ReadAllString())
}
```

## 初始化客户端

使用 `mclient.New()` 可以创建一个带有默认配置的客户端。

```go
client := mclient.New()
```

你也可以使用 `mclient.NewWithConfig()` 进行更详细的配置：

```go
config := mclient.ClientConfig{
    Timeout: 10 * time.Second,
    Header: http.Header{
        "Custom-Header": []string{"my-value"},
    },
}
client := mclient.NewWithConfig(config)
```

## 发送请求

`mclient` 提供了链式 API，使构建请求变得非常直观。通过 `client.R()` 开始一个请求链。

### HTTP 方法

`mclient` 为所有标准 HTTP 方法提供了便捷的函数：

```go
// GET 请求
resp, err := client.R().Get("https://httpbin.org/get")

// POST 请求
resp, err := client.R().Post("https://httpbin.org/post")

// PUT 请求
resp, err := client.R().Put("https://httpbin.org/put")

// DELETE 请求
resp, err := client.R().Delete("https://httpbin.org/delete")

// ... 其他方法: Patch, Head, Options
```

### 设置请求参数

#### 请求头 (Headers)

```go
client.R().
    SetHeader("X-My-Header", "value").
    SetHeaders(map[string]string{
        "X-Another-Header": "another-value",
        "Accept-Language":  "en-US",
    }).
    Get(url)
```

#### 查询参数 (Query Parameters)

```go
client.R().
    SetQuery("param1", "value1").
    SetQueryMap(map[string]string{
        "param2": "value2",
        "param3": "value3",
    }).
    Get("https://httpbin.org/get")
```

#### 请求体 (Body)

`mclient` 可以轻松发送不同类型的请求体。

**发送 JSON**:

当你传递一个 `struct` 或 `map` 给 `SetBody()` 时，`mclient` 会自动将其序列化为 JSON 并设置 `Content-Type` 为 `application/json`。

```go
type User struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}

user := User{Name: "John Doe", Email: "john@example.com"}

resp, err := client.R().
    SetBody(user).
    Post("https://httpbin.org/post")
```

**发送表单 (Form)**:

```go
client.R().
    SetForm("username", "test").
    SetFormMap(map[string]string{
        "password": "123",
        "scope":    "all",
    }).
    Post("https://httpbin.org/post")
```

## 处理响应

`mclient` 返回一个 `*mclient.Response` 对象，它包装了标准的 `*http.Response`。

### 读取响应

```go
resp, err := client.R().Get(url)

// 获取状态码
statusCode := resp.StatusCode

// 读取响应体为 []byte
bodyBytes := resp.ReadAll()

// 读取响应体为字符串
bodyString := resp.ReadAllString()
```

### 自动解析响应

`mclient` 可以将 JSON 或 XML 响应体自动解析到你的 `struct` 中。

使用 `SetResult()` 指定一个用于接收成功响应数据的 `struct` 指针。

```go
type UserInfo struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

var userInfo UserInfo

resp, err := client.R().
    SetResult(&userInfo).
    Get("https://api.example.com/user/1")

if err == nil && resp.IsSuccess() {
    fmt.Printf("User Name: %s\n", userInfo.Name)
}
```

你还可以使用 `SetError()` 来指定一个用于接收错误响应（例如，非 2xx 状态码）的 `struct` 指针。

```go
type ErrorResponse struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
}

var errorRes ErrorResponse

resp, err := client.R().
    SetResult(&userInfo).
    SetError(&errorRes).
    Get("https://api.example.com/user/999") // 一个不存在的用户

if err == nil && !resp.IsSuccess() {
    fmt.Printf("Error: %s\n", errorRes.Message)
}
```

## 中间件

`mclient` 支持中间件，允许你在请求发送前后执行通用逻辑。Maltose 的 `mclient` 内置了链路、指标、恐慌恢复等中间件。

### 使用中间件

你可以通过 `client.Use()` 将中间件添加到客户端实例。

```go
// 日志中间件
client.Use(mclient.MiddlewareFunc(func(next mclient.HandlerFunc) mclient.HandlerFunc {
    return func(req *mclient.Request) (*mclient.Response, error) {
        log.Printf("Sending request to %s", req.Request.URL.String())
        resp, err := next(req)
        if err != nil {
            log.Printf("Request failed: %v", err)
        } else {
            log.Printf("Response status: %d", resp.StatusCode)
        }
        return resp, err
    }
}))
```

### 速率限制

`mclient` 提供了一个开箱即用的速率限制中间件。

```go
// 每秒最多 2 个请求
client.Use(mclient.MiddlewareRateLimit(mclient.RateLimitConfig{
    RequestsPerSecond: 2,
    Burst:             1,
}))

for i := 0; i < 5; i++ {
    // 请求将根据速率限制自动排队
    client.R().Get("https://api.example.com/data")
}
```

## 自动重试

`mclient` 可以在请求失败时自动重试。默认情况下，它会对网络错误和 5xx 服务器错误进行重试。

### 配置重试策略

你可以使用 `SetRetry()` 来配置重试次数、间隔和退避策略。

```go
config := mclient.RetryConfig{
    Count:         3,                // 最多重试 3 次
    BaseInterval:  time.Second,      // 基础间隔 1 秒
    MaxInterval:   30 * time.Second, // 最大间隔 30 秒
    BackoffFactor: 2.0,              // 指数退避因子 2.0
    JitterFactor:  0.1,              // 随机抖动因子 0.1
}

resp, err := client.R().
    SetRetry(config).
    Get("https://api.example.com/unstable")
```

### 自定义重试条件

你可以通过 `SetRetryCondition()` 提供一个自定义函数来决定是否应该重试。

```go
customRetryCondition := func(resp *http.Response, err error) bool {
    // 网络错误时重试
    if err != nil {
        return true
    }
    // 遇到 429 (Too Many Requests) 时重试
    if resp != nil && resp.StatusCode == 429 {
        return true
    }
    return false
}

client.R().
    SetRetry(config).
    SetRetryCondition(customRetryCondition).
    Get(url)
```
