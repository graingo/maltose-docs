# 生成接口文档

Maltose 框架自动为使用规范路由定义的 API 生成 OpenAPI 规范和 Swagger UI 文档。

## 开箱即用

使用规范路由定义的 API 会自动生成文档，无需额外配置：

```go
package main

import (
    "context"
    "github.com/graingo/maltose/frame/m"
)

// 定义请求结构体
type UserReq struct {
    m.Meta `path:"/user/:id" method:"GET" summary:"获取用户" tag:"用户管理"`
    ID     string `uri:"id" dc:"用户ID"`
}

// 定义响应结构体
type UserRes struct {
    ID   string `json:"id" dc:"用户ID"`
    Name string `json:"name" dc:"用户名"`
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
    s.Bind(&UserController{})
    s.Run()
}
```

## 访问文档

启动服务后，可以通过以下路径访问 API 文档：

- **OpenAPI 规范**：`/api.json`
- **Swagger UI**：`/swagger`

可以通过配置修改这些路径：

```yaml
server:
  openapi_path: "/api-docs/openapi.json"
  swagger_path: "/api-docs"
```

## 添加文档信息

通过结构体标签提供 API 文档信息：

### API 元数据

在 `m.Meta` 中添加文档信息：

```go
type CreateUserReq struct {
    m.Meta `
        path:"/user"
        method:"POST"
        summary:"创建新用户"   // API 摘要
        tag:"用户管理"        // API 分组
        dc:"创建新用户账号"    // API 描述
    `
    // ...字段定义
}
```

### 字段描述

使用 `dc` 标签为字段添加描述：

```go
type UserReq struct {
    // ...
    Username string `json:"username" binding:"required" dc:"用户名，必填"`
    Email    string `json:"email" binding:"required,email" dc:"邮箱地址，必须是有效的邮箱格式"`
    Age      int    `json:"age" binding:"required,gte=18" dc:"年龄，必须大于或等于18岁"`
}
```

## 文档组织建议

为了更好地组织 API 文档：

1. 使用有意义的 `tag` 标签对 API 进行分组
2. 提供清晰简洁的 `summary`
3. 为复杂 API 添加详细的 `dc` 描述
4. 为所有字段添加 `dc` 标签说明用途和约束

```go
// 注册请求
type RegisterReq struct {
    m.Meta   `path:"/auth/register" method:"POST" tag:"认证" summary:"用户注册" dc:"创建新用户账号并返回访问令牌"`
    Username string `json:"username" binding:"required,min=4,max=20" dc:"用户名，4-20个字符"`
    Password string `json:"password" binding:"required,min=8" dc:"密码，最少8个字符"`
    Email    string `json:"email" binding:"required,email" dc:"电子邮箱，用于验证"`
    Age      int    `json:"age" binding:"required,gte=18" dc:"年龄，必须大于等于18岁"`
}
```

## 小结

自动 API 文档生成的优势：

1. 文档与代码同步，避免文档过期
2. 减少手动维护文档的工作量
3. 提供标准化的 API 浏览和测试界面
4. 便于团队协作和客户端开发

恭喜！您已经完成了 Maltose 框架的快速入门教程。接下来，您可以查看[下一步学习](quick-next.md)了解更多高级特性。
