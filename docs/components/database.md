# 数据库 (mdb)

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
    dbname: "my_database"
    # 连接池配置
    maxIdleConnection: 10
    maxOpenConnection: 100
    # 慢查询阈值，超过该值会被 mlot 记录为 Warn 级别日志
    slowThreshold: "500ms"
```

### 2. 获取数据库实例

在您的代码中，通过 `mdb.Instance()` 获取数据库实例。

```go
package main

import (
    "context"
    "github.com/graingo/maltose/database/mdb"
    "github.com/graingo/maltose/os/mcfg"
)

// 假设您的数据表对应这个 struct
type User struct {
    ID   uint
    Name string
}

func main() {
    ctx := context.Background()

    // 1. 加载数据库配置
    dbCfg, _ := mcfg.Instance().Get(ctx, "database.default")
    // 2. 将配置设置到 mdb 的默认实例
    mdb.SetConfig("default", dbCfg)

    // 3. 获取默认的数据库实例
    db, err := mdb.Instance("default")
    if err != nil {
        panic(err)
    }

    // 4. 使用 db 对象进行数据库操作，用法与原生 GORM 完全一致
    var user User
    db.WithContext(ctx).First(&user, 1) // 查找 ID为1的用户

    fmt.Println(user.Name)
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

## 日志与链路追踪

`mdb` 最强大的功能之一就是与可观测性组件的无缝集成。

- **日志**: 任何由 `mdb` 执行的 SQL 语句都会被 `mlog` 记录下来。如果执行时间超过了您在配置中设置的 `slowThreshold`，日志级别会自动提升为 `Warn`。最重要的是，所有 SQL 日志都会自动包含当前请求的 `trace_id`，让您能轻易地将慢查询和特定请求关联起来。
- **链路**: 每次数据库查询都会在 OpenTelemetry 中创建一个新的 `Span`，其父节点是当前业务逻辑的 `Span`。这使得您可以在 Jaeger, Zipkin 等系统中清晰地看到每一次请求中包含的数据库调用及其耗时。

您无需为这些功能编写任何额外代码，它们都是开箱即用的。
