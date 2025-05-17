# 常见问题解答

本文档收集了使用 Maltose 框架时的常见问题和解决方案。

## 框架基础

### Q: Maltose 和 Gin 的关系是什么？

Maltose 基于 Gin 构建，完全兼容 Gin 的中间件生态。Maltose 在 Gin 的基础上增加了更多企业级特性，如配置管理、日志系统、链路追踪、实例管理等。您可以将 Maltose 视为 Gin 的"增强版"，同时保持了 Gin 的高性能和灵活性。

### Q: 为什么选择 Maltose 而不是直接使用 Gin？

Maltose 在 Gin 的基础上提供了更多企业级应用所需的功能，包括：

- 更加结构化的项目组织
- 内置的配置管理
- 强大的日志系统
- 分布式链路追踪
- 指标监控
- 数据库集成
- 实例管理
- 错误处理

如果您正在开发一个企业级应用，Maltose 可以帮助您快速搭建基础设施，专注于业务逻辑开发。

### Q: Maltose 的性能如何？

Maltose 保持了 Gin 的高性能基因，同时通过合理的抽象和设计模式，确保了额外功能不会带来明显的性能开销。在大多数情况下，Maltose 的性能与 Gin 相当，只有在启用了额外功能（如链路追踪）时才会有轻微的性能损失。

## 使用技巧

### Q: 如何在 Maltose 中自定义响应格式？

Maltose 支持自定义响应格式，您可以通过中间件或封装 Context 的方式实现：

```go
// 定义响应结构
type Response struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
}

// 封装响应方法
func ResponseJSON(c *mhttp.Context, code int, message string, data interface{}) {
    c.JSON(200, Response{
        Code:    code,
        Message: message,
        Data:    data,
    })
}

// 在控制器中使用
func (ctrl *Controller) Get(c *mhttp.Context) {
    data, err := ctrl.service.Get(c.Request.Context(), c.Param("id"))
    if err != nil {
        ResponseJSON(c, 50000, err.Error(), nil)
        return
    }
    ResponseJSON(c, 0, "success", data)
}
```

### Q: 如何处理跨域请求？

您可以使用 CORS 中间件来处理跨域请求：

```go
package main

import (
    "github.com/graingo/maltose/frame/mins"
    "github.com/graingo/maltose/net/mhttp"
    "github.com/gin-contrib/cors"
)

func main() {
    server := mins.Server()

    // 配置CORS
    corsConfig := cors.DefaultConfig()
    corsConfig.AllowOrigins = []string{"http://localhost:8080"}
    corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}

    // 使用CORS中间件
    server.Use(func(c *mhttp.Context) {
        cors.New(corsConfig)(c.GinContext())
    })

    // 注册路由
    // ...

    server.Run(context.Background(), ":8080")
}
```

### Q: 如何优雅地关闭服务？

Maltose 支持优雅关闭服务，确保在关闭前完成所有正在处理的请求：

```go
package main

import (
    "context"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/graingo/maltose/frame/mins"
)

func main() {
    // 创建服务
    server := mins.Server()

    // 注册路由
    // ...

    // 启动服务（非阻塞）
    go func() {
        if err := server.Run(context.Background(), ":8080"); err != nil {
            panic(err)
        }
    }()

    // 等待中断信号
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    // 创建超时上下文
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // 优雅关闭
    if err := server.Shutdown(ctx); err != nil {
        panic(err)
    }
}
```

### Q: 如何实现请求限流？

您可以使用限流中间件来控制请求速率：

```go
package main

import (
    "time"

    "github.com/graingo/maltose/frame/mins"
    "github.com/graingo/maltose/net/mhttp"
    "golang.org/x/time/rate"
)

// 限流中间件
func RateLimiter() mhttp.HandlerFunc {
    // 创建限流器：每秒10个请求，最多允许30个等待的请求
    limiter := rate.NewLimiter(rate.Limit(10), 30)

    return func(c *mhttp.Context) {
        // 尝试获取令牌
        if !limiter.Allow() {
            c.JSON(429, map[string]interface{}{
                "code":    42900,
                "message": "请求过于频繁，请稍后再试",
            })
            c.Abort()
            return
        }
        c.Next()
    }
}

func main() {
    server := mins.Server()

    // 使用限流中间件
    server.Use(RateLimiter())

    // 注册路由
    // ...

    server.Run(context.Background(), ":8080")
}
```

## 数据库相关

### Q: 如何进行数据库事务处理？

Maltose 的 `mdb` 模块提供了简便的事务处理方式：

```go
func (s *OrderService) CreateOrder(ctx context.Context, order *model.Order) error {
    db := mdb.Instance("master")

    // 使用事务
    return db.Transact(ctx, func(tx *mdb.DB) error {
        // 创建订单
        if err := tx.Create(order).Error; err != nil {
            return err
        }

        // 更新库存
        if err := tx.Model(&model.Product{}).
            Where("id = ? AND stock >= ?", order.ProductID, order.Quantity).
            UpdateColumn("stock", gorm.Expr("stock - ?", order.Quantity)).
            Error; err != nil {
            return err
        }

        // 更新用户积分
        if err := tx.Model(&model.User{}).
            Where("id = ?", order.UserID).
            UpdateColumn("points", gorm.Expr("points + ?", order.Points)).
            Error; err != nil {
            return err
        }

        return nil
    })
}
```

### Q: 如何使用多个数据库连接？

Maltose 支持多个命名数据库实例：

```go
package main

import (
    "github.com/graingo/maltose/database/mdb"
    "github.com/graingo/maltose/os/mcfg"
)

func init() {
    // 初始化主库配置
    masterConfig := mdb.DefaultConfig()
    masterConfig.Host = "master.db.example.com"
    masterConfig.DBName = "app_db"
    mdb.SetConfig("master", masterConfig)

    // 初始化只读库配置
    readonlyConfig := mdb.DefaultConfig()
    readonlyConfig.Host = "readonly.db.example.com"
    readonlyConfig.DBName = "app_db"
    mdb.SetConfig("readonly", readonlyConfig)
}

func main() {
    // 获取主库连接
    masterDB, err := mdb.Instance("master")
    if err != nil {
        panic(err)
    }

    // 获取只读库连接
    readonlyDB, err := mdb.Instance("readonly")
    if err != nil {
        panic(err)
    }

    // 使用不同的连接
    // 写操作使用主库
    masterDB.Create(&User{Name: "test"})

    // 读操作使用只读库
    var users []User
    readonlyDB.Find(&users)
}
```

## 配置管理

### Q: 如何从环境变量加载配置？

Maltose 的配置系统支持从环境变量加载配置：

```go
package main

import (
    "context"
    "fmt"
    "os"

    "github.com/graingo/maltose/os/mcfg"
)

func init() {
    // 设置环境变量
    os.Setenv("APP_SERVER_PORT", "8888")
    os.Setenv("APP_DB_HOST", "db.example.com")
}

func main() {
    // 获取配置实例
    cfg := mcfg.Instance()
    ctx := context.Background()

    // 通过配置钩子处理环境变量
    mcfg.RegisterAfterLoadHook(func(ctx context.Context, data map[string]interface{}) (map[string]interface{}, error) {
        // 处理server配置
        if server, ok := data["server"].(map[string]interface{}); ok {
            if port := os.Getenv("APP_SERVER_PORT"); port != "" {
                server["port"] = port
            }
        }

        // 处理数据库配置
        if db, ok := data["database"].(map[string]interface{}); ok {
            if host := os.Getenv("APP_DB_HOST"); host != "" {
                db["host"] = host
            }
        }

        return data, nil
    })

    // 获取配置值
    serverPort, _ := cfg.Get(ctx, "server.port")
    dbHost, _ := cfg.Get(ctx, "database.host")

    fmt.Println("Server Port:", serverPort.String()) // 输出: Server Port: 8888
    fmt.Println("DB Host:", dbHost.String())         // 输出: DB Host: db.example.com
}
```

### Q: 如何实现配置热更新？

您可以实现一个配置更新监听器：

```go
package main

import (
    "context"
    "time"

    "github.com/graingo/maltose/os/mcfg"
    "github.com/graingo/maltose/os/mlog"
)

func main() {
    // 获取配置实例
    cfg := mcfg.Instance()
    ctx := context.Background()
    logger := mlog.DefaultLogger()

    // 定期检查配置文件更新
    go func() {
        ticker := time.NewTicker(30 * time.Second)
        defer ticker.Stop()

        for range ticker.C {
            // 重新加载配置
            adapter := cfg.GetAdapter()
            if adapter.Available(ctx) {
                // 这里可以添加重新加载配置的逻辑
                logger.Info(ctx, "配置已更新")

                // 获取最新配置
                newData, err := cfg.Data(ctx)
                if err != nil {
                    logger.Error(ctx, "获取最新配置失败", "error", err)
                    continue
                }

                // 处理配置更新
                // ...
            }
        }
    }()

    // 应用主逻辑
    // ...
    select {}
}
```

## 日志与监控

### Q: 如何将日志输出到文件和控制台？

您可以配置日志同时输出到文件和控制台：

```go
package main

import (
    "context"
    "io"
    "os"

    "github.com/graingo/maltose/os/mlog"
)

func main() {
    // 创建日志文件
    logFile, err := os.OpenFile("app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
    if err != nil {
        panic(err)
    }
    defer logFile.Close()

    // 创建多输出目标
    multiWriter := io.MultiWriter(os.Stdout, logFile)

    // 配置日志
    config := mlog.DefaultConfig()
    config.Writer = multiWriter
    config.Format = "json"  // 使用JSON格式

    // 创建日志实例
    logger := mlog.New()
    logger.SetConfig(config)

    // 使用日志
    ctx := context.Background()
    logger.Info(ctx, "应用启动")
}
```

### Q: 如何查看和分析链路追踪数据？

Maltose 的链路追踪模块与 OpenTelemetry 集成，支持多种后端：

1. **Jaeger**: 通过配置 Jaeger 导出器可将链路数据发送到 Jaeger。
2. **Zipkin**: 通过配置 Zipkin 导出器可将链路数据发送到 Zipkin。
3. **OpenTelemetry Collector**: 可以使用 OpenTelemetry Collector 收集和处理链路数据。

示例配置：

```go
package main

import (
    "github.com/graingo/maltose/net/mtrace"
)

func main() {
    // 初始化Jaeger追踪
    tp := mtrace.InitTracer(
        "my-service",
        mtrace.WithJaegerEndpoint("http://jaeger:14268/api/traces"),
    )
    defer tp.Shutdown(context.Background())

    // 应用逻辑
    // ...
}
```

然后可以通过 Jaeger UI (通常在 http://localhost:16686) 查看和分析链路数据。

## 其他问题

### Q: 如何进行单元测试和集成测试？

Maltose 支持标准的 Go 测试方法，并提供了一些辅助函数：

**单元测试示例**：

```go
package service

import (
    "context"
    "testing"

    "github.com/graingo/maltose/database/mdb"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

// 模拟仓库
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) FindByID(ctx context.Context, id uint) (*model.User, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*model.User), args.Error(1)
}

// 测试用户服务
func TestUserService_GetByID(t *testing.T) {
    mockRepo := new(MockUserRepository)
    service := &UserService{userRepo: mockRepo}

    ctx := context.Background()
    expectedUser := &model.User{ID: 1, Username: "test"}

    mockRepo.On("FindByID", ctx, uint(1)).Return(expectedUser, nil)

    // 测试服务方法
    user, err := service.GetByID(ctx, 1)

    assert.NoError(t, err)
    assert.Equal(t, expectedUser, user)
    mockRepo.AssertExpectations(t)
}
```

**HTTP 集成测试示例**：

```go
package api

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/graingo/maltose/frame/mins"
    "github.com/graingo/maltose/net/mhttp"
    "github.com/stretchr/testify/assert"
)

func TestUserAPI(t *testing.T) {
    // 创建测试服务器
    server := mins.Server()

    // 注册测试路由
    server.BindHandler("GET:/users/:id", func(c *mhttp.Context) {
        id := c.Param("id")
        c.JSON(200, map[string]interface{}{
            "code": 0,
            "data": map[string]interface{}{
                "id":       id,
                "username": "test",
            },
        })
    })

    // 创建测试请求
    req := httptest.NewRequest("GET", "/users/1", nil)
    w := httptest.NewRecorder()

    // 执行请求
    server.GetEngine().ServeHTTP(w, req)

    // 验证响应
    assert.Equal(t, http.StatusOK, w.Code)

    var response map[string]interface{}
    err := json.Unmarshal(w.Body.Bytes(), &response)
    assert.NoError(t, err)

    assert.Equal(t, float64(0), response["code"])
    data := response["data"].(map[string]interface{})
    assert.Equal(t, "1", data["id"])
    assert.Equal(t, "test", data["username"])
}
```

### Q: 如何部署 Maltose 应用？

Maltose 应用的部署与普通 Go 应用相同，支持多种部署方式：

1. **二进制部署**：编译生成二进制文件，直接在服务器运行
2. **Docker 容器**：构建 Docker 镜像，部署到容器环境
3. **Kubernetes**：使用 Kubernetes 编排和管理容器

**Dockerfile 示例**：

```dockerfile
# 构建阶段
FROM golang:1.21-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -o app ./cmd/server

# 运行阶段
FROM alpine:latest

WORKDIR /app

# 安装基本工具
RUN apk --no-cache add ca-certificates tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 复制配置和二进制文件
COPY --from=builder /app/app /app/
COPY --from=builder /app/config /app/config

EXPOSE 8080

# 运行应用
CMD ["/app/app"]
```

**docker-compose.yml 示例**：

```yaml
version: "3"

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - APP_ENV=production
      - APP_DB_HOST=db
    depends_on:
      - db
    networks:
      - app-network

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=secret
      - MYSQL_DATABASE=app
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - app-network

networks:
  app-network:

volumes:
  db-data:
```
