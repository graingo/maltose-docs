# 标准响应格式

在构建 API 服务时，统一的响应格式是确保前后端协作顺畅的关键。Maltose 通过 `MiddlewareResponse()` 中间件提供了强大的标准响应支持，让您的 API 具有一致性和可预测性。

## 为什么需要标准响应？

### 前后端协作优势

- **统一处理逻辑**：前端可以编写通用的响应处理函数，无需为每个 API 编写不同的解析逻辑
- **错误处理一致**：所有错误都通过相同的字段结构返回，便于统一的错误提示和处理
- **类型安全**：固定的响应结构让前端能够准确预期数据格式

### 开发体验提升

- **调试友好**：统一的响应格式让 API 调试变得更加直观
- **文档清晰**：API 文档可以明确说明响应结构，减少沟通成本
- **团队协作**：团队成员都遵循相同的响应约定，提高开发效率

## 响应格式规范

Maltose 的标准响应格式包含三个核心字段：

```typescript
interface StandardResponse<T = any> {
  code: number; // 业务状态码
  message: string; // 响应消息
  data: T | null; // 业务数据
}
```

### 成功响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 1001,
    "username": "alice",
    "email": "alice@example.com"
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

`MiddlewareResponse` 中间件智能地拦截控制器的返回值，并根据以下规则进行处理：

### 成功场景

当控制器返回 `(result, nil)` 时：

- `code` 设置为 `0`
- `message` 设置为 `"success"`
- `data` 设置为 `result`

### 错误场景

当控制器返回 `(nil, error)` 时：

- 如果是 `*merror.Error`：提取其业务码和错误信息
- 如果是普通 `error`：使用预设的服务器错误码和消息

## 启用标准响应

::: warning 重要提醒
`MiddlewareResponse` 需要手动启用，不是默认开启的。强烈建议在所有项目中启用此中间件。
:::

### 基础启用方式

```go
package main

import "github.com/graingo/maltose/net/mhttp"

func main() {
	s := mhttp.New()

	// 启用标准响应中间件
	s.Use(mhttp.MiddlewareResponse())

	// 注册路由...
	s.Run()
}
```

### 与路由绑定一起使用

```go
package main

import (
	"github.com/graingo/maltose/net/mhttp"
	"your-project/internal/controller/user"
)

func main() {
	s := mhttp.New()

	// 启用标准响应中间件
	s.Use(mhttp.MiddlewareResponse())

	// 绑定控制器
	s.Bind(&user.Controller{})

	s.Run()
}
```

## 控制器最佳实践

### 成功响应示例

```go
func (c *Controller) GetUserProfile(ctx context.Context, req *v1.GetUserProfileReq) (*v1.GetUserProfileRes, error) {
	// 业务逻辑
	user, err := service.User().GetByID(ctx, req.UserID)
	if err != nil {
		return nil, err
	}

	// 直接返回业务数据，中间件会自动包装
	return &v1.GetUserProfileRes{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
	}, nil
}
```

最终响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 1001,
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

### 错误响应示例

```go
func (c *Controller) Login(ctx context.Context, req *v1.LoginReq) (*v1.LoginRes, error) {
	// 验证用户凭据
	user, err := service.User().CheckPassword(ctx, req.Username, req.Password)
	if err != nil {
		// 返回业务错误，中间件会自动处理
		return nil, merror.NewCode(mcode.CodeInvalidCredentials, "用户名或密码错误")
	}

	// 生成令牌
	token, err := service.Auth().GenerateToken(ctx, user.ID)
	if err != nil {
		return nil, merror.NewCode(mcode.CodeInternalError, "令牌生成失败")
	}

	return &v1.LoginRes{
		Token: token,
		User:  user,
	}, nil
}
```

错误时的响应：

```json
{
  "code": 40001,
  "message": "用户名或密码错误",
  "data": null
}
```

### 兼容性说明

- 启用标准响应中间件后，所有控制器的返回值都会被自动包装
- 对于不需要标准格式的特殊端点（如文件下载），可以在路由级别跳过此中间件
- 中间件与现有的错误处理机制完全兼容

通过使用标准响应格式，您的 API 将具有更好的一致性和可维护性，为前后端协作提供坚实的基础。
