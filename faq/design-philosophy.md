---
title: Maltose 组件设计哲学
---

# Maltose 组件设计哲学

Maltose 的组件设计不按“轻量/重量级”简单分类，而是分别回答三个问题：组件如何构造、配置从哪里来、生命周期由谁负责。

## 核心原则：能力与应用装配分离

组件包负责提供具体能力，例如：

- `mcfg` 读取和转换配置。
- `mlog` 输出结构化日志。
- `mdb`、`mredis` 连接外部数据服务。
- `mcache` 提供统一缓存接口和 Adapter。
- `mtrace`、`mmetric` 封装 OpenTelemetry 能力。

`frame/m` 则是应用使用的统一门面。它通过 `frame/mins` 将配置读取、具名实例和延迟初始化组合起来：

```go
server := m.Server()
config := m.Config()
logger := m.Log()
db := m.DB()
redis := m.Redis()
```

因此，更准确的描述是：

> 组件包提供能力，`m/mins` 负责应用装配；调用方可以选择使用配置驱动的共享实例，也可以直接使用底层构造函数。

## 三个设计维度

### 1. 构造方式

组件可能同时提供多种入口：

- `New(...)`：由调用方显式构造并持有。
- `Instance(name)`：获取组件包管理的具名实例。
- `m.Xxx(name)`：获取经过应用配置装配的具名实例。
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
- `m/mins` 返回的共享实例由应用统一持有；需要释放时应在 `m.App` 的 shutdown hook 中处理。
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
| `mtrace` / `mmetric` | Provider 初始化 | OpenTelemetry 全局 Provider | 无 | 进程级，显式 shutdown |

`mconv` 是独立项目，不属于 Maltose 仓库内的组件实例体系。

## 面向应用与面向库的选择

- 应用业务代码优先使用 `m` 门面，减少重复装配。
- 可复用库代码优先接收显式依赖，不要隐式读取应用全局实例。
- 单元测试优先注入最小接口，避免直接依赖 `m.DB()`、`m.Redis()`。
- 需要多个隔离实例时使用具名配置，或直接构造并自行管理生命周期。

这套设计追求的不是“所有组件使用完全相同的内部实现”，而是让应用入口一致，同时保留底层组件的独立可用性。
