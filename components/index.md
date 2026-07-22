# 组件手册

本章按职责介绍 Maltose 的公共组件。应用代码通常通过 `frame/m` 获取配置驱动的共享实例；库代码和测试可以直接使用组件构造函数。

## 请求与通信

| 组件 | 解决的问题 | 从这里开始 |
| --- | --- | --- |
| `mhttp` | HTTP Server、路由、参数绑定和中间件 | [Web Server](./server/) |
| `mclient` | HTTP Client、中间件、限流和重试 | [HTTP 客户端](./http-client) |

Web 相关主题：

- [路由与 Controller 绑定](./server/routing)
- [中间件](./server/middleware)
- [标准响应与 HTTP 状态码](./server/standard-response)

## 配置与基础设施

| 组件 | 解决的问题 | 实例策略 |
| --- | --- | --- |
| [`mcfg`](./configuration) | 文件、远程 Adapter、结构体映射和加载 Hook | `m.Config()` 或独立 Config |
| [`mlog`](./logging) | 结构化日志、文件轮转、上下文和链路字段 | `m.Log()` 或独立 Logger |
| [`mdb`](./database/mdb) | GORM、连接池、事务、读写分离和慢 SQL | `m.DB()` 或独立 DB |
| [`mredis`](./database/mredis) | Redis 命令、具名实例、日志与 Trace | `m.Redis()` 或独立 Redis |
| [`mcache`](./cache) | 内存/Redis 缓存、过期和防击穿 | 包级默认缓存或独立 Cache |
| [`msync`](./concurrency) | SingleFlight、同键串行、并发限制和对象池 | 进程内独立工具 |

## 可观测性

Maltose 基于 OpenTelemetry 提供 Trace 和 Metric 封装。配置文件只保存参数；Exporter 仍需在应用启动时显式初始化。

- [可观测性背景](./observability/background)
- [链路追踪 `mtrace`](./observability/tracing/)
- [TraceID 注入与获取](./observability/tracing/best-practice/inject-traceid)
- [指标监控 `mmetric`](./observability/metrics/)

## 如何选择入口

- 构建业务应用：优先使用 `m.Server()`、`m.Config()`、`m.Log()`、`m.DB()`、`m.Redis()`。
- 编写可复用库：优先显式接收依赖或配置，避免隐式读取应用全局实例。
- 编写单元测试：为业务依赖定义最小接口并注入 mock。
- 管理缓存：直接使用 `mcache`，框架没有在 `m` 门面中规定全局 Cache 实例。

组件装配方式的完整解释见[设计哲学](../faq/design-philosophy)。
