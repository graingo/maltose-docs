# 测试指南

为应用程序编写测试是确保代码质量、功能正确性和长期可维护性的关键环节。Maltose 的分层架构和解耦设计使其非常易于测试。

本指南将介绍两种主要的测试类型：

1.  **单元测试**: 针对单个函数或模块（特别是 Logic 和 Service 层）的测试。
2.  **接口测试 (API Testing)**: 针对 HTTP 接口的端到端测试，模拟真实的用户请求。

## 单元测试

单元测试的重点是业务逻辑层 (`internal/logic`)。由于 Maltose 提倡面向接口编程（Logic 依赖于 Service 接口），我们可以利用 mock 技术来替换掉外部依赖（如数据库、缓存、第三方服务），从而实现对业务逻辑的独立、快速的测试。

### 示例：测试用户注册逻辑

假设我们有如下的用户注册逻辑：

```go
// file: internal/logic/user/user.go
package user

// ... imports ...

type sUser struct{}

func New() *sUser { return &sUser{} }
func init() { service.RegisterUser(New()) }

// Register 是 IUser 接口的实现
func (s *sUser) Register(ctx context.Context, req *v1.UserRegisterReq) (*v1.UserRegisterRes, error) {
    // 1. 检查用户名是否已存在
    // 这里依赖了 DAO 层
    isExist, err := dao.User.Ctx(ctx).IsUsernameExist(req.Username)
    if err != nil {
        return nil, err
    }
    if isExist {
        return nil, merror.New("用户名已存在")
    }

    // 2. 创建用户
    // ... 创建用户的逻辑 ...

    return &v1.UserRegisterRes{UserID: 1}, nil
}
```

要测试 `Register` 方法，我们不希望它真的去连接数据库。我们可以使用 [gomock](https://github.com/golang/mock) 来模拟 DAO 层的行为。

#### 1. (准备工作) 定义接口和生成 Mock

首先，确保你的 DAO 层操作是通过接口定义的（这在 `maltose gen dao` 中会自动生成）。然后使用 `mockgen` 工具生成 mock 文件。

#### 2. 编写测试用例

```go
// file: internal/logic/user/user_test.go
package user_test

import (
    // ... imports ...
    "testing"
    "github.com/golang/mock/gomock"
    "github.com/stretchr/testify/assert"
    // ... import mock_dao ...
)

func TestUser_Register(t *testing.T) {
    // 1. 初始化 gomock 控制器
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    // 2. 创建 mock 实例
    // mockUserDao 是 mockgen 生成的
    mockUserDao := mock_dao.NewMockIUser(ctrl)

    // 3. "打桩"：定义 mock 对象的行为
    // 当调用 IsUsernameExist 方法并传入 "existing_user" 时，
    // 我们期望它返回 true 和 nil 错误。
    mockUserDao.EXPECT().IsUsernameExist(gomock.Any(), "existing_user").Return(true, nil)

    // 当传入 "new_user" 时，返回 false 和 nil 错误。
    mockUserDao.EXPECT().IsUsernameExist(gomock.Any(), "new_user").Return(false, nil)

    // 4. 将 mock 对象注入到我们的测试目标中
    // 这里我们通过 `internal/dao` 包的 Set 方法（需要自行实现）来替换掉真实的 DAO
    dao.User = mockUserDao

    // 5. 执行测试
    s := user.New() // 获取我们的业务逻辑实例

    // Case 1: 用户名已存在
    _, err := s.Register(context.Background(), &v1.UserRegisterReq{Username: "existing_user"})
    assert.NotNil(t, err) // 断言应该返回错误
    assert.Equal(t, "用户名已存在", err.Error())

    // Case 2: 注册成功
    res, err := s.Register(context.Background(), &v1.UserRegisterReq{Username: "new_user"})
    assert.Nil(t, err) // 断言不应该有错误
    assert.Equal(t, uint(1), res.UserID) // 断言返回的用户 ID 正确
}
```

通过这种方式，我们可以在不触及真实数据库的情况下，精确地测试业务逻辑在不同情况下的行为。

## 接口测试

接口测试用于验证从 HTTP 请求到响应的整个流程是否正确。Go 的标准库 `net/http/httptest` 使得这类测试非常方便。

### 示例：测试登录接口

```go
// file: internal/controller/user/user_test.go
package user_test

import (
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
    "github.com/graingo/maltose/net/mhttp"
    "github.com/stretchr/testify/assert"
    // ... import your route and controller ...
)

func TestLoginAPI(t *testing.T) {
    // 1. 初始化一个 mhttp 服务器
    s := mhttp.New()

    // 2. 注册你的路由
    // 假设你的所有路由都在一个 Register 函数中
    route.Register(s)

    // 3. 准备一个 HTTP 请求
    // 模拟一个 POST 请求，请求体为 JSON
    reqBody := `{"username":"test","password":"123"}`
    req := httptest.NewRequest("POST", "/login", strings.NewReader(reqBody))
    req.Header.Set("Content-Type", "application/json")

    // 4. 创建一个 ResponseRecorder 来捕获响应
    w := httptest.NewRecorder()

    // 5. 让服务器处理这个请求
    s.ServeHTTP(w, req)

    // 6. 断言结果
    // 断言 HTTP 状态码是否为 200 OK
    assert.Equal(t, http.StatusOK, w.Code)

    // 断言响应体是否包含预期的 token
    // 注意：在真实测试中，您可能需要更复杂的 JSON 解析和断言
    assert.Contains(t, w.Body.String(), "token")
}
```

这个测试启动了一个完整的内存服务器，发送一个真实的 HTTP 请求，并检查响应的状态码和内容，从而有效地验证了从路由、参数绑定、控制器逻辑到最终响应的整个链路。
