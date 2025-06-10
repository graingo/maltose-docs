# 项目结构

一个良好、一致的项目结构是软件工程的最佳实践之一。Maltose 通过 `maltose new` 命令为用户提供了一套经过精心设计的、推荐的项目结构，旨在实现关注点分离，提高项目的可维护性和可扩展性。

当您执行 `maltose new <project-name>` 后，会得到如下的目录结构：

```
.
├── api
│   └── hello
│       └── v1
│           └── hello.go
├── cmd
│   └── main.go
├── config
│   └── config.yaml
├── internal
│   ├── controller
│   │   └── hello
│   │       └── hello.go
│   ├── dao
│   ├── logic
│   │   └── hello
│   │       └── hello.go
│   ├── model
│   └── service
│       └── hello.go
├── route
│   └── route.go
├── utility
│   └── ...
├── go.mod
└── go.sum
```

以下是各主要目录和文件的职责说明：

### `/api`

存放 API 的定义文件（`.go` 格式）。这里的"定义"主要指请求和响应的 `struct`。Maltose 的代码生成工具会扫描此目录，以生成 Controller 和 Service 层的代码。

- **层级结构**: 推荐使用 `api/{模块}/{版本}` 的方式来组织，例如 `api/user/v1/user.go`。

### `/cmd`

项目的启动入口。`main.go` 文件位于此，负责初始化和启动整个应用。

### `/config`

存放应用的配置文件，例如 `config.yaml`。Maltose 的配置组件会默认从此目录加载配置。

### `/internal`

存放项目内部的业务逻辑代码，这是项目的主要工作区。Go 语言的机制确保了 `internal` 包下的代码只能被项目内部引用，无法被外部项目导入。

- **/controller**: 控制器层。负责接收和解析来自路由的请求，进行参数校验，然后调用 `Logic` 层处理业务，最后向客户端返回响应。
- **/dao**: 数据访问对象 (DAO) 层。封装了对数据库的底层操作，直接与数据库交互。此目录下的代码通常由 `maltose gen dao` 生成。
- **/logic**: 业务逻辑层。这是实现具体业务功能的核心，它会组织和编排 `Service` 层提供的能力来完成一个完整的业务流程。
- **/model**: 数据模型层。
  - **/entity**: 存放与数据库表结构一一对应的 `struct`（实体），通常由 `maltose gen model` 生成。
  - **/do**: 存放用于数据传输和处理的 `struct`，在某些复杂场景下，可用于隔离 `entity`。
- **/service**: 服务接口层。定义了业务逻辑所需的接口。`Logic` 层依赖于这些接口，而不是具体的实现，以此实现解耦。

### `/route`

路由注册目录。您将在这里定义应用的 HTTP 路由规则，并将它们与 `Controller` 中的具体方法绑定。

### `/utility`

存放项目范围内的通用工具函数或模块，例如统一的日志记录器、错误码定义等。

通过遵循这套项目结构，您可以更轻松地管理代码，并与团队成员高效协作。
