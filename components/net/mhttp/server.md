# HTTP 服务器

Maltose 的 HTTP 服务器基于 Gin 构建，提供了丰富的配置选项和管理功能。

## 创建服务器

### 默认服务器

使用 `m.Server()` 创建默认服务器：

```go
import "github.com/graingo/maltose/frame/m"

func main() {
    s := m.Server()
}
```

### 命名服务器

创建指定名称的服务器：

```go
// 创建名为 "api" 的服务器
s := m.Server("api")
```

## 服务器配置

### 通过配置文件配置

在 YAML 配置文件中设置 HTTP 服务器相关配置：

```yaml
server:
  address: ":8080" # 监听地址
  serverRoot: "./public" # 静态文件根目录
  serverLocale: "zh" # 默认语言环境
  readTimeout: 60 # 读取超时(秒)
  writeTimeout: 60 # 写入超时(秒)
  idleTimeout: 60 # 空闲连接超时(秒)
  maxHeaderBytes: 1048576 # 最大请求头大小(字节)

  # TLS 配置
  tls_enable: false # 是否启用TLS
  tls_cert_file: "" # TLS证书文件
  tls_key_file: "" # TLS密钥文件

  # 优雅关闭配置
  graceful_enable: true # 是否启用优雅关闭
  graceful_timeout: 30s # 优雅关闭超时时间
  graceful_wait_time: 5s # 优雅关闭等待时间

  # API 文档配置
  openapi_path: "/api.json" # OpenAPI规范路径
  swagger_path: "/swagger" # Swagger UI路径
```

### 通过代码配置

根据实际代码，可以使用 `SetConfig` 方法设置配置：

```go
import "github.com/graingo/maltose/frame/m"

func main() {
    s := m.Server()

    // 通过map设置配置
    s.SetConfig(map[string]interface{}{
        "address": ":8080",
        "server_name": "my-server",
        "server_root": "./public",
        "read_timeout": 60,
        "write_timeout": 60
    })

    // 设置服务器名称
    s.SetServerName("custom-server")

    // 设置地址
    s.SetAddress(":8888")
}
```

## 启动服务器

### 基本启动

```go
// 启动服务器
s.Run()
```

服务器启动时会自动执行以下操作：

1. 注册 OpenAPI 和 Swagger 文档
2. 绑定所有预定义的路由
3. 打印路由信息
4. 监听系统信号以实现优雅关闭

## 静态文件服务

设置静态文件服务目录：

```go
// 设置静态文件目录
s.SetStaticPath("/static", "./public")
```

## 访问日志

服务器内置了日志功能：

```go
// 获取日志实例
logger := s.Logger()

// 使用日志
logger.Info(ctx, "服务器已启动")
```

## 启用 PProf

Maltose 内置了对 PProf 的支持，用于性能分析：

```go
// 启用 PProf，默认路径为 /debug/pprof
s.EnablePProf()

// 自定义 PProf 路径
s.EnablePProf("/admin/debug/pprof")
```

## 优雅关闭

Maltose 默认支持优雅关闭，当收到终止信号（如 SIGINT 或 SIGTERM）时会自动进行以下操作：

1. 等待配置的优雅等待时间（默认 5 秒）
2. 在配置的超时时间内（默认 30 秒）关闭服务器
3. 记录相应的日志

这一切都在 `s.Run()` 方法中自动处理，无需额外代码。

## 文档生成

Maltose 自动生成 OpenAPI 规范和 Swagger UI：

```yaml
# 配置文件中设置路径
server:
  openapi_path: "/api.json" # OpenAPI规范路径
  swagger_path: "/swagger" # Swagger UI路径
```

访问 `/swagger` 可以查看自动生成的 API 文档界面。
