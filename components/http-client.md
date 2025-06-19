# HTTP 客户端

`mclient` 是 Maltose 框架内置的一个功能强大且易于使用的 HTTP 客户端。它在 Go 标准库的 `http.Client` 基础上提供了丰富的功能，旨在简化和增强客户端编程体验。

## 核心特性

- **流畅的链式 API**：通过链式调用直观地构建和配置请求。
- **强大的中间件**：内置日志、指标、链路追踪和恢复等中间件，并支持自定义扩展。
- **智能自动重试**：可配置的自动重试机制，支持指数退避和随机抖动策略。
- **灵活的配置**：支持全局、客户端实例和单个请求级别的配置。
- **简化的数据处理**：轻松处理 JSON、表单等数据格式，并支持自动解析响应。
- **开箱即用的速率限制**：内置令牌桶算法，轻松实现客户端侧的请求速率控制。

## 快速开始

使用 `mclient` 发送一个 GET 请求非常简单：

```go
package main

import (
	"fmt"
	"log"

	"github.com/graingo/maltose/net/mclient"
)

func main() {
	client := mclient.New()

	// 使用链式 API 构建并发送请求
	resp, err := client.R().
		SetHeader("Accept", "application/json").
		Get("https://httpbin.org/get")

	if err != nil {
		log.Fatalf("请求失败: %v", err)
	}
	defer resp.Body.Close()

	fmt.Printf("响应状态码: %d\n", resp.StatusCode)
	fmt.Println("响应内容:")
	fmt.Println(resp.ReadAllString())
}
```

## 基础用法

### 初始化客户端

- **默认客户端**：`mclient.New()` 创建一个带有默认配置（如超时、User-Agent）的客户端。

  ```go
  client := mclient.New()
  ```

- **自定义配置**：`mclient.NewWithConfig()` 允许传入自定义配置。

  ```go
  config := mclient.ClientConfig{
      Timeout: 10 * time.Second,
      Header: http.Header{
          "Custom-Header": []string{"my-value"},
      },
  }
  client := mclient.NewWithConfig(config)
  ```

### 构建请求

通过 `client.R()` 开始一个请求链，然后可以流畅地配置和发送请求。

#### HTTP 方法

为所有标准 HTTP 方法提供了便捷的函数：

```go
resp, err := client.R().Get("https://httpbin.org/get")
resp, err = client.R().Post("https://httpbin.org/post")
// ... 支持 Put, Delete, Patch, Head, Options
```

#### 设置请求头

```go
client.R().
    SetHeader("X-My-Header", "value1").
    SetHeaders(map[string]string{
        "X-Another-Header": "value2",
        "Accept-Language":  "en-US",
    }).
    Get(url)
```

#### 设置查询参数

```go
client.R().
    SetQuery("param1", "value1").
    SetQueryMap(map[string]string{
        "param2": "value2",
        "param3": "value3",
    }).
    Get("https://httpbin.org/get")
```

#### 设置请求体

- **发送 JSON**：当传递一个 `struct` 或 `map` 给 `SetBody()` 时，`mclient` 会自动序列化为 JSON 并设置正确的 `Content-Type`。

  ```go
  type User struct {
      Name  string `json:"name"`
      Email string `json:"email"`
  }
  user := User{Name: "John Doe", Email: "john@example.com"}

  resp, err := client.R().SetBody(user).Post("https://httpbin.org/post")
  ```

- **发送表单**：

  ```go
  client.R().
      SetForm("username", "test").
      SetFormMap(map[string]string{
          "password": "123",
          "scope":    "all",
      }).
      Post("https://httpbin.org/post")
  ```

## 响应处理

`mclient` 返回一个 `*mclient.Response` 对象，它包装了标准的 `*http.Response` 并提供了额外的辅助方法。

### 读取响应内容

```go
// 获取状态码
statusCode := resp.StatusCode

// 读取响应体为 []byte (可重复读)
bodyBytes := resp.ReadAll()

// 读取响应体为字符串 (可重复读)
bodyString := resp.ReadAllString()
```

### 自动解析响应

这是 `mclient` 的一个核心优势。通过 `SetResult()` 和 `SetError()`，您可以让客户端根据响应状态码自动将 JSON (或 XML) 解析到不同的结构体中。

- `SetResult()`: 用于接收**成功响应**（HTTP 状态码 `2xx`）的数据。
- `SetError()`: 用于接收**失败响应**（非 `2xx` 状态码）的数据。

```go
type UserInfo struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

type ErrorResponse struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
}

var userInfo UserInfo
var errorRes ErrorResponse

// 场景：请求一个不存在的用户
resp, err := client.R().
    SetResult(&userInfo).  // 成功时，数据将解析到这里
    SetError(&errorRes).   // 失败时，数据将解析到这里
    Get("https://api.example.com/user/999")

if err != nil {
    // 处理网络层面的错误
    log.Fatalf("请求失败: %v", err)
}

if resp.IsSuccess() {
    // 这是成功的业务逻辑
    fmt.Printf("成功: User Name: %s\n", userInfo.Name)
} else {
    // 这是失败的业务逻辑
    fmt.Printf("失败: %s (错误码: %d)\n", errorRes.Message, errorRes.Code)
}
```

## 中间件

与 `mhttp` 服务器类似，`mclient` 也支持中间件，允许您在请求发送前后执行通用逻辑，非常适合实现认证、自定义日志、请求签名等功能。

Maltose 内置了链路、指标、恐慌恢复等中间件，您无需手动配置。

### 自定义中间件示例：Auth

下面是一个为请求自动添加认证头的中间件：

```go
func AuthMiddleware(token string) mclient.MiddlewareFunc {
    return func(next mclient.HandlerFunc) mclient.HandlerFunc {
        return func(req *mclient.Request) (*mclient.Response, error) {
            req.SetHeader("Authorization", "Bearer "+token)
            return next(req)
        }
    }
}

// 在客户端上全局启用
client.Use(AuthMiddleware("your-secret-token"))

// 后续所有请求都会自动带上认证头
client.R().Get("https://api.example.com/secure/data")
```

### 速率限制

`mclient` 提供了一个开箱即用的速率限制中间件，基于令牌桶算法实现。

```go
// 配置为每秒最多 2 个请求，允许 1 个并发
client.Use(mclient.MiddlewareRateLimit(mclient.RateLimitConfig{
    RequestsPerSecond: 2,
    Burst:             1,
}))

for i := 0; i < 5; i++ {
    // 请求将根据速率限制自动排队，不会超出设定速率
    go client.R().Get("https://api.example.com/data")
}
```

## 自动重试

`mclient` 可以在请求失败时自动重试。默认情况下，它会对网络错误和 5xx 服务器错误进行重试。

### 配置重试策略

使用 `SetRetry()` 来配置重试次数、间隔和退避策略。

```go
config := mclient.RetryConfig{
    // 最多重试 3 次 (总共尝试 1+3=4 次)
    Count: 3,
    // 基础间隔 1 秒
    BaseInterval: time.Second,
    // 最大间隔 30 秒，防止退避时间过长
    MaxInterval: 30 * time.Second,
    // 指数退避因子，每次重试的间隔时间将乘以该因子
    BackoffFactor: 2.0,
    // 随机抖动因子，为退避时间增加随机性，防止"惊群效应"
    JitterFactor: 0.1,
}

resp, err := client.R().
    SetRetry(config).
    Get("https://api.example.com/unstable")
```

### 自定义重试条件

通过 `SetRetryCondition()` 提供一个自定义函数来决定是否应该重试。

```go
customRetryCondition := func(resp *http.Response, err error) bool {
    // 任何网络错误都重试
    if err != nil {
        return true
    }
    // 或者，当 API 返回特定状态码时重试，例如 429 (Too Many Requests)
    if resp != nil && resp.StatusCode == http.StatusTooManyRequests {
        return true
    }
    return false
}

client.R().
    SetRetry(config).
    SetRetryCondition(customRetryCondition).
    Get(url)
```
