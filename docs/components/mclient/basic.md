# 基本使用

## 创建客户端

```go
// 创建默认客户端
client := mclient.New()

// 创建带配置的客户端
client := mclient.NewWithConfig(mclient.ClientConfig{
    Timeout: 10 * time.Second,
    BaseURL: "https://api.example.com",
})
```

## 发送请求

### GET 请求

```go
resp, err := client.R().GET("https://api.example.com/users")
if err != nil {
    log.Printf("Request failed: %v", err)
    return
}
defer resp.Close() // 手动读取响应体时需关闭
```

### POST 请求

```go
resp, err := client.R().
    SetBody(map[string]interface{}{
        "name":  "John Doe",
        "email": "john@example.com",
    }).
    POST("https://api.example.com/users")
if err != nil {
    log.Printf("Request failed: %v", err)
    return
}
defer resp.Close() // 手动读取响应体时需关闭
```

### PUT 请求

```go
resp, err := client.R().
    SetBody(map[string]interface{}{
        "name":  "John Doe Updated",
        "email": "john.updated@example.com",
    }).
    PUT("https://api.example.com/users/1")
if err != nil {
    log.Printf("Request failed: %v", err)
    return
}
defer resp.Close()
```

### DELETE 请求

```go
resp, err := client.R().DELETE("https://api.example.com/users/1")
if err != nil {
    log.Printf("Request failed: %v", err)
    return
}
defer resp.Close()
```

## 设置请求头

```go
resp, err := client.R().
    SetHeader("Accept", "application/json").
    SetHeader("User-Agent", "MaltoseClient/1.0").
    GET("https://api.example.com/users")
```

## 设置查询参数

```go
resp, err := client.R().
    SetQuery("category", "books").
    SetQuery("sort", "price").
    SetQuery("order", "asc").
    GET("https://api.example.com/products")
```

## 设置表单数据

```go
resp, err := client.R().
    SetFormMap(map[string]string{
        "username": "johndoe",
        "password": "securepassword",
    }).
    POST("https://api.example.com/login")
```

## 处理响应

### 检查响应状态

```go
if !resp.IsSuccess() {
    log.Printf("Unexpected status code: %d", resp.StatusCode)
    return
}
```

### 读取响应内容

```go
// 读取为字符串
bodyStr := resp.ReadAllString()
fmt.Printf("Response body: %s\n", bodyStr)

// 读取为字节数组
bodyBytes := resp.ReadAll()
fmt.Printf("Response length: %d bytes\n", len(bodyBytes))
```

### 获取响应头

```go
contentType := resp.Header.Get("Content-Type")
fmt.Printf("Content-Type: %s\n", contentType)
```

### 带结果解析的请求

```go
// 定义响应结构
type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

// 准备结果容器
var user User

// 发送请求并自动解析
resp, err := client.R().
    SetResult(&user). // 设置结果容器，会自动解析和关闭响应
    GET("https://api.example.com/users/1")
if err != nil {
    log.Printf("Request failed: %v", err)
    return
}

// 可以直接使用解析后的结果
fmt.Printf("User: %s (%s)\n", user.Name, user.Email)
```
