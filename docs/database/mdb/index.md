# 数据库操作模块 (mdb)

`mdb` 是 Maltose 框架中的数据库操作模块，它基于 [GORM](https://gorm.io/) 构建，提供了强大而简洁的数据库访问功能。该模块封装了 GORM 的核心功能，同时提供了额外的特性，如链路追踪集成、实例管理、可配置的连接池等。

## 主要特性

- 支持多种数据库：MySQL、PostgreSQL、SQLite
- 基于 GORM 的全功能 ORM
- 数据库连接池管理
- 自动链路追踪集成
- 慢查询日志记录
- 实例管理与命名实例支持
- 事务便捷支持

## 快速开始

### 基本用法

使用默认配置连接数据库：

```go
package main

import (
    "context"
    "fmt"

    "github.com/graingo/maltose/database/mdb"
)

// 定义一个模型
type User struct {
    ID   uint
    Name string
    Age  int
}

func main() {
    // 获取数据库实例
    db, err := mdb.New()
    if err != nil {
        panic(err)
    }

    // 自动迁移表结构
    db.AutoMigrate(&User{})

    // 创建记录
    user := User{Name: "小明", Age: 18}
    db.Create(&user)

    // 查询记录
    var result User
    db.First(&result, user.ID)

    fmt.Printf("查询结果: ID=%d, Name=%s, Age=%d\n",
        result.ID, result.Name, result.Age)
}
```

### 使用命名实例

通过命名实例管理多个数据库连接：

```go
package main

import (
    "context"
    "fmt"

    "github.com/graingo/maltose/database/mdb"
)

func main() {
    // 配置主数据库
    masterConfig := mdb.DefaultConfig()
    masterConfig.Host = "master-db.example.com"
    masterConfig.User = "root"
    masterConfig.Password = "password"
    masterConfig.DBName = "app_db"

    // 配置只读数据库
    readonlyConfig := mdb.DefaultConfig()
    readonlyConfig.Host = "readonly-db.example.com"
    readonlyConfig.User = "readonly"
    readonlyConfig.Password = "password"
    readonlyConfig.DBName = "app_db"

    // 设置配置
    mdb.SetConfig("master", masterConfig)
    mdb.SetConfig("readonly", readonlyConfig)

    // 获取命名实例
    masterDB, err := mdb.Instance("master")
    if err != nil {
        panic(err)
    }

    readonlyDB, err := mdb.Instance("readonly")
    if err != nil {
        panic(err)
    }

    // 使用不同的连接
    // ...
}
```

### 使用事务

简化的事务处理：

```go
package main

import (
    "context"
    "errors"

    "github.com/graingo/maltose/database/mdb"
)

type User struct {
    ID   uint
    Name string
    Balance int
}

func main() {
    db, err := mdb.New()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()

    // 使用事务处理转账
    err = db.Transact(ctx, func(tx *mdb.DB) error {
        // 查询发送方账户
        var sender User
        if err := tx.Where("id = ?", 1).First(&sender).Error; err != nil {
            return err
        }

        // 检查余额
        if sender.Balance < 100 {
            return errors.New("余额不足")
        }

        // 更新发送方余额
        if err := tx.Model(&sender).Update("balance", sender.Balance - 100).Error; err != nil {
            return err
        }

        // 更新接收方余额
        if err := tx.Model(&User{}).Where("id = ?", 2).
            UpdateColumn("balance", gorm.Expr("balance + ?", 100)).Error; err != nil {
            return err
        }

        return nil
    })

    if err != nil {
        // 事务回滚，处理错误
        panic(err)
    }

    // 事务成功提交
    println("转账成功")
}
```

## 下一步

在接下来的章节中，我们将详细介绍：

- [连接配置](/docs/database/mdb/config) - 详细的数据库连接配置选项
- [基本操作](/docs/database/mdb/basic) - 常用的 CRUD 操作
- [事务管理](/docs/database/mdb/transaction) - 高级事务处理技巧
- [查询构建](/docs/database/mdb/query) - 复杂查询构建方法
- [钩子与回调](/docs/database/mdb/hooks) - 数据操作的钩子机制
- [日志与追踪](/docs/database/mdb/logging) - 数据库操作的日志和链路追踪
