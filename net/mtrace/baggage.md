# Baggage

Baggage 是 OpenTelemetry 中的一个概念，它允许将键值对数据附加到分布式追踪上下文中，并在服务调用之间传播。在 Maltose 框架中，`mtrace` 包提供了便捷的 Baggage 处理功能。

## Baggage 作用

Baggage 的主要作用是：

- 在分布式系统的不同组件之间传递元数据
- 携带与追踪相关的业务上下文信息
- 为日志、指标和追踪提供一致的上下文

常见的 Baggage 信息包括：

- 用户 ID
- 请求 ID
- 租户 ID
- 会话 ID
- 环境标识

## Baggage API

Maltose 提供了简洁的 API 来操作 Baggage：

```go
// filepath: /home/mingzaily/go/graingo/maltose/net/mtrace/mtrace_baggage.go
type Baggage struct {
	ctx context.Context
}

// NewBaggage 创建一个新的 Baggage 实例
func NewBaggage(ctx context.Context) *Baggage

// SetValue 设置单个 baggage 值
func (b *Baggage) SetValue(key string, value interface{}) context.Context

// SetMap 批量设置 baggage 值
func (b *Baggage) SetMap(data map[string]interface{}) context.Context

// GetMap 获取所有 baggage 值
func (b *Baggage) GetMap() map[string]interface{}

// GetVar 获取指定 key 的 baggage 值
func (b *Baggage) GetVar(key string) *mvar.Var
```

## 使用示例

### 设置 Baggage 值

```go
import (
    "context"
    "github.com/graingo/maltose/net/mtrace"
)

func processRequest(ctx context.Context, userId string) context.Context {
    // 创建 Baggage 实例
    b := mtrace.NewBaggage(ctx)

    // 设置单个值
    ctx = b.SetValue("userId", userId)

    return ctx
}
```

### 批量设置 Baggage 值

```go
func enrichContext(ctx context.Context, requestInfo map[string]interface{}) context.Context {
    // 创建 Baggage 并批量设置值
    return mtrace.NewBaggage(ctx).SetMap(requestInfo)
}
```

### 读取 Baggage 值

```go
func handleRequest(ctx context.Context) {
    // 获取所有 baggage 值
    values := mtrace.NewBaggage(ctx).GetMap()

    // 使用 baggage 值
    if userId, ok := values["userId"]; ok {
        fmt.Printf("Processing request for user: %v\n", userId)
    }

    // 或者使用 GetVar 获取特定值
    userIdVar := mtrace.NewBaggage(ctx).GetVar("userId")
    if !userIdVar.IsEmpty() {
        fmt.Printf("User ID: %s\n", userIdVar.String())
    }
}
```

## 在 HTTP 服务中使用 Baggage

在 Maltose 的 HTTP 服务中，`mtrace` 会自动处理 Baggage 的传播：

```go
func (c *UserController) GetUser(ctx context.Context, req *GetUserReq) (*GetUserRes, error) {
    // 添加业务上下文信息到 baggage
    ctx = mtrace.NewBaggage(ctx).SetValue("businessDomain", "user-service")

    // 调用其他服务，baggage 会自动传播
    userData, err := userService.GetUserData(ctx, req.ID)
    if err != nil {
        return nil, err
    }

    return &GetUserRes{
        ID:   req.ID,
        Name: userData.Name,
    }, nil
}
```

## 注意事项

- Baggage 是轻量级的，但过度使用会增加网络传输开销
- Baggage 默认不会被加密，避免放入敏感信息
- 键名应当简短但有意义，减少传输负担
- 值应尽可能是简单类型，复杂类型会被转换为字符串

## Baggage 与 Span 属性的区别

- Baggage 值会随上下文传播到下游服务
- Span 属性仅附加到单个 Span
- 使用 Baggage 传递需要在整个调用链上共享的信息
- 使用 Span 属性记录特定操作的详情
