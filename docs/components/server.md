# Web Server (mhttp)

`mhttp` 是 Maltose 框架提供的 HTTP 服务器组件，它基于业界知名的 [Gin](https://github.com/gin-gonic/gin) 框架进行封装和增强，旨在提供更强大的功能和更流畅的开发体验。

## 特性

- **高性能**: 继承了 Gin 的高性能 Radix 树路由和速度优势。
- **配置驱动**: 通过结构化的 `ServerConfig` 进行配置，易于管理和扩展。
- **内置中间件**: 默认集成了链路追踪、指标采集、错误恢复和统一响应等实用中间件。
- **优雅停机**: 支持可配置的优雅停机，确保服务在退出时能处理完进行中的请求。
- **自动化文档**: 自动从代码生成 OpenAPI 3.0 规范，并内置了 Swagger UI 界面。
- **可观测性**: 深度集成了 `mtrace` 和 `mmetric` 组件，所有请求的链路和指标都会被自动采集。

## 快速上手

创建一个基础的 `mhttp` 服务器非常简单。

```go
package main

import "github.com/graingo/maltose/net/mhttp"

func main() {
	// 1. 创建一个新的服务器实例
	s := mhttp.New()

	// 2. 定义一个简单的路由
	s.GET("/ping", func(r *mhttp.Request) {
		r.String(200, "pong")
	})

	// 3. 启动服务器 (默认监听 8080 端口)
	s.Run()
}
```

## 服务器配置

`mhttp` 提供了丰富的配置选项，您可以通过 `ServerConfig` 结构体进行配置。

### 主要配置项

- `Address`: 服务器监听地址和端口 (默认: `:8080`)。
- `ServerName`: 服务器名称 (默认: `default`)。
- `ReadTimeout`, `WriteTimeout`, `IdleTimeout`: 网络超时设置。
- `GracefulEnable`: 是否启用优雅停机 (默认: `true`)。
- `GracefulTimeout`: 优雅停机的最长等待时间。
- `OpenapiPath`: OpenAPI 规范的访问路径 (默认: `/api.json`)。
- `SwaggerPath`: Swagger UI 的访问路径 (默认: `/swagger`)。
- `Logger`: 自定义日志记录器。

### 配置示例

```go
s := mhttp.New()

// 直接修改配置项
s.SetAddress(":9000")
s.SetServerName("my-app")

// 或者使用 Map 进行批量配置
err := s.SetConfigWithMap(map[string]any{
    "address": ":9000",
    "serverName": "my-app",
    "readTimeout": "5s",
    "writeTimeout": "10s",
})
if err != nil {
    panic(err)
}

s.Run()
```

## 内置中间件

`mhttp` 在创建时会自动注册一系列有用的中间件，以提供开箱即用的可观测性和稳定性。

- **Recovery**: 捕获 `panic`，防止服务器崩溃，并记录错误日志。
- **Trace**: 集成 OpenTelemetry，为每个请求生成和传播 TraceID，自动创建 Span。
- **Metric**: 为每个请求采集关键指标，如请求总数、活跃请求数、请求耗时、请求体大小等。
- **DefaultResponse**: 提供一个默认的响应处理机制，确保即使 handler 没有写入任何响应，客户端也能收到一个明确的 HTTP 200 空响应。

如果您需要更精细的控制，例如自定义响应格式，可以添加 `mhttp.MiddlewareResponse()` 中间件，它会将所有响应（包括业务数据和错误）格式化为标准的 JSON 结构。

```go
import "github.com/graingo/maltose/net/mhttp"

// 在 Use 中添加标准响应中间件
s.Use(mhttp.MiddlewareResponse())
```

## 静态文件服务

`mhttp` 支持设置静态文件目录，方便提供 Web 静态资源。

```go
// 将 URL 路径 /assets/ 映射到本地的 ./static 目录
s.SetStaticPath("/assets", "./static")
```

## PProf 支持

您还可以一键开启 `pprof`，方便进行性能分析。

```go
// 默认将 pprof 路由注册在 /debug/pprof 路径下
s.EnablePProf()

// 也可以自定义路径
s.EnablePProf("/my/debug/pprof")
```
