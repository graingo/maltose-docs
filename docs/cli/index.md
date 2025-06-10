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

## 命令概览

### `maltose new`

此命令用于基于官方模板，快速创建一个全新的 Maltose 项目。

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
  ```

### `maltose gen model`

从数据库表结构反向生成 GORM Model（实体）文件。

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
  ```

### `maltose gen dao`

基于数据库表生成数据访问对象 (DAO) 层代码。

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

### `maltose gen service`

从 API 定义文件生成 Controller 和 Service 骨架代码。

- **用法**

  ```bash
  maltose gen service [flags]
  ```

- **功能**:

  - 扫描 `api` 目录下的 Go 文件，自动寻找成对的 `*Req` 和 `*Res` 结构体。
  - 根据找到的 API 定义，自动生成：
    - 对应的 Controller 文件及方法骨架（在 `internal/controller` 下）。
    - 对应的 Service 接口或结构体骨架文件（在 `internal/service` 下）。

- **Flags**:
  - `-s, --src`: API 定义文件的源路径。默认为 `api`。
  - `-d, --dst`: 生成文件的目标路径。默认为 `internal`。
  - `-m, --mode`: 生成模式，`interface` (默认) 或 `struct`。`interface` 模式会生成 Service 接口，是推荐的最佳实践。

### `maltose gen logic`

从 Service 接口文件生成 Logic (业务逻辑) 层的实现骨架。

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

### `maltose gen openapi`

根据 API 定义文件生成 OpenAPI v3 (Swagger) 规范文档。

- **用法**

  ```bash
  maltose gen openapi [flags]
  ```

- **功能**:

  - 解析 `api` 目录下的 Go 文件，特别是请求结构体中包含 `m.Meta` 元信息的定义。
  - 根据解析到的路由、方法、标签、摘要等信息，生成一个完整的 `openapi.yaml` 文件，可用于 API 文档展示和客户端生成。

- **前置条件**:

  - API 的请求结构体中已通过 struct tag 的方式定义了 OpenAPI 相关元信息。

- **Flags**:
  - `-s, --src`: API 定义文件的源路径。默认为 `api`。
  - `-o, --output`: 生成的 OpenAPI 文件的输出路径。默认为 `openapi.yaml`。
