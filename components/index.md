# 手册

Maltose 框架提供了一系列设计精良、开箱即用的内置组件，以帮助您快速构建稳定、可观测、易于维护的企业级应用。这些组件涵盖了从 Web 服务、配置管理到数据库操作和可观测性的方方面面。

本章节将详细介绍每个核心组件的功能和使用方法。

## 核心组件

- **Web**:
  - [**服务器 (mhttp)**](./server/): 基于 Gin 封装的高性能 HTTP 服务器，提供了更简洁的路由定义、中间件和请求处理机制。
  - [**路由 (Routing)**](./server/routing.md): 强大而灵活的路由系统，支持路由分组、中间件和便捷的控制器绑定。
  - [**中间件 (Middleware)**](./server/middleware.md): 在请求处理链中插入自定义逻辑，用于处理横切关注点。
- [**配置管理 (mcfg)**](./configuration.md): 支持多种数据源的统一配置解决方案，采用适配器模式，易于扩展。
- [**日志 (mlog)**](./logging.md): 基于 Logrus 的结构化日志组件，支持日志分级、文件归档、TraceID 自动注入等功能。
- **数据库**:
  - [**关系型数据库 (mdb)**](./database/mdb.md): 基于 GORM 的数据库 ORM 组件，简化了数据库操作，并内置了连接池、读写分离和慢查询日志等功能。
  - [**Redis (mredis)**](./database/mredis.md): 配置驱动的 Redis 客户端，集成链路追踪和日志。
- [**缓存 (mcache)**](./cache.md): 支持多种缓存介质（内存、Redis）的通用缓存组件，采用适配器模式，易于扩展。

## 可观测性

- [**背景知识**](./observability/background.md): 了解分布式追踪、指标和日志的核心概念。
- [**链路追踪 (mtrace)**](./observability/tracing/): 集成了 OpenTelemetry 的分布式链路追踪方案，可以轻松地追踪请求在分布式系统中的完整路径。
- [**指标监控 (mmetric)**](./observability/metrics/): 提供了标准的指标采集接口（Counter, Gauge, Histogram），可以与 Prometheus、OTLP 等多种监控系统集成。

通过学习这些组件，您将能够更深入地理解 Maltose 的设计哲学，并更高效地利用框架构建您的应用。
