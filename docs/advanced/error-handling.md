# 错误处理策略

在 Web 开发中，一套清晰、一致的错误处理策略至关重要。它不仅能帮助前后端开发者高效协作，还能为终端用户提供明确的反馈。Maltose 提供了一套基于 **错误码** 的标准化错误处理机制，主要由 `merror` 和 `mcode` 两个包实现。

## 核心理念

Maltose 的错误处理遵循以下原则：

1.  **错误即是值**: 遵循 Go 语言的设计哲学，错误被视为普通的返回值，而不是通过 `panic` 或异常来处理。
2.  **区分业务错误和系统错误**:
    - **业务错误** (Business Errors) 是程序正常运行中可预期的错误，例如"用户名已存在"、"余额不足"等。这类错误应该有一个明确的**业务错误码**和**错误信息**，并返回给客户端。
    - **系统错误** (System Errors) 是程序异常，例如数据库连接失败、空指针引用等。这类错误通常不应暴露给终端用户，应该被记录到日志中，并向客户端返回一个通用的"内部服务器错误"响应。
3.  **错误码驱动**: 鼓励开发者为所有可预期的业务错误定义统一的错误码，便于客户端（Web, App）根据错误码执行相应的逻辑（如页面跳转、弹窗提示等）。

## `mcode`：业务错误码

`mcode` 包用于定义和管理业务错误码。一个 `mcode.Code` 接口包含了错误码的整数值、对外展示的信息和更详细的描述。

### 定义错误码

我们推荐在一个统一的地方（例如 `internal/consts` 或 `internal/codes` 目录）定义您的业务错误码。

```go
// file: internal/codes/biz_code.go
package codes

import "github.com/graingo/maltose/errors/mcode"

// 基础模块 (1000-1999)
var (
    // 用户相关
    UserNotFound     = mcode.New(1001, "用户不存在", "")
    UserPasswordError = mcode.New(1002, "用户名或密码错误", "")
    UsernameExists   = mcode.New(1003, "用户名已存在", "")
)

// 订单模块 (2000-2999)
var (
    OrderNotFound    = mcode.New(2001, "订单不存在", "")
    OrderStockNotEnough = mcode.New(2002, "商品库存不足", "")
)
```

## `merror`：带错误码的 error

`merror` 包实现了一个带有错误码的 `error` 类型。您可以使用它来创建新的业务错误，或将一个普通的 `error` 包装成带有错误码的业务错误。

### 创建和返回业务错误

在您的业务逻辑（Logic）层，当遇到可预期的业务错误时，您应该返回一个 `merror`。

```go
// file: internal/logic/user/user.go
package user

import (
    "my-app/internal/codes" // 引入我们定义的错误码
    "github.com/graingo/maltose/errors/merror"
)

func (s *sUser) Login(ctx context.Context, req *v1.LoginReq) (*v1.LoginRes, error) {
    // ... 从数据库查询用户 ...
    if user == nil {
        // 用户不存在，返回预定义的业务错误
        return nil, merror.NewCode(codes.UserNotFound)
    }

    // ... 校验密码 ...
    if password != user.Password {
        // 密码错误
        return nil, merror.NewCode(codes.UserPasswordError)
    }

    // ... 登录成功 ...
    return &v1.LoginRes{Token: "xxx"}, nil
}
```

## 框架的自动处理

Maltose 的 `mhttp` 组件与错误处理机制深度集成。当您使用推荐的 `MiddlewareResponse()` 中间件时，它会自动处理您从 Controller 中返回的 `error`。

- **如果返回的是 `merror`**:

  - 中间件会从 `merror` 中解析出业务错误码和错误信息。
  - 它会向客户端返回一个标准的 JSON 响应，其中包含了这些信息。
  - HTTP 状态码通常仍然是 `200 OK`，因为这是一个"业务层面"的失败，而非"HTTP 协议层面"的失败。

  **响应示例**:

  ```json
  {
    "code": 1002, // 业务错误码
    "message": "用户名或密码错误",
    "data": null
  }
  ```

- **如果返回的是普通 `error`**:

  - 中间件会将其视为一个未被处理的**系统错误**。
  - 它会向客户端返回一个通用的内部错误响应。
  - 同时，这个错误会被 `mlog` 记录下来（通常是 `Error` 级别），以便开发者排查问题。

  **响应示例**:

  ```json
  {
    "code": 500, // 或其他内部错误码
    "message": "Internal Server Error",
    "data": null
  }
  ```

通过这套机制，Maltose 帮助您实现了业务错误和系统错误的清晰分离，并简化了向客户端返回结构化错误信息的过程。
