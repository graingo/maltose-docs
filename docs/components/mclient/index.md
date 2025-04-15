# HTTP 客户端

## 基本介绍

`mclient` 是一个功能强大的 HTTP 客户端组件，提供了简单易用的 API 来发送 HTTP 请求。它支持链式调用、中间件、重试机制、速率限制等特性。

## 相关文档

- [基本使用](basic.md) - 介绍 mclient 的基本使用方法
- [配置管理](config.md) - 介绍如何配置 mclient
- [中间件](middleware.md) - 介绍如何使用和创建中间件
- [重试机制](retry.md) - 介绍重试机制的使用方法
- [数据处理](data.md) - 介绍如何处理请求和响应数据

## 特性

- 链式调用 API
- 支持中间件
- 自动重试机制
- 速率限制
- 请求/响应拦截
- 自动 JSON 解析
- 上下文支持
- 超时控制
- 自定义传输层
- 请求克隆

## 快速开始

### 基本请求

```go
// 创建默认客户端
client := mclient.New()

// 发送 GET 请求
resp, err := client.R().
    SetHeader("Accept", "application/json").
    GET("https://api.example.com/users")

if err != nil {
    log.Printf("Request failed: %v", err)
    return
}
defer resp.Close() // 手动读取响应时需关闭

// 检查响应状态
if !resp.IsSuccess() {
    log.Printf("Unexpected status code: %d", resp.StatusCode)
    return
}

// 读取响应内容
bodyContent := resp.ReadAllString()
fmt.Println("Response:", bodyContent)
```

### 自动解析响应

```go
// 定义响应结构
type UserList struct {
    Users []struct {
        ID   int    `json:"id"`
        Name string `json:"name"`
    } `json:"users"`
    Total int `json:"total"`
}

// 创建客户端
client := mclient.New()

// 准备结果容器
var result UserList

// 发送请求并自动解析响应
resp, err := client.R().
    SetResult(&result). // 设置结果容器，响应会自动解析
    GET("https://api.example.com/users")

if err != nil {
    log.Printf("Request failed: %v", err)
    return
}

// 使用解析后的结果
fmt.Printf("Found %d users (total: %d)\n", len(result.Users), result.Total)
for _, user := range result.Users {
    fmt.Printf("- %s (ID: %d)\n", user.Name, user.ID)
}
```
