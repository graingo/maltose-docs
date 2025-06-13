# 核心概念

理解 Maltose 框架背后的核心设计理念，将帮助您更高效、更优雅地使用它来构建您的应用。

## 1. 约定优于配置 (Convention over Configuration)

Maltose 的核心哲学之一。我们相信，为开发者提供一套合理、通用的默认约定，可以极大地减少决策疲劳和不必要的配置工作。

- **项目结构**: `maltose new` 创建的项目包含了一套推荐的目录结构，例如 `api`, `internal/controller`, `internal/logic`, `internal/service`, `internal/dao` 等。这套结构旨在实现关注点分离和高内聚、低耦合。
- **命名约定**: 框架的生成工具依赖于特定的命名约定来工作。例如，`gen service` 会寻找以 `*Req` 和 `*Res` 结尾的结构体来识别 API 定义；`gen logic` 会寻找以 `I` 开头的接口（如 `IUser`）来生成业务逻辑。

遵循这些约定，您就能最大限度地利用 Maltose 的自动化工具。

## 2. 分层架构

Maltose 提倡清晰的代码分层，以保证项目的可维护性和可扩展性。一个典型的请求处理流程如下：

1.  **路由 (Route)**: 定义 HTTP 路由，并将请求转发给对应的 Controller 方法。
2.  **Controller 层**: 作为 API 的入口，负责解析和校验请求参数，并调用 Logic 层处理业务。它不应包含任何业务逻辑，只做参数的传递和转换。
3.  **Logic 层**: 这是业务逻辑的核心实现层。它负责处理具体的业务需求，并调用 Service 层获取或操作数据。
4.  **Service 层**: 作为一个"承上启下"的层，它定义了业务逻辑所需的核心能力接口。Logic 层依赖于 Service 层的接口，而不是具体实现。这使得业务逻辑可以独立于底层数据源进行测试和重用。
5.  **DAO (Data Access Object) 层**: 数据库操作层，封装了对数据库的增删改查等原子操作。

这种分层设计使得每一层职责单一，易于测试、维护和替换。

## 3. 依赖注入 (Dependency Injection)

虽然 Maltose 本身没有强制要求使用复杂的依赖注入容器，但其分层架构天然地为依赖注入提供了支持。

在 Maltose 的设计中，`Logic` 层通过 `Service` 层的接口与底层能力解耦。`Service` 接口的实现（通常在 `Logic` 层的 `init` 方法中注册）可以在启动时被"注入"，从而实现了控制反转 (IoC)。

```go
// internal/logic/user/user.go
func init() {
    // 将 sUser 的实例注册为 IUser 接口的实现
    service.RegisterUser(New())
}

// 在其他地方使用
func someFunc() {
    // 获取已注册的 IUser 接口实现，无需关心其具体类型
    s := service.User()
    s.GetUserProfile(ctx, req)
}
```

这种模式简化了依赖管理，并极大地提高了代码的可测试性。

## 4. 基于代码生成 (Code Generation)

Maltose 认为，开发者应当专注于创造性的业务逻辑，而不是编写重复的、易出错的模板代码。因此，`maltose` 命令行工具提供了强大的代码生成能力：

- `gen model`: 从数据库生成模型。
- `gen dao`: 从模型生成数据访问层。
- `gen service`: 从 API 定义生成 Controller 和 Service 骨架。
- `gen logic`: 从 Service 接口生成业务逻辑骨架。

这些工具不仅能提高开发效率，还能确保项目中的模板代码遵循统一的规范和最佳实践。
