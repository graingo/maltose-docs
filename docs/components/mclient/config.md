# 配置管理

## 客户端配置

### 创建带配置的客户端

```go
client := mclient.NewWithConfig(mclient.ClientConfig{
    Timeout: 10 * time.Second,
    BaseURL: "https://api.example.com",
    Header: http.Header{
        "User-Agent": []string{"MaltoseClient/1.0"},
        "Accept":     []string{"application/json"},
    },
})
```

### 更新客户端配置

```go
client.SetConfig(mclient.ClientConfig{
    BaseURL: "https://api.example.com/v1",
})
```

### 设置自定义传输层

```go
transport := &http.Transport{
    MaxIdleConns:        100,
    MaxIdleConnsPerHost: 10,
    IdleConnTimeout:     30 * time.Second,
}
client.SetTransport(transport)
```

## 请求配置

### 设置请求上下文

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := client.R().
    SetContext(ctx).
    GET("https://api.example.com/users")
```

### 设置请求超时

```go
resp, err := client.R().
    SetTimeout(5 * time.Second).
    GET("https://api.example.com/users")
```

### 克隆客户端

```go
// 创建基础客户端
baseClient := mclient.New()
baseClient.SetConfig(mclient.ClientConfig{
    BaseURL: "https://api.example.com",
    Timeout: 10 * time.Second,
})

// 克隆客户端并修改配置
adminClient := baseClient.Clone()
adminClient.SetConfig(mclient.ClientConfig{
    BaseURL: "https://admin.example.com",
    Header: http.Header{
        "Authorization": []string{"Bearer admin-token"},
    },
})
```

## 配置选项

### ClientConfig 结构体

```go
type ClientConfig struct {
    // 基础 URL
    BaseURL string

    // 请求超时时间
    Timeout time.Duration

    // 默认请求头
    Header http.Header

    // 自定义传输层
    Transport http.RoundTripper

    // 代理设置
    Proxy string

    // 是否跳过 TLS 验证
    InsecureSkipVerify bool

    // TLS 配置
    TLSConfig *tls.Config
}
```

### 请求配置选项

```go
// 设置请求头
SetHeader(key, value string)

// 设置多个请求头
SetHeaderMap(headers map[string]string)

// 设置查询参数
SetQuery(key, value string)

// 设置多个查询参数
SetQueryMap(params map[string]string)

// 设置请求体
SetBody(body interface{})

// 设置表单数据
SetFormMap(form map[string]string)

// 设置上下文
SetContext(ctx context.Context)

// 设置超时
SetTimeout(timeout time.Duration)

// 设置重试次数和间隔
SetRetry(count int, interval time.Duration)

// 设置重试条件
SetRetryCondition(condition RetryCondition)
```
