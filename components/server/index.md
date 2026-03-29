# Web Server

`mhttp` 是 Maltose 的 HTTP 服务器组件，基于 Gin 封装，补上了控制器绑定、标准响应、OpenAPI、指标和链路追踪等常用能力。

## 快速开始

```go
package main

import "github.com/graingo/maltose/net/mhttp"

func main() {
    s := mhttp.New()

    s.GET("/ping", func(r *mhttp.Request) {
        r.String(200, "pong")
    })

    s.Run()
}
```

## 默认能力

`mhttp.New()` 会自动注册：

- Trace 中间件
- Recovery 中间件
- Metric 中间件
- DefaultResponse 中间件

如果需要统一 JSON 响应格式，再额外挂载：

```go
s.Use(mhttp.MiddlewareResponse())
```

## 主要配置项

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `address` | `8080` | 监听地址，运行时会规范化为 `:8080` |
| `server_name` | `default` | 服务名 |
| `server_locale` | `zh` | 校验翻译语言 |
| `read_timeout` | `60s` | 读超时 |
| `write_timeout` | `60s` | 写超时 |
| `idle_timeout` | `60s` | 空闲超时 |
| `max_header_bytes` | `1048576` | 请求头大小上限 |
| `health_check` | `/health` | 健康检查路径 |
| `graceful_enable` | `true` | 是否启用优雅停机 |
| `graceful_timeout` | `30s` | 优雅停机超时 |
| `graceful_wait_time` | `5s` | 停机前等待中的连接缓冲时间 |
| `openapi_path` | 空 | OpenAPI 输出路径 |
| `swagger_path` | 空 | Swagger UI 路径 |
| `print_routes` | `false` | 是否打印路由 |

## 配置方式

### 直接设置

```go
s := mhttp.New()
s.SetAddress(":9000")
s.SetServerName("my-app")
```

### 批量设置

```go
s := mhttp.New()

if err := s.SetConfigWithMap(map[string]any{
    "address":       ":9000",
    "server_name":   "my-app",
    "read_timeout":  "5s",
    "write_timeout": "10s",
    "openapi_path":  "/api.json",
    "swagger_path":  "/swagger",
}); err != nil {
    panic(err)
}
```

## 常用扩展

### 静态文件

```go
s.SetStaticPath("/assets", "./static")
```

### PProf

```go
s.EnablePProf()
// 或者
s.EnablePProf("/debug/pprof")
```

## 下一步

- 路由与控制器绑定：[路由](/components/server/routing)
- 响应统一包装：[标准响应](/components/server/standard-response)
- 自定义横切逻辑：[中间件](/components/server/middleware)
