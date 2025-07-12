# 快速上手

本章节将引导您完成 Maltose 框架的安装，并创建和运行您的第一个 "Hello, World" 应用。

## 1. 安装

我们强烈推荐使用 `go install` 来安装 `maltose` 命令行工具，这可以确保您总是使用最新的版本，并能方便地在任何地方调用它。

```bash
go install github.com/graingo/maltose/cmd/maltose@latest
```

安装完成后，`maltose` 命令将被放置在您的 `GOPATH/bin` 目录下。请确保该目录已添加到您的系统环境变量 `PATH` 中。

通过以下命令验证安装是否成功：

```bash
maltose --version
# 应当输出类似 Maltose CLI version: x.x.x 的信息
```

## 2. 创建新项目

使用 `maltose new` 命令可以快速创建一个基于官方模板的新项目。

```bash
maltose new hello-maltose
```

此命令会创建一个名为 `hello-maltose` 的目录，其中包含了预设的目录结构、示例代码以及所有必要的配置文件。

## 3. 运行项目

进入项目目录，并启动服务。

```bash
# 1. 进入项目目录
cd hello-maltose

# 2. 拉取依赖
go mod tidy

# 3. 运行项目
go run .
```

当您在终端看到类似以下的输出时，说明您的服务已经成功启动：

```text
Listening and serving HTTP on :8080
```

## 4. 发送请求

现在，打开一个新的终端，或使用任何 HTTP 客户端（如 `curl` 或 Postman）向您的新服务发送一个请求：

```bash
curl http://127.0.0.1:8080/hello
```

如果一切顺利，您将会收到如下响应：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "message": "Hello World"
  }
}
```

恭喜您！您已经成功创建并运行了您的第一个 Maltose 应用。

## 下一步

从 "Hello, World" 到一个真正的 API 服务，您只需要两步：

1.  **定义 API**: 在 `api/v1/` 目录下创建一个 `user.go` 文件，定义获取用户信息的请求和响应结构体。
2.  **生成代码**: 在项目根目录运行 `maltose gen service`，Maltose 会自动为您创建对应的 Controller 和 Service 文件骨架。

这个 **“定义 -> 生成”** 的工作流是 Maltose 的核心。现在，我们建议您继续深入学习：

- [**核心概念**](./core-concepts.md): 了解 Maltose 框架背后的设计思想。
- [**项目结构**](./directory-structure.md): 熟悉官方推荐的项目目录是如何组织的。
- [**命令行工具**](../cli/index.md): 深入了解 `maltose` CLI 工具的更多用法。
