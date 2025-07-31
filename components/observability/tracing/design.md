# `mtrace` 设计思路

`mtrace` 包为 Maltose 框架提供了一套轻量级、非侵入式且易于使用的分布式追踪工具集。它的设计核心是**薄封装（Thin Wrapper）**，旨在**增强而非取代** OpenTelemetry 的原生追踪体验。

## 核心设计：为什么是“薄工具箱”？

与 `mmetric` 的“厚抽象”不同，`mtrace` 的设计非常轻量，这源于追踪（Tracing）问题的本质：

1.  **统一的关注点**：追踪的核心任务是在分布式系统中**传递上下文（`context.Context`）**。这是一个非常明确且统一的目标。

2.  **稳定的 API**: Go 语言的 `context.Context` 是一个高度稳定且被社区广泛接受的标准。OpenTelemetry 的追踪 API 深度集成并构建于其上，其核心操作（如启动/结束 Span、注入/提取上下文）已经非常成熟和标准化。

3.  **无缝集成的需求**: 追踪代码需要无缝地集成到现有的业务逻辑和控制流中。过度封装反而会增加心智负担，破坏原生 OTel API 的灵活性。

基于以上原因，我们认为没有必要创建一个厚重的抽象层来隐藏 OpenTelemetry。相反，`mtrace` 专注于提供一系列**辅助函数和便利工具**，以简化最常见的追踪操作，从而提高开发效率。

## `mtrace` 提供了什么？

- **直接的 OTel 交互**: `mtrace` 包直接暴露了 OpenTelemetry 的原生类型，如 `trace.TracerProvider`。`GetProvider`, `SetProvider` 和 `NewProvider` 函数是对 OTel 全局 API 和 SDK 的直接映射，保持了与 OTel 生态的完全兼容。

- **简化的核心操作**:

  - `NewSpan(ctx, ...)`: **这是最常用的辅助函数之一**。一行代码即可从上下文中启动一个正确关联的子 Span，无需关心 `Tracer` 的创建。
  - `GetTraceID(ctx)`: 无需繁琐的类型转换和检查，一行代码即可从上下文中安全地获取 Trace ID，非常适合用于日志关联。
  - `WithTraceID(ctx, id)`: 方便地将一个自定义的字符串 ID 注入到追踪上下文中，非常适合与外部系统的请求 ID 进行关联。

- **易用的 Baggage API**:
  - `NewBaggage(ctx)`: 围绕 OpenTelemetry 的 `baggage` API 提供了一个更易于使用的链式调用接口。
  - `SetBaggageValue`, `GetBaggageVar`: 简化了对跨服务传递的业务数据（如用户 ID、租户 ID）的读写操作。

## 与 `mmetric` 的设计对比

`mmetric` 采用“厚抽象”是为了隔离多样化且易变的指标后端生态。而 `mtrace` 采用“薄封装”是因为追踪的 API 和模式已经足够稳定和统一，我们更应该拥抱它，而不是隐藏它。

## 业界最佳实践佐证

这种为 OpenTelemetry 提供轻量级工具集或中间件的模式是业界的主流做法。

- **gRPC-go**: 官方提供的 `otelgrpc` 库就是一个完美的例子。它通过 **拦截器（Interceptor）** 的方式将追踪逻辑非侵入式地织入到 RPC 调用中，用户几乎无感知。

- **Gin / Echo**: 社区为这些流行的 Web 框架提供了 `otelgin`, `otelecho` 等中间件。这些库的核心就是薄封装，它们处理 HTTP 请求的生命周期，自动创建 Span，并将追踪上下文注入到 `request.Context()` 中。
