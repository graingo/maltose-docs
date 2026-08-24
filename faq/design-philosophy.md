---
title: Maltose 设计哲学与适用边界
---

# Maltose 设计哲学与适用边界

Maltose 的组件设计不按“轻量/重量级”简单分类，而是分别回答三个问题：组件如何构造、配置从哪里来、生命周期由谁负责。

## 核心原则：能力与应用装配分离

组件包负责提供具体能力，例如：

- `mcfg` 读取和转换配置。
- `mlog` 输出结构化日志。
- `mdb`、`mredis` 连接外部数据服务。
- `mcache` 提供统一缓存接口和 Adapter。
- `mtrace`、`mmetric` 封装 OpenTelemetry 能力，`contrib/observability` 负责统一装配和生命周期管理。

`frame/m` 则是应用使用的统一门面。它通过 `frame/mins` 将配置读取、具名实例和延迟初始化组合起来：

```go
server := m.Server()
config := m.Config()
logger := m.Log()
db := m.DB()
redis := m.Redis()
```

这些包级入口来自进程默认 Scope。需要隔离应用或测试状态时，可以显式创建 Scope，而不改变底层组件 API：

```go
scope := m.NewScope(config)
server := scope.Server()
db := scope.DB()
```

因此，更准确的描述是：

> 组件包提供能力，`m/mins` 负责应用装配；调用方可以选择使用配置驱动的共享实例，也可以直接使用底层构造函数。

## 三个设计维度

### 1. 构造方式

组件可能同时提供多种入口：

- `New(...)`：由调用方显式构造并持有。
- `Instance(name)`：获取组件包管理的具名实例。
- `m.Xxx(name)`：从默认 Scope 获取经过应用配置装配的具名实例。
- `scope.Xxx(name)`：从显式 Scope 获取隔离的具名实例。
- 包级默认函数：适合简单场景，例如 `mcache.Set(...)`。

这些入口不是互斥的“组件身份”，而是服务不同使用场景。

### 2. 配置来源

调用方可以直接把 `Config` 传给 `New`，也可以让 `m/mins` 从 `mcfg` 读取配置后创建实例。

```go
// 显式构造：依赖清晰，适合库代码和测试。
db, err := mdb.New(&mdb.Config{Type: "mysql", DSN: dsn})

// 应用装配：配置和具名实例由框架管理。
db = m.DB("report")
```

`m/mins` 的价值不是隐藏所有依赖，而是为应用入口提供一致的配置驱动体验。

### 3. 生命周期归属

- 调用方通过 `New` 创建的资源，由调用方负责关闭。
- 默认 Scope 或显式 Scope 返回的实例由应用统一持有；实现 `io.Closer` 的资源可通过 `m.WithCloser` 纳入退出流程，需要 `context.Context` 的资源使用 shutdown hook。
- OpenTelemetry Provider 属于进程级全局状态，需要显式初始化并在退出时 shutdown。

## 为什么 `mcfg` 特殊？

数据库、Redis、日志等应用组件都可能依赖配置，因此配置解析本身不能反过来依赖这些消费者。`mcfg` 必须具备独立创建实例的能力：

```text
m.Config()
  → mins.Config()
    → mcfg.Instance()
```

这里的关键不是“配置必须最先完成初始化”，而是：

> 配置必须能独立、按需初始化，形成应用装配的启动基点。

`mcfg` 仍然支持 Adapter 和 Hook，配置内容可以来自本地文件、远程配置中心或应用自定义逻辑。

## 为什么 `mcache` 不在 `m` 门面中？

`mcache` 同时支持包级默认缓存、独立实例和自定义 Adapter：

```go
mcache.Set(ctx, "key", value, time.Minute)

local := mcache.New(1000)
redisCache := mcache.NewWithAdapter(redisAdapter)
```

框架没有规定唯一的 `cache.*` 配置节点和应用级 Cache 单例，因此没有把它放入 `m/mins`。这保留了缓存介质和隔离策略的选择权。

这不意味着 `mcache` 永远轻量：使用 Redis Adapter 时，它同样依赖外部资源和配置。

## 组件策略对照

| 组件 | 显式构造 | 包内实例 | `m` 门面 | 主要生命周期 |
| --- | --- | --- | --- | --- |
| `mcfg` | `New` / `NewWithAdapter` | `Instance` | `m.Config` | 应用级或调用方持有 |
| `mlog` | `New` | `Instance` | `m.Log` | 应用级或调用方持有 |
| `mdb` | `New` | `Instance` | `m.DB` | 外部连接资源 |
| `mredis` | `New` | `Instance` | `m.Redis` | 外部连接资源 |
| `mhttp` | `New` | 由 `mins` 管理 | `m.Server` | `m.App` 管理 |
| `mcache` | `New` / `NewWithAdapter` | 包级默认缓存 | 无 | 调用方决定 |
| `mtrace` / `mmetric` | Provider 初始化 | OpenTelemetry 全局 Provider | `observability` 统一装配 | 进程级，显式 shutdown |

`mconv` 是独立项目，不属于 Maltose 仓库内的组件实例体系。

## 面向应用与面向库的选择

- 应用业务代码优先使用 `m` 门面，减少重复装配。
- 可复用库代码优先接收显式依赖，不要隐式读取应用全局实例。
- 单元测试优先注入最小接口，避免直接依赖 `m.DB()`、`m.Redis()`。
- 同一应用内的多个用途优先使用具名实例；多应用或测试边界使用 `m.NewScope(config)`；底层库仍可直接构造并自行管理生命周期。

这套设计追求的不是“所有组件使用完全相同的内部实现”，而是让应用入口一致，同时保留底层组件的独立可用性。

## Maltose 解决什么问题？

Maltose 面向需要稳定工程约定的 Go HTTP 应用，重点解决：

- 统一项目分层、代码生成和组件入口；
- 以同一种配置方式装配 HTTP、日志、数据库和 Redis；
- 为错误响应、Trace、Metric 和优雅关闭提供一致基线；
- 允许业务应用使用便捷门面，同时保留底层组件独立构造能力。

它追求的是“常用路径短、边界行为清楚”，而不是把所有基础设施封装成不可替换的黑盒。

## 适用场景

| 场景 | 适配度 | 说明 |
| --- | --- | --- |
| REST API、内部服务、管理后台 API | 高 | HTTP、配置、数据访问和可观测性可以直接组合 |
| 中小型单体或按业务拆分的服务 | 高 | 默认 Scope 和约定目录能减少装配样板 |
| 多数据源、多 Redis、独立日志用途 | 高 | 使用具名实例 |
| 同进程多应用或隔离测试 | 中高 | 使用显式 Scope，并处理进程级全局状态 |
| 纯库项目 | 中 | 直接使用底层组件，避免依赖 `m` 门面 |
| 非 HTTP 长连接、流处理、复杂调度平台 | 中 | 可以实现 `AppServer`，核心协议能力需要自行选择 |

## 不试图解决什么？

Maltose 不提供完整业务平台，也不替应用做以下决策：

- 用户、权限、订单等业务领域模型；
- 唯一的依赖注入容器或强制接口生成体系；
- 自动重建所有组件的动态配置系统；
- 消息队列、任务调度、服务治理的唯一实现；
- 跨进程故障隔离、扩缩容和部署编排。

这些能力可以与 Maltose 组合，但应由应用根据业务规模和运行环境选择。

## 什么时候不应使用默认门面？

出现以下情况时，直接构造组件或注入窄接口通常更清晰：

- 编写会被其他框架复用的库；
- 测试需要精确替换某个依赖；
- 一个进程内存在多个配置和实例边界；
- 资源生命周期不属于主应用；
- 需要避免 `mcfg` Hook、OpenTelemetry Provider 等进程级状态。

默认门面是应用装配的便捷入口，不是所有代码都必须遵守的依赖方向。

## 兼容性原则

Maltose 仍处于 `v0` 阶段，但次版本升级不以制造破坏性变更为目标。框架会优先保持有效用法的兼容性，并通过 API 兼容性检查保护公开接口。

让非法参数更早失败、修正原本不会生效的配置或加强安全校验，可能暴露旧代码中的问题。这类调整应在版本页写清行为变化；只有用户必须修改正常用法时，才提供迁移步骤。
