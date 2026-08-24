# 进阶

进阶章节面向已经能运行 Maltose 项目的开发者，重点处理生产化、边界行为和工程质量。

## 按目标选择

| 目标 | 文档 | 建议前置阅读 |
| --- | --- | --- |
| 隔离测试或同进程多应用实例 | [Scope 与实例隔离](./scopes) | [全局对象](../guide/global-instances) |
| 建立一份可落地的配置基线 | [完整配置参考](./full-configuration) | [配置管理](../components/configuration) |
| 统一业务错误与 HTTP 状态码 | [错误处理](./error-handling) | [标准响应](../components/server/standard-response) |
| 编写单元、接口和集成测试 | [测试指南](./testing) | [项目结构](../guide/directory-structure) |
| 构建镜像并部署到 Kubernetes | [部署指南](./deployment) | [完整配置参考](./full-configuration) |
| 维护 CI 和多模块发布流程 | [CI 与多模块发布](./release-engineering) | [测试指南](./testing) |
| 在 Goroutine、MQ 间传播 Trace | [跨边界链路追踪](./messaging-tracing) | [链路追踪](../components/observability/tracing/) |

## 推荐落地顺序

1. 先统一错误码和响应契约。
2. 为核心 Logic 添加单元测试，为数据库/Redis 添加集成测试。
3. 明确配置注入方式、Scope 边界和敏感信息管理。
4. 初始化可观测性 Provider，并验证 shutdown 能刷新 Trace 与 Metric。
5. 最后完成容器化、健康检查和发布策略；维护框架本身时再阅读多模块发布流程。

:::warning 配置不等于初始化
`observability` 节点不会自动执行。应用需要调用 `observability.FromConfig`；需要独立控制时，也可以分别调用 `otlptrace.Init`、`otlpmetric.Init`。
:::
