# 标准响应

在构建任何规模的 API 服务时，一个统一、可预测的响应格式都是奠定项目成功的基础。它不仅是前后端协作的契约，也是服务间通信、网关处理和日志监控的基石。Maltose 通过 `mhttp.MiddlewareResponse()` 中间件，为实现这一目标提供了强大支持。

## 为什么需要标准响应？

- **可预测性**: 无论是成功还是失败，API 的消费者（前端应用、其他微服务等）总能依赖一个固定的结构来解析响应。这极大地简化了客户端的逻辑。
- **简化的错误处理**: 统一的错误格式意味着客户端可以实现全局的、一致的错误处理机制，而无需为每个端点编写特定的错误逻辑。
- **关注点分离**: 控制器（Controller）可以专注于核心业务逻辑——返回业务数据或业务错误，而将响应格式化的通用工作完全委托给中间件。
- **提升协作效率**: 清晰的 API 契约减少了沟通成本，使团队能够更高效地并行开发。

## 响应格式规范

启用中间件后，所有响应都将被包装成以下 JSON 结构：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

- `code` (`int`): 业务状态码。`0` 通常表示成功，非 `0` 值表示特定的业务错误。
- `message` (`string`): 对 `code` 的简短描述，主要用于调试和日志记录。
- `data` (`any`): 实际的业务数据。成功时为业务实体，失败时通常为 `null`。

### 成功响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 1001,
    "username": "alice"
  }
}
```

### 错误响应示例

```json
{
  "code": 40001,
  "message": "用户名或密码错误",
  "data": null
}
```

## 中间件工作原理

`MiddlewareResponse` 中间件会智能地拦截控制器的返回值，并根据以下规则进行包装：

- **当控制器返回 `(*SomeRes, nil)` 时 (成功)**:

  - `code` 设置为 `0`
  - `message` 设置为 `"success"`
  - `data` 设置为控制器返回的 `*SomeRes` 对象

- **当控制器返回 `(any, error)` 时 (失败)**:
  - 如果 `error` 是 `*merror.Error` 类型，中间件会提取其内部的业务码和错误信息。
  - 如果是其他 `error` 类型，会使用一个默认的服务器内部错误码。
  - `data` 始终为 `null`。

## 如何启用

::: warning 重要提醒
为了提供最大的灵活性，`MiddlewareResponse` 中间件**不是默认开启的**。我们强烈建议在所有新项目中手动启用它。
:::

```go
package main

import (
    "github.com/graingo/maltose/net/mhttp"
    "your-project/internal/router"
)

func main() {
	s := mhttp.New()

	// 全局启用标准响应中间件
	s.Use(mhttp.MiddlewareResponse())

	// 注册你的路由
	router.Register(s)

	s.Run()
}
```

## 控制器最佳实践

启用中间件后，您的控制器代码将变得异常整洁。

### 返回成功数据

只需专注于返回业务逻辑处理成功后的数据结构即可。

```go
// GetUserProfile 获取用户资料
func (c *Controller) GetUserProfile(ctx context.Context, req *v1.UserReq) (*v1.UserRes, error) {
	// 1. 调用 service 获取业务数据
	user, err := service.User().GetProfile(ctx, req.UserID)
	if err != nil {
		// 2. 如果 service 层返回错误，直接透传
		return nil, err
	}

	// 3. 成功时，直接返回响应结构体指针
	// 中间件会自动包装成标准格式
	return &v1.UserRes{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
	}, nil
}
```

### 返回业务错误

使用 `merror` 和 `mcode` 包来创建结构化的业务错误。

```go
// Login 用户登录
func (c *Controller) Login(ctx context.Context, req *v1.LoginReq) (*v1.LoginRes, error) {
	// 1. 检查密码
	user, err := service.User().CheckPassword(ctx, req.Username, req.Password)
	if err != nil {
		// 2. 凭证无效，返回一个预定义的业务错误
		// 中间件会解析它，并生成 { "code": 40001, "message": "..." }
		return nil, merror.NewCode(mcode.CodeInvalidCredentials, "用户名或密码错误")
	}

	// ... 生成 token 等后续逻辑

	return &v1.LoginRes{Token: "some-jwt-token"}, nil
}
```

### 跳过特定路由

对于文件下载、重定向等不需要标准 JSON 响应的特殊路由，您可以在注册时**不**将它们包含在应用了 `MiddlewareResponse` 的路由组中，或者为它们创建一个不使用该中间件的新路由组。

通过这种方式，`MiddlewareResponse` 为您的 API 提供了一致性的基础，同时保留了处理特殊情况的灵活性。
