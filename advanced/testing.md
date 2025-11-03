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

要测试 `Register` 方法，我们不希望它真的去连接数据库。由于 Maltose 提倡面向接口编程，我们可以利用 mock 技术（如 [gomock](https://github.com/golang/mock)）来模拟 DAO 层的行为。

为了实现这一点，DAO 层需要被设计为可替换的。一个常见的实践是导出一个包级别的变量（例如 `dao.User`），并在测试代码中用 mock 实例覆盖它。如下面的测试代码所示，我们通过 `dao.User = mockUserDao` 实现了依赖注入，这使得我们可以在不触及真实数据库的情况下，精确地测试业务逻辑在不同情况下的行为。

#### 1. 安装 mockgen

首先，安装 Go 官方的 mock 生成工具：

```bash
go install go.uber.org/mock/mockgen@latest
```

#### 2. 定义接口和生成 Mock

确保你的 DAO 层操作是通过接口定义的（这在 `maltose gen dao` 中会自动生成）。然后使用 `mockgen` 工具生成 mock 文件。

**方式 1：从源文件生成**

```bash
# 为 service 接口生成 mock
mockgen -source=internal/service/user.go \
    -destination=internal/service/mock/user_mock.go \
    -package=mock
```

**方式 2：使用反射模式**

```bash
# 为 DAO 接口生成 mock
mockgen -destination=internal/dao/mock/user_dao_mock.go \
    -package=mock \
    github.com/yourproject/internal/dao IUserDao
```

**生成的 Mock 文件示例**：

生成后会在 `internal/service/mock/` 目录下创建 `user_mock.go` 文件，包含所有接口方法的 Mock 实现。

#### 3. 编写测试用例

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

### 测试覆盖率

测试覆盖率可以帮助您了解代码的测试完整性。Go 提供了内置的覆盖率工具。

#### 运行测试并生成覆盖率报告

```bash
# 运行所有测试并生成覆盖率文件
go test -coverprofile=coverage.out ./...

# 查看覆盖率摘要
go tool cover -func=coverage.out

# 生成 HTML 可视化报告
go tool cover -html=coverage.out -o coverage.html
```

#### 输出示例

```
github.com/yourproject/internal/logic/user/user.go:15:    Register        100.0%
github.com/yourproject/internal/logic/user/user.go:30:    Login           85.7%
github.com/yourproject/internal/logic/user/user.go:50:    UpdateProfile   75.0%
total:                                                     (statements)    88.5%
```

#### 提升覆盖率的技巧

1. **测试边界条件**：空值、零值、最大值、最小值
2. **测试错误路径**：确保错误处理逻辑被覆盖
3. **测试并发场景**：使用 goroutine 测试并发安全性
4. **使用表驱动测试**：一次覆盖多种场景

**表驱动测试示例**：

```go
func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {"valid email", "user@example.com", false},
        {"missing @", "userexample.com", true},
        {"missing domain", "user@", true},
        {"empty", "", true},
        {"spaces", "user @example.com", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

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

## 集成测试

集成测试用于验证多个组件协同工作的场景，通常需要真实的数据库、Redis 等外部依赖。

### 使用 Testcontainers 进行集成测试

[Testcontainers](https://github.com/testcontainers/testcontainers-go) 可以在测试中启动真实的 Docker 容器，非常适合集成测试。

#### 安装 Testcontainers

```bash
go get github.com/testcontainers/testcontainers-go
```

#### MySQL 集成测试示例

```go
package integration_test

import (
    "context"
    "database/sql"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/wait"
)

func TestUserRepository_WithRealDatabase(t *testing.T) {
    ctx := context.Background()

    // 1. 启动 MySQL 容器
    mysqlContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image:        "mysql:8.0",
            ExposedPorts: []string{"3306/tcp"},
            Env: map[string]string{
                "MYSQL_ROOT_PASSWORD": "test",
                "MYSQL_DATABASE":      "testdb",
            },
            WaitingFor: wait.ForLog("ready for connections").
                WithOccurrence(2).
                WithStartupTimeout(60 * time.Second),
        },
        Started: true,
    })
    if err != nil {
        t.Fatal(err)
    }
    defer mysqlContainer.Terminate(ctx)

    // 2. 获取容器端口
    host, err := mysqlContainer.Host(ctx)
    assert.NoError(t, err)

    port, err := mysqlContainer.MappedPort(ctx, "3306")
    assert.NoError(t, err)

    // 3. 连接数据库
    dsn := fmt.Sprintf("root:test@tcp(%s:%s)/testdb?charset=utf8mb4&parseTime=True",
        host, port.Port())

    db, err := sql.Open("mysql", dsn)
    assert.NoError(t, err)
    defer db.Close()

    // 4. 运行迁移或创建表
    _, err = db.Exec(`
        CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100)
        )
    `)
    assert.NoError(t, err)

    // 5. 执行实际的业务逻辑测试
    // 插入数据
    result, err := db.Exec("INSERT INTO users (name, email) VALUES (?, ?)",
        "张三", "zhangsan@example.com")
    assert.NoError(t, err)

    id, err := result.LastInsertId()
    assert.NoError(t, err)
    assert.Greater(t, id, int64(0))

    // 查询数据
    var name, email string
    err = db.QueryRow("SELECT name, email FROM users WHERE id = ?", id).
        Scan(&name, &email)
    assert.NoError(t, err)
    assert.Equal(t, "张三", name)
    assert.Equal(t, "zhangsan@example.com", email)
}
```

### Redis 集成测试示例

```go
func TestCache_WithRealRedis(t *testing.T) {
    ctx := context.Background()

    // 启动 Redis 容器
    redisContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: testcontainers.ContainerRequest{
            Image:        "redis:7-alpine",
            ExposedPorts: []string{"6379/tcp"},
            WaitingFor:   wait.ForLog("Ready to accept connections"),
        },
        Started: true,
    })
    if err != nil {
        t.Fatal(err)
    }
    defer redisContainer.Terminate(ctx)

    // 获取 Redis 地址
    host, _ := redisContainer.Host(ctx)
    port, _ := redisContainer.MappedPort(ctx, "6379")

    // 连接 Redis 并测试
    // ...
}
```

## 最佳实践

### 1. 测试命名规范

- 测试文件：`xxx_test.go`
- 测试函数：`TestXxx`
- 基准测试：`BenchmarkXxx`
- 示例函数：`ExampleXxx`

### 2. 使用 t.Helper()

在辅助函数中使用 `t.Helper()` 可以让错误信息指向实际的测试位置：

```go
func assertNoError(t *testing.T, err error) {
    t.Helper() // 标记为辅助函数
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
}
```

### 3. 并发测试

使用 `t.Parallel()` 并行运行测试，提升速度：

```go
func TestSomething(t *testing.T) {
    t.Parallel() // 标记为可并行运行
    // 测试逻辑
}
```

### 4. 使用测试夹具 (Test Fixtures)

为测试准备和清理工作创建辅助函数：

```go
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()
    // 设置测试数据库
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatal(err)
    }

    t.Cleanup(func() {
        db.Close() // 测试结束时自动清理
    })

    return db
}

func TestWithDB(t *testing.T) {
    db := setupTestDB(t)
    // 使用 db 进行测试
}
```

### 5. 环境隔离

为测试使用独立的配置和环境变量：

```go
func TestMain(m *testing.M) {
    // 设置测试环境
    os.Setenv("APP_ENV", "test")
    os.Setenv("DB_NAME", "test_db")

    // 运行测试
    code := m.Run()

    // 清理
    os.Unsetenv("APP_ENV")

    os.Exit(code)
}
```
