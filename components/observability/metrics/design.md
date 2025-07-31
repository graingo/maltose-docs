# `mmetric` 设计思路

`mmetric` 包为 Maltose 框架提供了一个健壮、解耦且可扩展的指标（Metrics）系统。它的设计核心是**故意的抽象层**，也称为**门面模式（Facade Pattern）**或**适配器模式（Adapter Pattern）**。这种设计虽然初看比 `mtrace` 复杂，但它为框架的长期稳定性和可维护性提供了坚实的保障。

## 核心设计：为什么是“厚抽象”？

指标系统的本质是**数据的聚合与导出**，其面临的生态环境具有高度的**多样性和易变性**。我们的设计目标是通过一个稳定的内部接口来**隔离**这种复杂性。

1.  **解耦（Decoupling）**: 框架的核心模块（如 `mhttp`, `mclient`）只依赖于 `mmetric.Provider`, `mmetric.Meter` 等**稳定接口**，而完全不知道底层的具体实现。这使得我们可以随时替换或升级指标后端（如从 OpenTelemetry 切换到另一个库），而无需改动框架的任何业务代码。

2.  **API 稳定性与简化（API Stability & Simplification）**: `mmetric` 提供了一套统一且简洁的 API（如 `MetricOption` 结构体），相比 OpenTelemetry 原生的函数式选项（`metric.With...`），在配置项较多时更具可读性和声明性。这为开发者提供了一个更易于使用的门面。

3.  **框架一致性（Consistency）**: `mmetric` 与 `mlog`, `mcfg` 等其他 `maltose` 核心组件遵循相同的设计哲学，为用户提供了一致的开发体验。

## 与 `mtrace` 的设计对比

`mtrace` 被设计成一个轻量级的“工具箱”，因为它所解决的追踪问题的本质是**上下文传递**，这个模式已经由 Go 的 `context.Context` 和 OpenTelemetry 的 API 很好地标准化了，无需过度封装。

而 `mmetric` 需要面对一个更多样化的后端世界（Prometheus, Datadog, InfluxDB 等），这些后端的客户端库和数据模型各不相同。因此，一个“厚抽象”层是应对这种多样性的最佳策略。

## 业界最佳实践佐证

这种“厚抽象”的设计模式在业界顶级框架中是公认的最佳实践，尤其是在指标领域。

- **Java - Spring Boot & Micrometer**: Micrometer 是 Java 世界指标的事实标准，它本身就是一个完美的门面模式案例。Spring Boot 通过集成 Micrometer，允许开发者使用一套统一的 API，然后通过更换依赖（适配器）将指标无缝对接到 Prometheus, Datadog, Atlas 等数十种监控系统。**`mmetric` 的设计思想与 Micrometer 完全一致。**

- **Go - Go-kit / Kratos**: 这些知名的 Go 微服务框架都定义了自己的 `metrics` 接口（如 `metrics.Counter`, `metrics.Histogram`），然后提供了对 Prometheus 等后端的具体实现作为适配器。

- **Python - Django**: 社区广泛使用的 `django-prometheus` 库扮演了适配器的角色，它将 Django 内部的状态和事件“翻译”成 Prometheus 的指标格式，而不是让用户直接在业务代码中调用 Prometheus 的客户端库。
