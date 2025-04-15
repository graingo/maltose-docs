# 数据处理

## JSON 处理

### 发送 JSON 数据

```go
client := mclient.New()

// 发送 JSON 数据
resp, err := client.R().
    SetBody(map[string]interface{}{
        "name":  "John Doe",
        "email": "john@example.com",
        "age":   30,
    }).
    POST("https://api.example.com/users")
```

### 解析 JSON 响应

```go
// 定义响应结构
type User struct {
    ID        int    `json:"id"`
    Name      string `json:"name"`
    Email     string `json:"email"`
    CreatedAt string `json:"created_at"`
}

// 准备结果
var user User

// 发送请求并自动解析响应
resp, err := client.R().
    SetResult(&user). // 设置结果用于自动解析
    GET("https://api.example.com/users/1")

if err != nil {
    log.Printf("Request failed: %v", err)
    return
}

// 访问解析后的数据（已自动解析，不需要手动调用parseResponse）
fmt.Printf("User: %s (%s)\n", user.Name, user.Email)
```

特点：

- 使用 `SetResult` 设置的结果对象会在请求完成后自动解析
- 响应体自动解析为指定的结构体
- 不需要手动调用 `Parse` 或 `parseResponse` 方法
- 响应体会自动重置，允许多次读取

## 表单数据

### 发送表单数据

```go
client := mclient.New()

// 发送表单数据
resp, err := client.R().
    SetFormMap(map[string]string{
        "username": "johndoe",
        "password": "securepassword",
    }).
    POST("https://api.example.com/login")
```

## 错误处理

### 处理错误响应

```go
// 定义错误响应结构
type ErrorResponse struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
}

// 准备错误
var errorResponse ErrorResponse

// 发送请求
resp, err := client.R().
    SetError(&errorResponse). // 设置错误用于自动解析
    GET("https://api.example.com/users/999")

if err != nil {
    log.Printf("Request failed: %v", err)
    return
}

// 检查请求是否成功
if resp.IsSuccess() {
    fmt.Println("Request successful")
    return
}

// 处理不同的错误状态码（错误响应已自动解析，不需要手动调用parseResponse）
switch resp.StatusCode {
case 404:
    fmt.Printf("Resource not found: %s\n", errorResponse.Message)
case 401, 403:
    fmt.Printf("Authentication error: %s\n", errorResponse.Message)
case 400:
    fmt.Printf("Bad request: %s (%s)\n", errorResponse.Message, errorResponse.Details)
default:
    fmt.Printf("Unexpected error: %s (Code: %d)\n", errorResponse.Message, errorResponse.Code)
}
```

## 自定义数据类型

### 处理自定义时间格式

```go
// 定义自定义时间格式
type CustomTime time.Time

// 定义自定义解组器
type Product struct {
    ID        int        `json:"id"`
    Name      string     `json:"name"`
    Price     float64    `json:"price"`
    CreatedAt CustomTime `json:"created_at"`
}

// 准备结果
var product Product

// 发送请求并自动解析
resp, err := client.R().
    SetResult(&product). // 设置结果容器，响应会自动解析
    GET("https://api.example.com/products/1")

if err != nil {
    log.Printf("Request failed: %v", err)
    return
}

if !resp.IsSuccess() {
    log.Printf("Error response: %d", resp.StatusCode)
    return
}

// 访问解析后的数据
fmt.Printf("Product: %s (%.2f)\n", product.Name, product.Price)
fmt.Printf("Created: %v\n", time.Time(product.CreatedAt))
```
