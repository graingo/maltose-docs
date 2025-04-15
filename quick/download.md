# 下载与使用

Maltose 是一款基于 Gin 构建的模块化、低耦合设计的 Go 开发框架，包含常用的基础组件和开发工具，适用于完整业务项目和独立组件库开发。

## 环境要求

- Go 1.22 或更高版本
- 支持 Go Modules

## 下载安装

使用 Go Modules，您可以轻松地将 Maltose 添加到您的项目中:

```bash
go get -u github.com/graingo/maltose
```

## 目录结构

Maltose 框架的目录结构如下：

```
maltose/
├── net/           # 网络相关组件
│   ├── mhttp/     # HTTP 服务实现
│   └── mtrace/    # 分布式追踪
├── os/            # 系统相关组件
│   ├── mcfg/      # 配置管理
│   ├── mlog/      # 日志系统
│   └── mmetric/   # 指标系统
├── container/     # 容器组件
│   ├── minstance/ # 实例管理
│   └── mvar/      # 变量处理
├── util/          # 工具包
│   └── mmeta/     # 元数据工具
└── frame/         # 框架核心
    ├── m/         # 框架入口
    └── mins/      # 框架实例管理
```

## 基本使用

初始化模块:

```bash
mkdir hello-maltose
cd hello-maltose
go mod init hello
```

主函数创建:

```go
package main

import "github.com/graingo/maltose/frame/m"

func main() {
    // 创建HTTP服务
    s := m.Server()

    // 注册接口
    s.GET("/hello", func(r *mhttp.Request) {
        r.String(200, "Hello Maltose!")
    })

    // 启动服务
    s.Run()
}
```

运行项目:

```bash
go run main.go
```

此时访问 `http://127.0.0.1:8080/hello`，将看到输出 `Hello Maltose!`

## 下一步

接下来，您可以按照 [Hello World](hello-world.md) 章节，学习如何使用 Maltose 创建更实用的 Web 服务。
