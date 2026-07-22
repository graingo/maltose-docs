# 指南

本指南帮助你从第一次运行 Maltose，到理解项目分层、实例管理和应用生命周期。若只想查询某个 API，请直接进入[组件手册](../components/)。

## 推荐阅读顺序

1. [快速上手](./getting-started)：安装 CLI、创建项目并完成第一个接口。
2. [项目结构](./directory-structure)：理解 API、Controller、Logic、Service 和 DAO 的边界。
3. [核心概念](./core-concepts)：掌握代码生成、依赖组织和应用生命周期。
4. [全局对象](./global-instances)：理解 `m.Server()`、`m.Config()`、`m.DB()` 等统一入口。

## 你将获得什么

完成本章后，你应该能够：

- 创建并运行一个 Maltose 项目。
- 判断代码应该放在哪一层。
- 选择配置驱动的共享实例或显式构造的独立实例。
- 使用 `m.App` 管理服务启动和优雅关闭。
- 知道何时使用 CLI 生成代码，何时手动实现业务逻辑。

:::tip 遇到问题？
生成项目无法编译、配置没有生效或请求触发 `implement me` 时，先查看[常见问题](../faq/)。
:::
