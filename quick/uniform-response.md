# 统一返回结构

在 API 开发中，使用统一的返回格式可以提高前后端协作效率，便于客户端处理响应数据。

## 标准返回格式

通常，一个标准的返回结构包含以下字段：

```json
{
  "code": 0, // 状态码，0表示成功
  "message": "success", // 状态信息
  "data": {
    // 业务数据
    "id": 1,
    "name": "用户名"
  }
}
```

## 使用响应中间件

Maltose 提供了内置的响应中间件，可以将返回值自动包装为标准格式：

```go
package main

import (
    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/net/mhttp"
)

func main() {
    s := m.Server()

    // 使用标准响应中间件
    s.Use(mhttp.MiddlewareResponse())

    // 路由处理函数
    s.GET("/user", func(r *mhttp.Request) {
        // 设置响应数据
        r.Set("response", map[string]interface{}{
            "id": 1,
            "name": "张三",
        })
    })

    s.Run()
}
```

访问 `/user` 接口将返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "张三"
  }
}
```

## 在控制器中使用

在规范路由控制器中，直接返回响应结构体和错误：

```go
// 控制器方法
func (c *UserController) GetUser(ctx context.Context, req *GetUserReq) (*GetUserRes, error) {
    // 成功响应
    return &GetUserRes{
        ID:   req.ID,
        Name: "张三",
    }, nil

    // 或返回错误
    // return nil, errors.New("用户不存在")
}
```

成功响应将被包装为：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "123",
    "name": "张三"
  }
}
```

错误响应将被包装为：

```json
{
  "code": 500,
  "message": "用户不存在",
  "data": null
}
```

## 使用自定义错误码

可以使用 `merror` 和 `mcode` 返回自定义错误码：

```go
import (
    "github.com/graingo/maltose/errors/merror"
    "github.com/graingo/maltose/errors/mcode"
)

func (c *UserController) GetUser(ctx context.Context, req *GetUserReq) (*GetUserRes, error) {
    // 参数验证
    if req.ID == "" {
        return nil, merror.NewCode(mcode.CodeInvalidParam, "用户ID不能为空")
    }

    // 业务处理
    if userNotExist {
        return nil, merror.NewCode(mcode.CodeNotFound, "用户不存在")
    }

    // 正常返回
    return &GetUserRes{
        ID:   req.ID,
        Name: "张三",
    }, nil
}
```

## 小结

统一返回结构的优势包括：

1. 前后端接口规范统一，减少沟通成本
2. 客户端处理逻辑简化，统一错误处理
3. 便于框架级别的错误处理和日志记录
4. 提高接口文档的可读性

在下一节中，我们将介绍如何[生成 API 文档](api-docs.md)，使您的 API 更易于理解和使用。
