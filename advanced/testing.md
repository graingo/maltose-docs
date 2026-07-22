# 测试指南

为应用程序编写测试是确保代码质量、功能正确性和长期可维护性的关键环节。Maltose 的分层架构和解耦设计使其非常易于测试。

本指南将介绍两种主要的测试类型：

1.  **单元测试**: 针对单个函数或模块（特别是 Logic 和 Service 层）的测试。
2.  **接口测试 (API Testing)**: 针对 HTTP 接口的端到端测试，模拟真实的用户请求。

## 测试层次

| 层次 | 目标 | 外部依赖 | 建议频率 |
| --- | --- | --- | --- |
| 单元测试 | Logic、转换和边界条件 | 使用 fake/mock | 每次提交 |
| 接口测试 | 路由、绑定、中间件和响应 | 启动本地 HTTP Server | 每次提交 |
| 集成测试 | GORM、Redis、事务和真实驱动 | Testcontainers 或测试环境 | CI/合并前 |

优先把业务规则放进可注入依赖的 Logic 中；只有必须验证协议或驱动行为时才启动外部依赖。

## 单元测试

单元测试的重点是业务逻辑层 (`internal/logic`)。由于 Maltose 提倡面向接口编程（Logic 依赖于 Service 接口），我们可以利用 mock 技术来替换掉外部依赖（如数据库、缓存、第三方服务），从而实现对业务逻辑的独立、快速的测试。

### 示例：测试用户注册逻辑

`maltose gen dao` 生成的是数据库访问结构体，不会自动生成可 mock 的 DAO 接口。为了隔离数据库，应在应用层定义所需的最小接口，并通过构造函数注入：

```go
// file: internal/logic/user/user.go
package user

type Repository interface {
	IsUsernameExist(ctx context.Context, username string) (bool, error)
}

type User struct {
	repo Repository
}

func New(repo Repository) *User {
	return &User{repo: repo}
}

func (s *User) Register(ctx context.Context, username string) error {
	exists, err := s.repo.IsUsernameExist(ctx, username)
	if err != nil {
		return err
	}
	if exists {
		return merror.New("用户名已存在")
	}
	return nil
}
```

随后可以使用 [gomock](https://github.com/uber-go/mock) 为这个应用层接口生成 mock。

#### 1. 安装 mockgen

首先，安装 Go 官方的 mock 生成工具：

```bash
go install go.uber.org/mock/mockgen@latest
```

#### 2. 定义接口和生成 Mock

为上面定义的 `Repository` 接口生成 mock：

```bash
mockgen -source=internal/logic/user/user.go \
    -destination=internal/logic/user/mock/repository.go \
    -package=mock
```

#### 3. 编写测试用例

```go
// file: internal/logic/user/user_test.go
package user_test

import (
	"context"
	"testing"

	"go.uber.org/mock/gomock"
	"github.com/stretchr/testify/require"
)

func TestUser_Register(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := mock.NewMockRepository(ctrl)
	repo.EXPECT().IsUsernameExist(gomock.Any(), "existing_user").Return(true, nil)

	logic := user.New(repo)
	err := logic.Register(context.Background(), "existing_user")
	require.EqualError(t, err, "用户名已存在")
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

接口测试用于验证从 HTTP 请求到响应的整个流程是否正确。当前 `mhttp.Server` 不直接暴露 `http.Handler`，因此应启动一个测试服务器，再用标准 `http.Client` 发起请求。

### 示例：测试登录接口

```go
// file: internal/controller/user/user_test.go
package user_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/graingo/maltose/net/mhttp"
	"github.com/stretchr/testify/require"
)

func TestLoginAPI(t *testing.T) {
	s := mhttp.New()
	s.SetAddress("127.0.0.1:18080")
	s.GET("/login", func(r *mhttp.Request) {
		r.JSON(http.StatusOK, map[string]any{"token": "test-token"})
	})

	errCh := make(chan error, 1)
	go func() { errCh <- s.Start(context.Background()) }()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		require.NoError(t, s.Stop(ctx))
		require.NoError(t, <-errCh)
	})

	var resp *http.Response
	require.Eventually(t, func() bool {
		var err error
		resp, err = http.Get("http://127.0.0.1:18080/login")
		return err == nil
	}, time.Second, 10*time.Millisecond)
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)
}
```

这个测试启动真实的本地 HTTP 监听并在结束时优雅关闭。测试套件较大时，应为每个测试分配不冲突的端口，或将服务启动封装为统一的测试辅助函数。

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
