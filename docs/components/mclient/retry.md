# 重试机制

## 基本使用

mclient 提供了内置的重试机制，可以在请求失败时自动重试。

```go
client := mclient.New()

// 发送请求，最多重试 3 次，每次间隔 1 秒
resp, err := client.R().
    SetRetrySimple(3, time.Second).
    GET("https://api.example.com/users")

if err != nil {
    log.Printf("Request failed after retries: %v", err)
    return
}
```

## 高级重试配置

可以通过 `SetRetry` 方法配置更复杂的重试策略，包括指数退避和随机抖动。

```go
client := mclient.New()

// 配置重试策略
config := mclient.RetryConfig{
    Count:         3,                    // 最多重试 3 次（初始尝试 + 3 次重试）
    BaseInterval:  time.Second,          // 基础间隔 1 秒
    MaxInterval:   30 * time.Second,     // 最大间隔 30 秒
    BackoffFactor: 2.0,                  // 指数退避因子 2.0
    JitterFactor:  0.1,                  // 随机抖动因子 0.1
}

// 发送请求
resp, err := client.R().
    SetRetry(config).
    GET("https://api.example.com/users")
```

### 重试配置说明

#### Count（重试次数）

- 指定最大重试次数
- 例如：Count 为 3 时，请求最多会尝试 4 次（初始尝试 + 3 次重试）
- 建议值：3-5 次

#### BaseInterval（基础间隔）

- 重试之间的基础等待时间
- 这是计算重试延迟的起点
- 例如：BaseInterval 为 1 秒时，第一次重试至少等待 1 秒
- 建议值：1-5 秒

#### MaxInterval（最大间隔）

- 重试之间的最大等待时间
- 防止因指数退避导致延迟过长
- 例如：MaxInterval 为 30 秒时，即使计算出的延迟是 60 秒，实际也会限制在 30 秒
- 建议值：30-60 秒

#### BackoffFactor（退避因子）

- 指数退避的乘数因子
- 每次重试的延迟 = 上次延迟 \* BackoffFactor
- 例如：BaseInterval 为 1 秒，BackoffFactor 为 2.0 时：
  - 第一次重试：1 秒
  - 第二次重试：2 秒
  - 第三次重试：4 秒
  - 以此类推...
- 建议值：1.5-2.0

#### JitterFactor（抖动因子）

- 随机抖动的比例因子
- 实际抖动 = 延迟 _ JitterFactor _ (随机数在 -1 到 1 之间)
- 例如：延迟为 1 秒，JitterFactor 为 0.1 时：
  - 实际延迟会在 0.9 到 1.1 秒之间随机
- 值为 0 表示不添加抖动
- 建议值：0.1-0.2

## 自定义重试条件

可以通过 `SetRetryCondition` 方法自定义重试条件。

```go
client := mclient.New()

// 定义自定义重试条件
customRetryCondition := func(resp *http.Response, err error) bool {
    // 网络错误时重试
    if err != nil {
        return true
    }

    // 服务器错误 (5xx) 时重试
    if resp != nil && resp.StatusCode >= 500 {
        return true
    }

    // 限流 (429) 时重试
    if resp != nil && resp.StatusCode == 429 {
        return true
    }

    // 其他状态码不重试
    return false
}

// 发送请求
resp, err := client.R().
    SetRetrySimple(5, 500*time.Millisecond).
    SetRetryCondition(customRetryCondition).
    GET("https://api.example.com/users")
```

## 重试最佳实践

1. 设置合理的重试次数，通常 3-5 次比较合适
2. 使用指数退避策略，避免立即重试
3. 添加随机抖动，避免多个客户端同时重试
4. 只对可重试的错误进行重试
5. 记录重试日志，方便问题排查

```go
client := mclient.New()

// 定义带日志的重试条件
retryWithLog := func(resp *http.Response, err error) bool {
    if err != nil {
        log.Printf("Network error, will retry: %v", err)
        return true
    }

    if resp != nil && resp.StatusCode >= 500 {
        log.Printf("Server error %d, will retry", resp.StatusCode)
        return true
    }

    if resp != nil && resp.StatusCode == 429 {
        log.Printf("Rate limited, will retry")
        return true
    }

    return false
}

// 配置重试策略
config := mclient.RetryConfig{
    Count:         3,                    // 最多重试 3 次
    BaseInterval:  time.Second,          // 基础间隔 1 秒
    MaxInterval:   30 * time.Second,     // 最大间隔 30 秒
    BackoffFactor: 2.0,                  // 指数退避因子 2.0
    JitterFactor:  0.1,                  // 随机抖动因子 0.1
}

// 发送请求
resp, err := client.R().
    SetRetry(config).
    SetRetryCondition(retryWithLog).
    GET("https://api.example.com/users")
```
