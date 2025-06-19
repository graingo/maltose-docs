# Web Server

`mhttp` 是 Maltose 框架提供的 HTTP 服务器组件，基于业界知名的 [Gin](https://github.com/gin-gonic/gin) 框架进行封装和增强，为开发者提供更强大的功能和更流畅的开发体验。

## 核心特性

- **高性能**：继承 Gin 的高性能 Radix 树路由算法，提供卓越的请求处理速度
- **配置驱动**：通过结构化的配置文件和 API 进行服务管理，易于维护和扩展
- **内置中间件**：默认集成链路追踪、指标采集、错误恢复等生产级中间件
- **优雅停机**：支持可配置的优雅停机机制，确保服务安全退出
- **自动化文档**：从代码自动生成 OpenAPI 3.0 规范，内置 Swagger UI 界面
- **深度可观测**：与 `mtrace` 和 `mmetric` 组件深度集成，提供完整的监控能力

## 快速开始

创建一个基础的 `mhttp` 服务器只需几行代码：

```go
package main

import "github.com/graingo/maltose/net/mhttp"

func main() {
	// 创建服务器实例
	s := mhttp.New()

	// 定义路由
	s.GET("/ping", func(r *mhttp.Request) {
		r.String(200, "pong")
	})

	// 启动服务器（默认监听 :8080）
	s.Run()
}
```

## 服务器配置

`mhttp` 提供了丰富的配置选项，支持灵活的服务器定制。

### 主要配置项

| 配置项            | 类型     | 默认值      | 说明                 |
| ----------------- | -------- | ----------- | -------------------- |
| `Address`         | string   | `:8080`     | 服务器监听地址和端口 |
| `ServerName`      | string   | `default`   | 服务器名称标识       |
| `ReadTimeout`     | duration | -           | 读取请求超时时间     |
| `WriteTimeout`    | duration | -           | 写入响应超时时间     |
| `IdleTimeout`     | duration | -           | 连接空闲超时时间     |
| `GracefulEnable`  | bool     | `true`      | 是否启用优雅停机     |
| `GracefulTimeout` | duration | -           | 优雅停机最长等待时间 |
| `OpenapiPath`     | string   | `/api.json` | OpenAPI 规范访问路径 |
| `SwaggerPath`     | string   | `/swagger`  | Swagger UI 访问路径  |

### 配置方式

**方式一：链式调用**

```go
s := mhttp.New()
s.SetAddress(":9000").
  SetServerName("my-app").
  SetReadTimeout(5 * time.Second)
```

**方式二：批量配置**

```go
s := mhttp.New()
err := s.SetConfigWithMap(map[string]any{
    "address":      ":9000",
    "serverName":   "my-app",
    "readTimeout":  "5s",
    "writeTimeout": "10s",
})
if err != nil {
    panic(err)
}
```

## 内置中间件

`mhttp` 自动注册了多个生产级中间件，提供开箱即用的企业级功能：

| 中间件              | 功能     | 说明                                       |
| ------------------- | -------- | ------------------------------------------ |
| **Recovery**        | 异常恢复 | 捕获 panic，防止服务器崩溃，记录错误日志   |
| **Trace**           | 链路追踪 | 集成 OpenTelemetry，自动生成和传播 TraceID |
| **Metric**          | 指标采集 | 采集请求总数、耗时、体积等关键性能指标     |
| **DefaultResponse** | 默认响应 | 确保所有请求都有明确的 HTTP 响应           |

### 标准响应中间件

对于需要统一响应格式的项目，强烈建议启用 `MiddlewareResponse()` 中间件：

```go
s := mhttp.New()
// 启用标准响应格式
s.Use(mhttp.MiddlewareResponse())
```

详细信息请参考 [标准响应](/components/server/standard-response) 文档。

## 扩展功能

### 静态文件服务

轻松提供静态资源服务：

```go
// 将 URL 路径 /assets/ 映射到本地 ./static 目录
s.SetStaticPath("/assets", "./static")
```

### 性能分析支持

一键启用 `pprof` 性能分析：

```go
// 使用默认路径 /debug/pprof
s.EnablePProf()

// 或自定义路径
s.EnablePProf("/my/debug/pprof")
```

## 下一步

- 了解如何定义路由：[路由](/components/server/routing)
- 学习标准响应格式：[标准响应](/components/server/standard-response)
- 掌握中间件开发：[中间件](/components/server/middleware)
