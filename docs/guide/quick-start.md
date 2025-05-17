# 快速开始

本指南将带你快速了解和使用 Maltose 框架，帮助你在短时间内搭建一个基于 Maltose 的 Web 服务。

## 安装 Maltose

使用 Go Modules 安装 Maltose：

```bash
go get -u github.com/graingo/maltose
```

## 创建简单的 HTTP 服务

下面是一个最简单的 Maltose HTTP 服务示例：

```go
package main

import (
	"context"

	"github.com/graingo/maltose/frame/mins"
	"github.com/graingo/maltose/net/mhttp"
)

func main() {
	// 创建一个 HTTP 服务
	s := mins.Server()

	// 注册路由
	s.BindHandler("GET:/hello", func(ctx *mhttp.Context) {
		ctx.JSON(200, map[string]interface{}{
			"message": "Hello, Maltose!",
		})
	})

	// 启动服务，监听 8080 端口
	s.Run(context.Background(), ":8080")
}
```

运行上面的代码，并访问 `http://localhost:8080/hello`，你将看到一个 JSON 响应：

```json
{
  "message": "Hello, Maltose!"
}
```

## 使用结构化路由

Maltose 支持使用结构体方法作为路由处理函数，这样可以更好地组织你的代码：

```go
package main

import (
	"context"

	"github.com/graingo/maltose/frame/mins"
	"github.com/graingo/maltose/net/mhttp"
)

// UserController 用户控制器
type UserController struct{}

// Hello 处理 /user/hello 请求
func (c *UserController) Hello(ctx *mhttp.Context) {
	ctx.JSON(200, map[string]interface{}{
		"message": "Hello from UserController!",
	})
}

// Info 处理 /user/info 请求
func (c *UserController) Info(ctx *mhttp.Context) {
	userId := ctx.Query("id")
	ctx.JSON(200, map[string]interface{}{
		"id":   userId,
		"name": "测试用户",
	})
}

func main() {
	// 创建 HTTP 服务
	s := mins.Server()

	// 注册控制器
	userCtrl := &UserController{}
	s.BindObject("/user", userCtrl)

	// 启动服务
	s.Run(context.Background(), ":8080")
}
```

## 使用中间件

Maltose 完全兼容 Gin 的中间件，你可以使用任何 Gin 中间件或自定义中间件：

```go
package main

import (
	"context"
	"time"

	"github.com/graingo/maltose/frame/mins"
	"github.com/graingo/maltose/net/mhttp"
)

// 自定义中间件：记录请求处理时间
func TimerMiddleware() mhttp.HandlerFunc {
	return func(c *mhttp.Context) {
		// 请求开始时间
		start := time.Now()

		// 处理请求
		c.Next()

		// 计算耗时
		duration := time.Since(start)
		c.Set("request_time", duration.String())

		// 在响应头中添加处理时间
		c.Header("X-Response-Time", duration.String())
	}
}

func main() {
	// 创建 HTTP 服务
	s := mins.Server()

	// 使用中间件
	s.Use(TimerMiddleware())

	// 注册路由
	s.BindHandler("GET:/test", func(ctx *mhttp.Context) {
		// 模拟处理延迟
		time.Sleep(100 * time.Millisecond)

		ctx.JSON(200, map[string]interface{}{
			"message": "处理完成",
			"time":    ctx.GetString("request_time"),
		})
	})

	// 启动服务
	s.Run(context.Background(), ":8080")
}
```

## 下一步

现在你已经了解了 Maltose 的基本使用方法。要深入了解更多功能，请参考以下资源：

- [HTTP 服务详解](/docs/components/mhttp/index)
- [配置管理](/docs/core/mcfg/index)
- [日志系统](/docs/core/mlog/index)
- [数据库操作](/docs/database/mdb/index)

你也可以通过查看 [完整示例项目](https://github.com/graingo/maltose-quickstart) 来学习 Maltose 的最佳实践。
