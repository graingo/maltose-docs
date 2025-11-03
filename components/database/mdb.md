# 数据库

:::tip 注意：配置源差异
应用在**运行时**会从配置文件中读取数据库配置。

但是，`maltose gen model` 和 `maltose gen dao` 这两个代码生成命令，为了在不启动应用的情况下连接数据库，它们会从项目根目录下的 `.env` 文件获取连接信息。

请确保您在这两个文件中的数据库配置（主机、端口、用户名、密码、库名）保持一致，以避免在开发过程中出现问题。
:::

`mdb` 是 Maltose 框架提供的数据库 ORM（对象关系映射）组件，它基于业界广泛使用的 [GORM](https://gorm.io/) 构建，并在此基础上提供了配置驱动、实例管理、自动化的可观测性集成和读写分离支持。

## 特性

- **配置驱动**: 所有的数据库连接参数，包括连接池和读写分离，都可以通过配置文件进行管理。
- **多数据库支持**: 内置了对 `MySQL`, `PostgreSQL`, `SQLite` 等主流数据库的支持。
- **实例管理**: 支持通过名称管理多个数据库连接实例。
- **连接池**: 自动配置并管理数据库连接池，提升性能和资源利用率。
- **读写分离**: 简单配置即可实现数据库的读写分离，轻松构建高可用架构。
- **可观测性**:
  - **链路追踪**: 自动集成 OpenTelemetry，将所有数据库操作作为一个 `Span` 加入到调用链路中。
  - **日志集成**: 将 GORM 的日志完全接入 `mlog` 组件，支持慢查询日志记录，并且日志会自动携带 `TraceID`。
- **事务封装**: 提供了更简洁的事务操作方法。

## 快速上手

### 1. 配置文件

首先，在 `config.yaml` 中配置您的数据库连接信息。

```yaml
# file: config.yaml
database:
  default: # 默认实例名称
    type: "mysql"
    host: "127.0.0.1"
    port: "3306"
    user: "root"
    password: "your_password"
    db_name: "my_database"
    # 连接池配置
    max_idle_connection: 10
    max_open_connection: 100
    # 慢查询阈值，超过该值会被记录为 Warn 级别日志
    slow_threshold: "500ms"
```

### 配置参数详解

以下是 `mdb` 支持的完整配置参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | string | `mysql` | 数据库类型：`mysql`, `pgsql`, `sqlite` |
| `host` | string | `127.0.0.1` | 数据库主机地址 |
| `port` | string | `3306` | 数据库端口 |
| `user` | string | `root` | 数据库用户名 |
| `password` | string | - | 数据库密码 |
| `db_name` | string | - | 数据库名称 |
| `dsn` | string | - | 数据库连接字符串（DSN）。如果提供，将优先使用，其他连接参数将被忽略 |
| `max_idle_connection` | int | `10` | 最大空闲连接数 |
| `max_open_connection` | int | `100` | 最大打开连接数 |
| `max_idle_time` | duration | `30m` | 连接最大空闲时间，超过后连接会被关闭 |
| `max_lifetime` | duration | `1h` | 连接最大生存时间，超过后连接会被关闭并重建 |
| `slow_threshold` | duration | `200ms` | 慢查询阈值，超过该值的 SQL 会被记录为 Warn 级别日志 |
| `replicas` | array | `[]` | 只读副本列表，用于读写分离（见下文） |
| `plugins` | array | `[]` | GORM 插件列表，默认已包含 OpenTelemetry 插件 |
| `logger` | object | - | 独立的日志配置（可选，无则使用全局日志配置） |

**配置说明**：

- **DSN vs 分散参数**：您可以选择直接提供 `dsn` 连接字符串，或提供 `host`、`port`、`user` 等分散参数。如果提供了 `dsn`，框架会优先使用它。
- **连接池调优**：
  - `max_open_connection` 控制同时活跃的最大连接数，建议根据应用负载和数据库服务器性能调整
  - `max_idle_connection` 通常设置为 `max_open_connection` 的 10-20%
  - `max_lifetime` 建议设置为 1-2 小时，避免长时间连接导致的问题

### 2. 获取数据库实例

在您的代码中，通过 `m` 包即可调用。

```go
package main

import (
	"context"
	"fmt"
	"github.com/graingo/maltose/frame/m"
)

// 定义你的模型
type User struct {
	ID   uint
	Name string
}

func main() {
	ctx := context.Background()

	// 1. 获取默认数据库实例
	// m.DB() 内部会自动读取 "database.default" 配置并初始化连接
	db := m.DB()

	// 2. 使用 db 对象进行操作，用法与 GORM 完全兼容
	var user User
	err := db.WithContext(ctx).First(&user, 1).Error
	if err != nil {
		panic(err)
	}
	fmt.Println(user.Name)
}
```

### 健康检查

使用 `Ping()` 方法检查数据库连接是否正常：

```go
ctx := context.Background()
db := m.DB()

// 检查数据库连接
if err := db.Ping(ctx); err != nil {
    mlog.Error(ctx, "数据库连接异常", "error", err)
    // 可以触发告警或重试逻辑
}
```

**使用场景**：
- 应用启动时验证数据库连接
- 健康检查接口（`/health` 端点）
- 监控系统的心跳检测
- 连接池异常排查

**示例：健康检查 HTTP 接口**：

```go
// 在 controller 中实现健康检查
func Health(r *mhttp.Request) {
    ctx := r.Context()

    // 检查数据库连接
    if err := m.DB().Ping(ctx); err != nil {
        r.Response.WriteJsonExit(mhttp.Json{
            "status": "unhealthy",
            "database": "failed",
            "error": err.Error(),
        })
        return
    }

    r.Response.WriteJsonExit(mhttp.Json{
        "status": "healthy",
        "database": "ok",
    })
}
```

## 读写分离

`mdb` 支持简单配置即可实现主从库的读写分离。所有的写操作（`Create`, `Update`, `Delete`）会走主库，而读操作（`Find`, `First`, `Scan` 等）会随机地走向只读副本库。

### 配置示例

```yaml
# file: config.yaml
database:
  default:
    # 主库配置
    type: "mysql"
    host: "192.168.1.1"
    # ... 其他主库配置 ...

    # 只读副本库列表
    replicas:
      - host: "192.168.1.2"
        user: "readonly_user"
        # ... 其他副本库配置，会继承主库配置 ...
      - host: "192.168.1.3"
        user: "readonly_user"
        # ... 其他副本库配置 ...
```

完成以上配置后，无需修改任何代码，`mdb` 将自动实现读写请求的分发。

## 事务操作

`mdb` 封装了 GORM 的事务方法，使其使用起来更方便。

### 基础事务

```go
err := db.Transact(ctx, func(tx *mdb.DB) error {
    // tx 即为开启了事务的 *mdb.DB 对象
    // 在这个函数内的所有数据库操作都在同一个事务中

    if err := tx.Create(&User{Name: "user1"}).Error; err != nil {
        // 返回错误，事务会自动回滚
        return err
    }

    if err := tx.Create(&User{Name: "user2"}).Error; err != nil {
        return err
    }

    // 返回 nil，事务会自动提交
    return nil
})
```

### 高级事务选项

使用 `TransactWithOptions()` 可以指定事务隔离级别和只读选项：

```go
import "database/sql"

err := db.TransactWithOptions(ctx, &sql.TxOptions{
    Isolation: sql.LevelRepeatableRead,
    ReadOnly:  false,
}, func(ctx context.Context, tx *mdb.DB) error {
    // 事务逻辑
    if err := tx.Create(&User{Name: "user1"}).Error; err != nil {
        return err
    }
    return nil
})
```

**支持的隔离级别**：

| 隔离级别 | 常量 | 说明 |
|---------|------|------|
| 默认 | `sql.LevelDefault` | 使用数据库默认隔离级别 |
| 读未提交 | `sql.LevelReadUncommitted` | 可能出现脏读 |
| 读已提交 | `sql.LevelReadCommitted` | 避免脏读，但可能不可重复读 |
| 可重复读 | `sql.LevelRepeatableRead` | 避免脏读和不可重复读（MySQL 默认） |
| 串行化 | `sql.LevelSerializable` | 最高隔离级别，完全串行 |

**使用建议**：
- 大多数情况使用 `Transact` 即可（默认隔离级别）
- 需要防止幻读时使用 `LevelSerializable`
- 性能要求高且可接受不可重复读时使用 `LevelReadCommitted`
- 只读事务可设置 `ReadOnly: true` 提升性能

## 日志与链路追踪

`mdb` 最强大的功能之一就是与可观测性组件的无缝集成。

- **日志**: 任何由 `mdb` 执行的 SQL 语句都会被 `mlog` 记录下来。如果执行时间超过了您在配置中设置的 `slowThreshold`，日志级别会自动提升为 `Warn`。最重要的是，所有 SQL 日志都会自动包含当前请求的 `trace_id`，让您能轻易地将慢查询和特定请求关联起来。
- **链路**: 每次数据库查询都会在 OpenTelemetry 中创建一个新的 `Span`，其父节点是当前业务逻辑的 `Span`。这使得您可以在 Jaeger, Zipkin 等系统中清晰地看到每一次请求中包含的数据库调用及其耗时。

您无需为这些功能编写任何额外代码，它们都是开箱即用的。

## 实例管理

`mdb` 组件通过 `m` 包来管理数据库实例。

- **`m.DB(name ...string)`**: 获取指定名称的数据库单例。如果实例不存在，它会尝试使用 `database.{name}` 配置进行初始化。如果 `name` 为空，则使用 `default`。
- **`m.DBContext(ctx, name ...string)`**: 是 `m.DB(name...).WithContext(ctx)` 的便捷写法。

这种设计的好处是，您无需在代码中到处传递数据库连接对象。在任何需要数据库操作的地方，只需通过 `m.DB()` 即可获取到正确的、已经初始化好的连接实例。

在大多数应用中，可能只有一个 `default` 实例。但当需要连接多个数据库时，这种具名实例的管理方式就显得非常方便和清晰。
