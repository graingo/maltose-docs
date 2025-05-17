# 代码分层设计

本文档描述了基于 Maltose 框架开发应用时推荐的代码分层设计方案，帮助开发者构建清晰、可维护的应用架构。

## 层次结构

Maltose 推荐采用经典的分层架构，从上到下依次为：

```
┌───────────────────────┐
│       Controller      │ 请求处理与响应
├───────────────────────┤
│        Service        │ 业务逻辑
├───────────────────────┤
│      Repository       │ 数据访问
├───────────────────────┤
│         Model         │ 数据模型
└───────────────────────┘
```

### 控制器层 (Controller)

控制器层负责处理 HTTP 请求，解析请求参数，调用相应的业务服务，并格式化响应结果。

**职责**：

- HTTP 请求处理
- 参数验证和解析
- 调用业务服务
- 响应格式化
- 错误处理

**示例**：

```go
// UserController 用户控制器
type UserController struct {
    userService *service.UserService
}

// Register 注册用户
func (c *UserController) Register(ctx *mhttp.Context) {
    var req RegisterRequest
    if err := ctx.ShouldBindJSON(&req); err != nil {
        ctx.JSON(400, map[string]interface{}{
            "code":    40000,
            "message": "请求参数错误",
        })
        return
    }

    user, err := c.userService.Register(ctx.Request.Context(), req.Username, req.Password)
    if err != nil {
        ctx.JSON(500, map[string]interface{}{
            "code":    50000,
            "message": "服务器内部错误",
        })
        return
    }

    ctx.JSON(200, map[string]interface{}{
        "code":    0,
        "message": "success",
        "data":    user,
    })
}
```

### 服务层 (Service)

服务层实现业务逻辑，协调不同的资源，确保业务规则的正确执行。

**职责**：

- 实现业务逻辑
- 事务管理
- 业务规则验证
- 调用数据访问层
- 数据转换与业务处理

**示例**：

```go
// UserService 用户服务
type UserService struct {
    userRepo      *repository.UserRepository
    passwordHasher util.PasswordHasher
}

// Register 注册用户
func (s *UserService) Register(ctx context.Context, username, password string) (*model.User, error) {
    // 检查用户名是否已存在
    exists, err := s.userRepo.ExistsByUsername(ctx, username)
    if err != nil {
        return nil, err
    }
    if exists {
        return nil, errors.New("用户名已存在")
    }

    // 密码哈希
    hashedPassword, err := s.passwordHasher.Hash(password)
    if err != nil {
        return nil, err
    }

    // 创建用户
    user := &model.User{
        Username: username,
        Password: hashedPassword,
        CreatedAt: time.Now(),
    }

    // 保存用户
    if err := s.userRepo.Create(ctx, user); err != nil {
        return nil, err
    }

    return user, nil
}
```

### 仓库层 (Repository)

仓库层负责数据访问逻辑，封装了与数据库或其他持久化存储的交互。

**职责**：

- 数据库操作
- 数据查询和持久化
- 缓存管理
- 数据映射

**示例**：

```go
// UserRepository 用户数据访问
type UserRepository struct {
    db *mdb.DB
}

// Create 创建用户
func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
    return r.db.WithContext(ctx).Create(user).Error
}

// ExistsByUsername 检查用户名是否存在
func (r *UserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
    var count int64
    err := r.db.WithContext(ctx).Model(&model.User{}).
        Where("username = ?", username).
        Count(&count).
        Error
    return count > 0, err
}

// FindByID 根据ID查找用户
func (r *UserRepository) FindByID(ctx context.Context, id uint) (*model.User, error) {
    var user model.User
    err := r.db.WithContext(ctx).First(&user, id).Error
    if err != nil {
        return nil, err
    }
    return &user, nil
}
```

### 模型层 (Model)

模型层定义了应用程序的数据结构和业务对象。

**职责**：

- 数据结构定义
- 数据验证规则
- ORM 标签

**示例**：

```go
// User 用户模型
type User struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Username  string    `gorm:"uniqueIndex;size:50" json:"username"`
    Password  string    `gorm:"size:100" json:"-"`
    Nickname  string    `gorm:"size:50" json:"nickname"`
    Email     string    `gorm:"size:100" json:"email"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
```

## 跨层关注点

除了基本的分层结构外，还有一些横跨多个层次的关注点：

### 1. 日志与监控

使用 `mlog` 和 `mmetric` 模块在各层记录关键信息和性能指标。

```go
// Service层日志示例
func (s *UserService) Register(ctx context.Context, username, password string) (*model.User, error) {
    logger := mlog.DefaultLogger()
    logger.Info(ctx, "用户注册", "username", username)

    // 业务逻辑...

    if err != nil {
        logger.Error(ctx, "用户注册失败", "error", err, "username", username)
        return nil, err
    }

    logger.Info(ctx, "用户注册成功", "user_id", user.ID, "username", username)
    return user, nil
}
```

### 2. 错误处理

统一的错误处理策略和自定义错误类型。

```go
// 错误定义
var (
    ErrUserNotFound    = errors.New("用户不存在")
    ErrUserExists      = errors.New("用户已存在")
    ErrInvalidPassword = errors.New("密码不正确")
)

// 使用错误
if user == nil {
    return nil, ErrUserNotFound
}
```

### 3. 上下文传递

通过 `context.Context` 在各层之间传递请求上下文、超时控制、链路跟踪等信息。

```go
func (c *Controller) List(ctx *mhttp.Context) {
    // 设置超时
    timeoutCtx, cancel := context.WithTimeout(ctx.Request.Context(), 5*time.Second)
    defer cancel()

    // 传递上下文
    result, err := c.service.List(timeoutCtx, req)
    // ...
}
```

## 依赖注入

Maltose 推荐使用依赖注入组织代码依赖关系，可以使用 `wire` 或手动构造的方式。

**手动依赖注入示例**：

```go
// 初始化依赖
func initServices() (*UserController, error) {
    // 数据库
    db, err := mdb.New()
    if err != nil {
        return nil, err
    }

    // 仓库
    userRepo := &repository.UserRepository{DB: db}

    // 服务
    passwordHasher := &util.BcryptPasswordHasher{}
    userService := &service.UserService{
        UserRepo:      userRepo,
        PasswordHasher: passwordHasher,
    }

    // 控制器
    userController := &controller.UserController{
        UserService: userService,
    }

    return userController, nil
}
```

## 最佳实践

1. **遵循单一职责原则**：每个组件应当只关注一个核心职责
2. **避免层次跨越**：不要在控制器直接访问仓库层
3. **保持接口清晰**：为每一层定义清晰的接口契约
4. **使用依赖注入**：避免直接依赖具体实现
5. **统一错误处理**：定义明确的错误类型和处理策略
6. **上下文传递**：通过 context 传递请求级别的信息
7. **日志与监控**：各层合理记录日志和指标

通过遵循这些分层设计原则，可以构建出结构清晰、易于维护和扩展的应用程序。
