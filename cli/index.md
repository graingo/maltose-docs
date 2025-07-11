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

## 命令详解

### 1. 项目初始化

#### `maltose new`

**使用场景**: 开始一个全新的 Maltose 项目时使用。

- **用法**

  ```bash
  maltose new [project-name]
  ```

- **功能**:

  - 克隆官方的 [maltose-quickstart](https://github.com/graingo/maltose-quickstart) 模板到指定的 `[project-name]` 目录。
  - 自动移除模板中的 `.git` 目录，以便您初始化自己的 Git 仓库。
  - 智能地更新 `go.mod` 文件，将其 `module` 路径设置为符合您当前工作目录的路径，方便您立即开始开发。

- **参数**:

  - `[project-name]` (必需): 您要创建的新项目的名称。

- **示例**:

  ```bash
  # 在当前目录下创建一个名为 my-app 的新项目
  maltose new my-app
  cd my-app
  go mod tidy
  go run .
  ```

- **后续步骤**: 项目创建后，您可以立即运行 `go run .` 来启动示例应用，然后根据业务需求继续使用其他生成命令。

### 2. 数据层生成

#### `maltose gen model`

**使用场景**: 当您已有数据库表结构，需要快速生成对应的 Go 结构体时使用。这通常是数据驱动开发的第一步。

- **用法**

  ```bash
  maltose gen model [flags]
  ```

- **功能**:

  - 连接到在 `.env` 文件中配置的数据库。
  - 读取数据库中的所有表（或指定的表）。
  - 为每个表生成对应的 Go struct 文件，并存放在 `internal/model/entity` 目录中。这些文件已包含正确的字段类型、`gorm` 和 `json` 标签。

- **前置条件**:

  - 项目根目录下必须有 `.env` 文件，并正确配置了数据库连接信息 (`DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`)。如果文件不存在，工具会为您生成一个 `.env.example` 模板。

- **Flags**:

  - `-d, --dst`: 指定生成文件的目标路径。默认为 `internal/model`。
  - `-t, --table`: 指定只为哪些表生成模型，多个表名用逗号 `,` 分隔。
  - `-x, --exclude`: 指定在生成时排除哪些表，多个表名用逗号 `,` 分隔。

- **示例**:

  ```bash
  # 为所有表生成模型
  maltose gen model

  # 只为 users 和 orders 表生成模型
  maltose gen model -t users,orders

  # 生成所有表但排除系统表
  maltose gen model -x sys_log,sys_config
  ```

- **最佳实践**: 建议在项目开始阶段，数据库表结构相对稳定后执行此命令。生成的 entity 文件不应手动修改，如需扩展可在 `do` 目录下创建自定义结构体。

#### `maltose gen dao`

**使用场景**: 在生成了 Model 之后，需要创建数据访问层代码时使用。为每个表提供标准的 CRUD 操作。

- **用法**

  ```bash
  maltose gen dao [flags]
  ```

- **功能**:

  - 为数据库中的每个表生成一套完整的、可立即使用的 DAO 代码，包含常见的增删改查方法。
  - 生成的文件遵循可扩展的设计：
    - `internal/dao/internal/`: 包含基础的 CRUD 实现，**此目录下的文件不应手动修改**。
    - `internal/dao/`: 继承自 `internal` 中的 DAO，您可以在这里自由扩展自定义的数据库操作方法。

- **前置条件**:

  - `.env` 文件配置正确。
  - 推荐先通过 `maltose gen model` 生成了对应的 Model 文件，因为 DAO 代码会依赖它们。

- **Flags**:

  - `-d, --dst`: 指定生成文件的目标路径。默认为 `internal/dao`。

- **示例**:

  ```bash
  # 为所有表生成 DAO
  maltose gen dao
  ```

- **最佳实践**:
  - 先生成 Model，再生成 DAO，确保依赖关系正确。
  - 自定义的数据库操作方法应该在 `internal/dao/` 目录下的文件中添加，而不是修改 `internal/dao/internal/` 下的文件。

### 3. API 层生成

#### `maltose gen service`

**使用场景**: 当您已经定义了 API 接口（在 `api/` 目录下的 `*Req` 和 `*Res` 结构体），需要生成对应的 Controller 和 Service 骨架代码时使用。

- **用法**

  ```bash
  maltose gen service [flags]
  ```

- **功能**:

  - 扫描 `api` 目录下的 Go 文件，自动寻找成对的 `*Req` 和 `*Res` 结构体。
  - 根据找到的 API 定义，自动生成：
    - 对应的 Controller 文件及方法骨架（在 `internal/controller` 下）。
    - 对应的 Service 接口或结构体骨架文件（在 `internal/service` 下）。

- **支持的路径格式**:

  - `api/v1/hello.go` - 简单版本格式
  - `api/hello/v1/hello.go` - 模块+版本格式
  - `api/hello/hello.go` - 模块格式（默认版本为 v1）

- **Flags**:

  - `-s, --src`: API 定义文件的源路径。默认为 `api`。
  - `-d, --dst`: 生成文件的目标路径。默认为 `internal`。
  - `-m, --mode`: 生成模式，`interface` (默认) 或 `struct`。`interface` 模式会生成 Service 接口，是推荐的最佳实践。

- **示例**:

  ```bash
  # 扫描 api 目录，生成 Controller 和 Service 接口
  maltose gen service

  # 指定源路径和目标路径
  maltose gen service -s ./api -d ./internal

  # 生成 Service 结构体而非接口
  maltose gen service -m struct
  ```

- **最佳实践**:
  - 推荐使用 `interface` 模式，便于后续的依赖注入和单元测试。
  - API 定义文件应该遵循 `*Req` 和 `*Res` 的命名约定。
  - 生成的 Controller 和 Service 文件如果已存在，工具会智能地只添加新的方法，不会覆盖已有的实现。

#### `maltose gen logic`

**使用场景**: 在生成了 Service 接口之后，需要创建业务逻辑实现层时使用。确保业务逻辑层与接口定义保持同步。

- **用法**

  ```bash
  maltose gen logic [flags]
  ```

- **功能**:

  - 扫描 Service 接口文件（默认为 `internal/service` 目录）。
  - 为接口中定义的每个方法，在 `internal/logic` 目录下生成或追加对应的空实现方法。这可以确保业务逻辑层与接口定义始终保持同步，避免遗漏。

- **前置条件**:

  - Service 文件中已定义了接口 (例如 `type IUser interface { ... }`)，通常由 `maltose gen service` 生成。

- **Flags**:

  - `-s, --src`: Service 接口文件的源路径。默认为 `internal/service`。
  - `-d, --dst`: 生成文件的目标路径。默认为 `internal`。
  - `-o, --overwrite`: 如果 Logic 文件已存在，则强制覆盖它。默认为 `false` (追加新方法模式)。

- **示例**:

  ```bash
  # 生成 Logic 层实现
  maltose gen logic

  # 强制覆盖已存在的 Logic 文件
  maltose gen logic -o
  ```

- **最佳实践**:
  - 通常在 Service 接口发生变化后执行此命令，确保 Logic 层实现与接口保持一致。
  - 默认的追加模式比较安全，避免覆盖已有的业务逻辑实现。

### 4. 文档生成

#### `maltose gen openapi`

**使用场景**: 当您在代码中完成了 API 定义，需要为前端、客户端或 API 网关生成一份标准的 OpenAPI 规范（v3）时使用。

- **用法**

  ```bash
  maltose gen openapi [flags]
  ```

- **功能**:

  - 扫描 `api` 目录下的 Go 文件，解析请求结构体中的 `mmeta.Meta` 元信息（路径、方法、标签等）。
  - **深度解析结构体**：能够递归地解析请求和响应结构体，包括**嵌套结构体**、**指针**和**切片**类型。
  - **自动生成组件定义**：为所有解析到的自定义类型（如 `Image`, `File`）在 `components/schemas` 中创建完整的 schema 定义，并通过 `$ref` 在 API 操作中引用它们。
  - **支持多种输出格式**：可以生成 `yaml` 或 `json` 格式的规范文件。

- **前置条件**:

  - `api` 目录下的请求结构体（如 `*Req`）需要实现 `Meta() mmeta.Meta` 方法，并提供路由、方法等信息。
  - 结构体字段建议使用 `json`, `path`, `form`, `dc` (description) 等标签来提供详尽的元数据。

- **Flags**:

  - `-s, --src`: API 定义文件的源路径。默认为 `api`。
  - `-o, --output`: 指定输出文件的路径。默认为 `openapi.yaml`。
  - `-f, --format`: 指定输出格式，可选值为 `yaml` 或 `json`。
    - **智能推断**：如果此标志未被设置，工具会根据 `--output` 文件名的后缀（`.yaml`, `.yml` 或 `.json`）自动推断格式。

- **示例**:

  ```bash
  # 生成默认的 openapi.yaml
  maltose gen openapi

  # 生成名为 api.json 的 JSON 格式规范
  maltose gen openapi -o api.json

  # 显式指定格式
  maltose gen openapi -o api.spec -f yaml
  ```

- **最佳实践**:
  - 在请求和响应的 `struct` 字段上尽可能详细地使用 `dc:"..."` 标签，它将被转换为 `description` 字段，极大地提高 API 文档的可读性。
  - 复杂的数据结构（如分页列表）应定义为独立的、可重用的结构体，`gen openapi` 会自动将其提取到 `components/schemas` 中，使 API 规范更清晰。

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
