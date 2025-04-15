# 路由管理

`mhttp` 组件提供了强大且灵活的路由管理功能，支持多种路由注册方式，满足不同的 API 开发需求。

## 基本路由

最简单的路由注册方式是通过 `Server` 对象直接注册 HTTP 方法和路径：

```go
server := mhttp.New()

server.GET("/hello", func(r *mhttp.Request) {
    r.String(200, "Hello World!")
})

server.POST("/users", func(r *mhttp.Request) {
    // 创建用户
    r.JSON(200, map[string]interface{}{
        "message": "用户创建成功",
    })
})
```

`Server` 支持所有标准的 HTTP 方法：

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `PATCH`
- `HEAD`
- `OPTIONS`
- `Any` (匹配任意 HTTP 方法)

## 路由参数

路由支持动态参数，通过`:param`语法在路径中定义参数：

```go
server.GET("/users/:id", func(r *mhttp.Request) {
    id := r.Param("id")
    r.JSON(200, map[string]interface{}{
        "id": id,
        "message": "获取用户信息成功",
    })
})
```

也可以使用`*`通配符匹配剩余的所有路径：

```go
server.GET("/files/*filepath", func(r *mhttp.Request) {
    filepath := r.Param("filepath")
    r.String(200, "文件路径: " + filepath)
})
```

## 路由分组

对于复杂的 API 结构，可以使用路由分组来组织路由：

```go
// 创建API分组
api := server.Group("/api")

// 版本分组
v1 := api.Group("/v1")
v1.GET("/users", func(r *mhttp.Request) {
    // 获取用户列表
})
v1.GET("/users/:id", func(r *mhttp.Request) {
    // 获取单个用户
})

// 另一个版本分组
v2 := api.Group("/v2")
v2.GET("/products", func(r *mhttp.Request) {
    // 获取产品列表
})
```

分组可以无限嵌套，方便管理复杂的 API 结构。

## 路由中间件

中间件可以在路由级别或分组级别应用：

```go
// 全局中间件
server.Use(mhttp.Logger(), mhttp.Recovery())

// 分组中间件
api := server.Group("/api", mhttp.Auth())

// 单个路由中间件
server.GET("/admin", mhttp.Auth(), func(r *mhttp.Request) {
    r.String(200, "管理员页面")
})
```

## RESTful API

`mhttp` 很容易实现 RESTful 风格的 API：

```go
// 用户资源
users := server.Group("/users")

// 获取用户列表
users.GET("", func(r *mhttp.Request) {
    // 列出所有用户
})

// 创建用户
users.POST("", func(r *mhttp.Request) {
    // 创建新用户
})

// 获取单个用户
users.GET("/:id", func(r *mhttp.Request) {
    // 获取指定ID的用户
})

// 更新用户
users.PUT("/:id", func(r *mhttp.Request) {
    // 更新指定ID的用户
})

// 删除用户
users.DELETE("/:id", func(r *mhttp.Request) {
    // 删除指定ID的用户
})
```

## 结构体控制器

对于更复杂的应用程序，可以使用结构体作为控制器：

```go
type UserController struct{}

func (c *UserController) List(r *mhttp.Request) {
    // 获取用户列表
    r.JSON(200, []map[string]interface{}{
        {"id": 1, "name": "张三"},
        {"id": 2, "name": "李四"},
    })
}

func (c *UserController) Get(r *mhttp.Request) {
    id := r.Param("id")
    // 获取指定ID的用户
    r.JSON(200, map[string]interface{}{
        "id": id,
        "name": "张三",
    })
}

// 注册控制器
server := mhttp.New()
uc := new(UserController)

// 方法1：手动绑定
server.GET("/users", uc.List)
server.GET("/users/:id", uc.Get)

// 方法2：自动绑定（假设mhttp提供此功能）
server.BindController("/users", uc)
```

## 注册路由的多种方式

除了常规的路由注册方式，`mhttp` 还支持其他方式：

### 通过 Handle 方法注册

```go
server.Handle("GET", "/path", func(r *mhttp.Request) {
    // 处理请求
})
```

### 通过 Map 批量注册

```go
server.HandleMap(map[string]mhttp.HandlerFunc{
    "GET:/users":     getUserList,
    "POST:/users":    createUser,
    "GET:/users/:id": getUser,
})
```

## 路由信息

可以获取所有已注册的路由信息：

```go
routes := server.Routes()
for _, route := range routes {
    fmt.Printf("Method: %s, Path: %s\n", route.Method, route.Path)
}
```

## 路由组合

复杂场景下，可以组合使用各种路由功能：

```go
api := server.Group("/api", mhttp.Logger())
v1 := api.Group("/v1", mhttp.Auth())

users := v1.Group("/users")
users.GET("", getAllUsers)                 // GET /api/v1/users
users.POST("", createUser, validateUser)   // POST /api/v1/users
users.GET("/:id", getUser)                 // GET /api/v1/users/:id
```

## 路由命名与 URL 生成

`mhttp` 支持路由命名和 URL 生成（如果实现了此功能）：

```go
// 命名路由
server.GET("/users/:id", getUser).Name("user.detail")

// 生成URL
url := server.URL("user.detail", map[string]string{"id": "123"})
// 输出: /users/123
```

## 注意事项

1. 路由注册的顺序很重要，具体路由应该在通配符路由之前注册
2. 分组路由会继承父分组的所有中间件
3. 路由参数名称应该唯一，避免冲突
4. 中间件的执行顺序遵循注册顺序
