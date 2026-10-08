# 命令参考

本页介绍 `maltose` 的公开命令、输入来源和生成边界。推荐工作流见 [CLI 总览](./)。

## 快速参考

| 命令 | 主要输入 | 默认输出 | 是否连接数据库 |
| --- | --- | --- | --- |
| `maltose new` | Git 模板 | `[project-name]/` | 否 |
| `maltose gen model` | `.env` | `internal/model` | 是 |
| `maltose gen dao` | `.env` | `internal/dao` | 是 |
| `maltose gen service` | `api/` | `internal/controller`、`internal/service` | 否 |
| `maltose gen logic` | `internal/service` | `internal/logic` | 否 |
| `maltose gen openapi` | `api/` 中的 `m.Meta` | `openapi.yaml` | 否 |

:::warning 生成前检查差异
生成器会创建或更新代码。执行前先提交或暂存现有改动，执行后运行 `gofmt`、测试并审查 diff。
:::

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
  - 自动更新 `go.mod` 以及引用模板 module 的 Go import path。
  - 自动执行 `go mod tidy`，确认依赖可以正常解析。
  - 默认 module path 为 `[project-name]`，也可用 `--module` 显式指定。

- **参数**:

  - `[project-name]` (必需): 您要创建的新项目的名称。

- **Flags**:

  - `--module`: 指定生成项目的 Go module path，例如 `github.com/acme/my-app`。
  - `--repo-url`: 使用自定义 Git 模板仓库地址；默认克隆官方 quickstart。

- **示例**:

  ```bash
  # 在当前目录下创建一个名为 my-app 的新项目
  maltose new my-app

  # 推荐为可发布项目显式设置 module path
  maltose new my-app --module github.com/acme/my-app
  cd my-app
  go run .
  ```

- **后续步骤**: 官方模板包含可以直接请求的示例接口。启动成功后，可参考[快速上手](../guide/getting-started.md)继续定义自己的 API。

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

  :::warning 配置源说明
  请注意，`gen model` 命令**仅**从 `.env` 文件读取数据库配置。这与应用**运行时**从 `config.yaml` 读取配置不同。请务必保持这两个文件中数据库连接信息的一致性。
  :::

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

  :::warning 配置源说明
  与 `gen model` 类似，`gen dao` 命令也**仅**从 `.env` 文件读取数据库配置。请确保其与运行时使用的 `config.yaml` 配置保持同步。
  :::

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

  - `-n, --name`: 指定要生成的服务名称(如 `user`)。使用此参数时，会直接创建一个单独的 Service 接口文件，而不是扫描 API 定义。这在您想快速创建服务骨架时非常有用。
  - `-s, --src`: API 定义文件的源路径。默认为 `api`。当使用 `-n, --name` 参数时，此选项将被忽略。
  - `-d, --dst`: 生成文件的目标路径。默认为 `internal`。
  - `-m, --mode`: 生成模式，`interface` (默认) 或 `struct`。`interface` 模式会生成 Service 接口，是推荐的最佳实践。当使用 `-n, --name` 参数时，此选项将被忽略。

- **示例**:

  ```bash
  # 直接创建名为 user 的 Service 接口文件
  maltose gen service -n user

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

从成对 `*Req/*Res` 生成文档和契约清单。CLI 使用 `go list` 发现当前 build tags 下的 API 包，编译临时导出程序，调用应用所依赖的 Maltose 契约编译器。API 包必须可编译；其 `init` 会执行，因此应保持无副作用。

```bash
maltose gen openapi -s api -o cmd/openapi.yaml --openapi-version 3.1.0
maltose gen openapi -s api -o cmd/openapi.yaml --check
```

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `-s, --src` | `api` | API 包目录 |
| `-o, --output` | `openapi.yaml` | 文档路径；清单为该路径加 `.manifest.json` |
| `-f, --format` | 从后缀推断 | yaml 或 json |
| `--openapi-version` | `3.1.0` | 3.0.0 或 3.1.0 |
| `--extensions` | 空 | 导出 `Configure(*contract.Extensions) error` 的 Go 包路径 |
| `--check` | false | 重新生成并比较两个文件；差异时退出非零，保留磁盘内容 |

```go
type GetUserReq struct {
    m.Meta `method:"GET" group:"/api/v1" path:"/users/:id" operation_id:"getUser"`
    ID string `path:"id" binding:"uuid"`
}
type GetUserRes struct {
    ID string `json:"id"`
}
```

`group` 与实际注册的 RouterGroup 完整前缀一致。支持 GET、POST、PUT、PATCH、DELETE、HEAD。参数来源显式区分 path、query、header、form、json；状态、包装、必填和 nullable 规则见 [API 契约](/components/server/api-metadata)。

导出过程中发现错误时保持原有产物。组件身份由完整 Go 类型身份及请求/响应方向确定，同名跨包类型独立，重复生成字节稳定。
