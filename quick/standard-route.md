# 规范路由

Maltose 框架提供了规范路由的功能，通过结构体标签定义路由信息，使 API 定义更加清晰明了。

## 基本用法

规范路由通过在请求结构体中嵌入 `m.Meta` 并使用标签来定义路由信息：

```go
package main

import (
    "context"
    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

// 定义请求结构体
type UserReq struct {
    m.Meta `path:"/user/:id" method:"GET" summary:"获取用户" tag:"用户管理"`
    ID     string `uri:"id" binding:"required"`
}

// 定义响应结构体
type UserRes struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

// 定义控制器
type UserController struct{}

// 控制器方法
func (c *UserController) User(ctx context.Context, req *UserReq) (*UserRes, error) {
    return &UserRes{
        ID:   req.ID,
        Name: "测试用户",
    }, nil
}

func main() {
    s := m.Server()

    // 绑定控制器，自动注册所有路由
    s.Bind(&UserController{})

    s.Run()
}
```

## 控制器方法规则

控制器方法需要遵循以下规则：

1. 两个参数：`context.Context` 和请求结构体指针
2. 两个返回值：响应结构体指针和错误
3. 方法名与请求结构体名称关联（去掉 "Req" 后缀）

## 路由元数据标签

`m.Meta` 支持以下标签属性：

```go
type ExampleReq struct {
    m.Meta `
        path:"/example/:id"  // 路由路径
        method:"GET"         // HTTP方法
        summary:"示例接口"    // API摘要
        tag:"示例分组"        // API标签
        dc:"详细描述"         // 接口描述
    `
    ID string `uri:"id"`
}
```

## 路由分组

可以使用路由分组来组织 API：

```go
// 创建API分组
api := s.Group("/api")

// 绑定控制器到分组
api.Bind(&UserController{})
api.Bind(&ProductController{})

// 分组嵌套
v1 := api.Group("/v1")
v1.Bind(&OrderController{})
```

## 接收请求参数

规范路由会自动绑定请求参数到结构体：

```go
type CreateUserReq struct {
    m.Meta   `path:"/user" method:"POST"`
    Username string `json:"username" binding:"required"`
    Email    string `json:"email" binding:"required,email"`
    Age      int    `json:"age" binding:"required,gte=18"`
}

func (c *UserController) CreateUser(ctx context.Context, req *CreateUserReq) (*UserRes, error) {
    // req 中已包含绑定好的参数
    fmt.Printf("创建用户: %s\n", req.Username)
    // ...
}
```

## 小结

规范路由是 Maltose 框架的特色功能，通过它可以：

1. 简化路由定义，集中管理路由信息
2. 自动处理参数绑定和验证
3. 自动生成 API 文档
4. 标准化控制器结构

使用规范路由可以让代码更加清晰，并降低维护成本。在下一节中，我们将介绍 [中间件的使用](middleware.md)。
