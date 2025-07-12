# 命令行工具 (maltose)

Maltose 框架配备了一个功能强大的命令行工具 `maltose`，旨在提高您的开发效率。它能帮助您快速创建新项目、生成常用代码（如 Model、DAO、Service、Controller）等。

## 安装

我们推荐使用 `go install` 来安装 `maltose` 命令行工具，以确保您使用的是最新版本。

```bash
go install github.com/graingo/maltose/cmd/maltose@latest
```

安装成功后，`maltose` 命令将注册到您的 `GOPATH` 下。您可以通过以下命令验证安装是否成功：

```bash
maltose --version
```

## 开发流程概览

Maltose CLI 工具的设计遵循了典型的 Web 应用开发流程。以下是推荐的使用顺序：

1. **项目初始化**: `maltose new` - 创建新项目
2. **数据层生成**: `maltose gen model` → `maltose gen dao` - 从数据库生成数据访问层
3. **API 层生成**: `maltose gen service` → `maltose gen logic` - 从 API 定义生成业务逻辑层
4. **文档生成**: `maltose gen openapi` - 生成 API 文档

:::tip 命令详解
关于每个命令的详细用法、参数和最佳实践，请参阅 [**命令参考手册**](./commands.md)。
:::

## 典型开发工作流

以下是一个典型的 Maltose 项目开发流程：

### 1. 新项目开始

```bash
# 创建新项目
maltose new my-project
cd my-project

# 配置数据库连接（编辑 .env 文件）
# 然后生成数据层代码
maltose gen model
maltose gen dao
```

### 2. API 开发

```bash
# 定义 API 结构体（在 api/ 目录下）
# 然后生成服务层代码
maltose gen service
maltose gen logic
```

### 3. 文档生成

```bash
# 生成 API 文档
maltose gen openapi
```

### 4. 迭代开发

```bash
# 当数据库表结构变化时
maltose gen model
maltose gen dao

# 当 API 接口变化时
maltose gen service
maltose gen logic

# 更新文档
maltose gen openapi
```

## 注意事项

1. **代码安全性**: 生成的代码会智能地处理已存在的文件，通常采用追加模式而非覆盖模式，保护您的手动修改。

2. **命名约定**: 框架依赖特定的命名约定工作，如 `*Req`/`*Res` 结构体、`I*` 接口等，请遵循这些约定。

3. **文件组织**: 生成的文件会按照 Maltose 推荐的目录结构组织，建议不要随意移动这些文件。

4. **版本控制**: 建议将生成的代码纳入版本控制，便于团队协作和代码审查。

通过合理使用这些命令行工具，您可以显著提高开发效率，将更多时间投入到业务逻辑的实现上。
