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

## 错误码规划建议

良好的错误码规划可以让代码更易维护，也方便前端开发者快速定位问题。

### 按模块划分错误码范围

建议按照业务模块划分错误码范围，每个模块占用 1000 个编号：

```go
// file: internal/codes/biz_code.go
package codes

import "github.com/graingo/maltose/errors/mcode"

const (
    // 通用错误 (10000-10999)
    CodeSuccess          = 0
    CodeInvalidParam     = 10001
    CodeUnauthorized     = 10002
    CodeForbidden        = 10003
    CodeNotFound         = 10004
    CodeInternalError    = 10500
    CodeServiceUnavailable = 10503

    // 用户模块 (20000-20999)
    CodeUserNotFound     = 20001
    CodeUserExists       = 20002
    CodePasswordInvalid  = 20003
    CodeEmailInvalid     = 20004
    CodeTokenExpired     = 20005
    CodeTokenInvalid     = 20006

    // 订单模块 (30000-30999)
    CodeOrderNotFound    = 30001
    CodeOrderCancelled   = 30002
    CodeOrderPaid        = 30003
    CodeStockInsufficient = 30004

    // 支付模块 (40000-40999)
    CodePaymentFailed    = 40001
    CodeRefundFailed     = 40002
    CodeBalanceInsufficient = 40003

    // 商品模块 (50000-50999)
    CodeProductNotFound  = 50001
    CodeProductOffline   = 50002
)

// 定义错误码实例
var (
    // 通用
    Success          = mcode.New(CodeSuccess, "成功", "")
    InvalidParam     = mcode.New(CodeInvalidParam, "参数错误", "")
    Unauthorized     = mcode.New(CodeUnauthorized, "未授权", "")
    Forbidden        = mcode.New(CodeForbidden, "无权限", "")
    NotFound         = mcode.New(CodeNotFound, "资源不存在", "")
    InternalError    = mcode.New(CodeInternalError, "内部错误", "")

    // 用户模块
    UserNotFound     = mcode.New(CodeUserNotFound, "用户不存在", "")
    UserExists       = mcode.New(CodeUserExists, "用户已存在", "")
    PasswordInvalid  = mcode.New(CodePasswordInvalid, "密码错误", "")
    EmailInvalid     = mcode.New(CodeEmailInvalid, "邮箱格式错误", "")
    TokenExpired     = mcode.New(CodeTokenExpired, "令牌已过期", "")
    TokenInvalid     = mcode.New(CodeTokenInvalid, "令牌无效", "")

    // 订单模块
    OrderNotFound    = mcode.New(CodeOrderNotFound, "订单不存在", "")
    OrderCancelled   = mcode.New(CodeOrderCancelled, "订单已取消", "")
    OrderPaid        = mcode.New(CodeOrderPaid, "订单已支付", "")
    StockInsufficient = mcode.New(CodeStockInsufficient, "库存不足", "")
)
```

### 错误码规划原则

1. **预留空间**：每个模块预留足够的编号空间（如 1000 个），避免后期扩展时混乱
2. **分类清晰**：同类错误使用连续的编号，便于查找
3. **文档化**：维护一份错误码文档，说明每个错误码的含义和使用场景
4. **避免重复**：使用常量定义错误码，避免魔法数字
5. **国际化**：错误信息支持多语言，根据请求头的 `Accept-Language` 返回不同语言

### 自定义 HTTP 状态码映射

有些场景下，您可能希望根据业务错误码返回不同的 HTTP 状态码。可以创建一个映射表：

```go
// file: internal/middleware/error_handler.go
package middleware

import (
    "net/http"
    "my-app/internal/codes"
    "github.com/graingo/maltose/net/mhttp"
    "github.com/graingo/maltose/errors/merror"
)

// 错误码到 HTTP 状态码的映射
var errorCodeToHTTPStatus = map[int]int{
    codes.CodeInvalidParam:    http.StatusBadRequest,      // 400
    codes.CodeUnauthorized:    http.StatusUnauthorized,    // 401
    codes.CodeForbidden:       http.StatusForbidden,       // 403
    codes.CodeNotFound:        http.StatusNotFound,        // 404
    codes.CodeUserNotFound:    http.StatusNotFound,        // 404
    codes.CodeUserExists:      http.StatusConflict,        // 409
    codes.CodeInternalError:   http.StatusInternalServerError, // 500
}

// CustomErrorHandler 自定义错误处理中间件
func CustomErrorHandler() mhttp.HandlerFunc {
    return func(r *mhttp.Request) {
        r.Next()

        // 检查是否有错误
        if len(r.Errors) > 0 {
            err := r.Errors.Last().Err

            if bizErr, ok := err.(*merror.Error); ok {
                // 业务错误
                code := bizErr.Code()
                httpStatus := errorCodeToHTTPStatus[code]
                if httpStatus == 0 {
                    httpStatus = http.StatusOK // 默认 200
                }

                r.Response.WriteStatusExit(httpStatus, mhttp.Json{
                    "code":    code,
                    "message": bizErr.Error(),
                    "data":    nil,
                })
                return
            }

            // 系统错误
            r.Response.WriteStatusExit(http.StatusInternalServerError, mhttp.Json{
                "code":    codes.CodeInternalError,
                "message": "Internal Server Error",
                "data":    nil,
            })
        }
    }
}
```

## 第三方包错误处理

在实际开发中，我们经常需要处理来自第三方包（如 GORM、Redis）的错误。建议创建统一的错误转换函数。

### GORM 错误处理

```go
// file: internal/utility/errors/gorm.go
package errors

import (
    "errors"
    "gorm.io/gorm"
    "my-app/internal/codes"
    "github.com/graingo/maltose/errors/merror"
)

// HandleGormError 统一处理 GORM 错误
func HandleGormError(err error) error {
    if err == nil {
        return nil
    }

    // 记录不存在
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return merror.NewCode(codes.NotFound)
    }

    // 重复键（唯一索引冲突）
    if errors.Is(err, gorm.ErrDuplicatedKey) {
        return merror.NewCode(codes.UserExists)
    }

    // 其他数据库错误包装为内部错误
    return merror.Wrap(err, "数据库操作失败")
}
```

**使用示例**：

```go
func (s *sUser) GetUserByID(ctx context.Context, id uint) (*entity.User, error) {
    var user entity.User
    err := dao.User.Ctx(ctx).Where("id = ?", id).First(&user).Error

    // 统一处理 GORM 错误
    if err != nil {
        return nil, errors.HandleGormError(err)
    }

    return &user, nil
}
```

### Redis 错误处理

```go
// file: internal/utility/errors/redis.go
package errors

import (
    "errors"
    "github.com/redis/go-redis/v9"
    "my-app/internal/codes"
    "github.com/graingo/maltose/errors/merror"
)

// HandleRedisError 统一处理 Redis 错误
func HandleRedisError(err error) error {
    if err == nil {
        return nil
    }

    // 键不存在
    if errors.Is(err, redis.Nil) {
        return merror.NewCode(codes.NotFound)
    }

    // 其他 Redis 错误
    return merror.Wrap(err, "缓存操作失败")
}
```

**使用示例**：

```go
func GetUserCache(ctx context.Context, userID string) (*User, error) {
    val, err := m.Redis().Get(ctx, "user:"+userID).Result()
    if err != nil {
        return nil, errors.HandleRedisError(err)
    }

    // 反序列化
    var user User
    if err := json.Unmarshal([]byte(val), &user); err != nil {
        return nil, err
    }

    return &user, nil
}
```

### HTTP 客户端错误处理

```go
// file: internal/utility/errors/http.go
package errors

import (
    "net/http"
    "my-app/internal/codes"
    "github.com/graingo/maltose/errors/merror"
)

// HandleHTTPError 统一处理 HTTP 错误
func HandleHTTPError(statusCode int, err error) error {
    if err != nil {
        return merror.Wrap(err, "HTTP 请求失败")
    }

    switch statusCode {
    case http.StatusNotFound:
        return merror.NewCode(codes.NotFound)
    case http.StatusUnauthorized:
        return merror.NewCode(codes.Unauthorized)
    case http.StatusForbidden:
        return merror.NewCode(codes.Forbidden)
    case http.StatusBadRequest:
        return merror.NewCode(codes.InvalidParam)
    default:
        if statusCode >= 500 {
            return merror.NewCode(codes.InternalError)
        }
    }

    return nil
}
```

## 最佳实践

### 1. 错误分层处理

```go
// DAO 层：返回原始错误
func (d *UserDao) GetByID(ctx context.Context, id uint) (*User, error) {
    var user User
    err := d.db.First(&user, id).Error
    return &user, err // 直接返回 GORM 错误
}

// Logic 层：转换为业务错误
func (s *UserLogic) GetUser(ctx context.Context, id uint) (*User, error) {
    user, err := dao.User.GetByID(ctx, id)
    if err != nil {
        // 转换为业务错误
        return nil, errors.HandleGormError(err)
    }
    return user, nil
}

// Controller 层：直接返回错误，由框架处理
func (c *UserController) GetUser(r *mhttp.Request) {
    id := r.GetUint("id")
    user, err := service.User.GetUser(r.Context(), id)
    if err != nil {
        r.Response.WriteJsonExit(err) // 框架自动处理
        return
    }
    r.Response.WriteJsonExit(user)
}
```

### 2. 错误日志记录

```go
import "github.com/graingo/maltose/os/mlog"

// 记录系统错误
if err != nil {
    mlog.Error(ctx, "数据库查询失败",
        "error", err,
        "userID", userID,
    )
    return merror.NewCode(codes.InternalError)
}
```

### 3. 错误包装链

使用 `merror.Wrap()` 保留错误链，便于调试：

```go
// 底层
if err := db.Save(&user).Error; err != nil {
    return merror.Wrap(err, "保存用户失败")
}

// 上层
if err := service.UpdateUser(ctx, user); err != nil {
    return merror.Wrap(err, "更新用户信息失败")
}

// 错误链：更新用户信息失败: 保存用户失败: duplicate key error
```

### 4. 避免错误吞噬

```go
// ❌ 错误：直接忽略错误
user, _ := dao.User.GetByID(ctx, id)

// ✅ 正确：至少记录日志
user, err := dao.User.GetByID(ctx, id)
if err != nil {
    mlog.Warn(ctx, "获取用户失败，使用默认值", "error", err)
    user = &DefaultUser
}
```
