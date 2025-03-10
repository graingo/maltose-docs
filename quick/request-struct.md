# 请求数据结构

使用结构体绑定请求参数是一种良好的编程实践，可以提高代码的维护性和可读性。

## 结构体定义

在 Maltose 中，我们可以定义结构体来接收并验证请求参数：

```go
package main

import (
    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

// 定义请求结构体
type RegisterReq struct {
    Username string `json:"username" binding:"required,min=3,max=20"`
    Password string `json:"password" binding:"required,min=6"`
    Email    string `json:"email" binding:"required,email"`
}

func main() {
    s := m.Server()

    s.POST("/register", func(r *mhttp.Request) {
        // 创建请求结构体
        var req RegisterReq

        // 绑定请求数据
        if err := r.ShouldBind(&req); err != nil {
            r.String(400, "参数错误: "+err.Error())
            return
        }

        // 使用绑定后的数据
        r.JSON(200, map[string]interface{}{
            "message": "注册成功",
            "username": req.Username,
        })
    })

    s.Run()
}
```

## 参数验证

结构体标签中的 `binding` 用于定义验证规则：

```go
type CreateUserReq struct {
    Username string `json:"username" binding:"required,min=3,max=20"` // 必填，长度3-20
    Password string `json:"password" binding:"required,min=6"`        // 必填，最小长度6
    Email    string `json:"email" binding:"required,email"`           // 必填，邮箱格式
    Age      int    `json:"age" binding:"required,gte=18"`            // 必填，大于等于18
}
```

## 自动绑定

Maltose 支持自动绑定不同来源的参数：

- `form`：查询参数或表单参数
- `json`：JSON 请求体
- `uri`：路径参数
- `header`：请求头

```go
type UserReq struct {
    ID      int    `uri:"id"`                  // 路径参数
    Token   string `header:"Authorization"`    // 请求头
    Page    int    `form:"page,default=1"`     // 查询参数
    Name    string `json:"name" form:"name"`   // JSON或表单
}
```

## 数据源示例

### 从多个来源绑定

```go
// 路由：/user/:id
s.GET("/user/:id", func(r *mhttp.Request) {
    var req struct {
        ID    int    `uri:"id"`
        Token string `header:"Authorization"`
        Page  int    `form:"page,default=1"`
    }

    // 优先绑定路径参数
    if err := r.ShouldBindUri(&req); err != nil {
        r.String(400, err.Error())
        return
    }

    // 然后绑定其他参数
    if err := r.ShouldBind(&req); err != nil {
        r.String(400, err.Error())
        return
    }

    r.JSON(200, req)
})
```

## 小结

使用结构体绑定请求参数的优势：

1. 类型安全，自动进行类型转换
2. 自动参数验证，减少手动验证代码
3. 清晰的代码结构，提高可维护性
4. 文档化，便于团队协作

在下一节中，我们将介绍 [规范路由](standard-route.md) 的使用，让路由定义更加简洁和标准化。
