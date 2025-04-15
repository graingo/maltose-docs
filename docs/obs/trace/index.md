# 链路追踪

`Maltose` 实现了标准化的分布式链路跟踪（`Distributed Tracing`）特性，基于 OpenTelemetry 规范，帮助开发者轻松实现全链路监控。

## 链路追踪文档

- [背景知识](./background.md)：了解 OpenTelemetry 和链路追踪的核心概念，包括 TracerProvider、Tracer、Span、Attributes、Events、SpanContext 和 Propagator 等组件。
- [准备工作](./prepare.md)：安装和配置 Jaeger，准备链路追踪环境，初始化 Tracer。
- [基本示例](./example.md)：在单进程中使用链路追踪的基本示例，创建 Root Span 和子 Span，记录属性和事件。
- [HTTP 示例](./http-example.md)：在 HTTP 服务中使用链路追踪的示例，实现跨服务的调用链追踪。
  - [HTTP 示例-Baggage](./http-example/baggage.md)：使用 Baggage 在服务间传递自定义上下文信息。
  - [HTTP 示例-数据操作](./http-example/data-operation.md)：在链路追踪中集成数据库和缓存操作，实现完整的端到端追踪。
- 最佳实践
  - [TraceID 注入和获取](./base-practive/inject-traceid.md)：链路追踪的最佳实践，包括 TraceID 注入和获取，以及与日志系统的集成。

## 核心特性

Maltose 框架的链路追踪功能具有以下核心特性：

1. **标准化实现**：基于 OpenTelemetry 规范，与行业标准保持一致。
2. **自动集成**：核心组件自动支持链路追踪，无需额外配置。
3. **简化 API**：提供简洁易用的 API，降低使用门槛。
4. **多种导出器**：支持多种后端系统，如 Jaeger、Zipkin 等。
5. **上下文传播**：自动在服务间传递链路信息。
6. **日志集成**：与日志系统无缝集成，自动关联 TraceID。

## 支持组件

Maltose 框架中以下组件已内置链路追踪支持：

| 自动支持链路跟踪特性的组件 | 组件名  | 描述                                                                        |
| -------------------------- | ------- | --------------------------------------------------------------------------- |
| HTTP Client                | mclient | HTTP 客户端自动启用了链路跟踪特性                                           |
| Http Server                | mhttp   | HTTP 服务端自动启用了链路跟踪特性                                           |
| Logging                    | mlog    | 日志内容中需要注入当前请求的 TraceID，以方便通过日志快速查找定位问题点      |
| ORM                        | mgorm   | 数据库的执行是很重要的链路环节，Orm 组件需要将自身的执行情况投递到链路中    |
| NoSQL Redis                | mredis  | Redis 的执行也是很重要的链路环节，Redis 需要将自身的执行情况投递到链路中    |
| Utils                      | mtrace  | 对于 Tracing 特性的管理需要做一定的封装，主要考虑的是可扩展性和易用性两方面 |
