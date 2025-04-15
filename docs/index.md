# 开发手册

## 目录结构

### Web 服务开发

#### HTTP 服务

- [服务器配置](/docs/components/mhttp/server) - 配置服务器参数和选项
- [路由管理](/docs/components/mhttp/router) - 路由注册与管理
- [请求处理](/docs/components/mhttp/request) - 请求参数获取与处理
- [响应处理](/docs/components/mhttp/response) - 响应数据格式化与返回
- [中间件](/docs/components/mhttp/middleware) - 常用中间件与自定义中间件
- [参数验证](/docs/components/mhttp/validation) - 请求参数验证
- [接口文档](/docs/components/mhttp/apidoc) - API 文档自动生成

#### HTTP 客户端

- [基本使用](/docs/components/mclient/basic) - 客户端基本使用方法
- [数据处理](/docs/components/mclient/data) - 请求与响应数据处理
- [配置管理](/docs/components/mclient/config) - 客户端配置项
- [中间件](/docs/components/mclient/middleware) - 客户端中间件
- [重试机制](/docs/components/mclient/retry) - 请求重试与错误处理

### 核心组件

_即将推出，敬请期待_

### 服务观测性

#### 链路追踪

- [基本介绍](/docs/obs/trace/index) - 链路追踪基本概念
- [背景知识](/docs/obs/trace/background) - 分布式追踪理论基础
- [准备工作](/docs/obs/trace/prepare) - 环境准备与配置
- [基本示例](/docs/obs/trace/example) - 链路追踪基础示例
- **HTTP 示例**
  - [Baggage 传递](/docs/obs/trace/http-example/baggage) - 上下文信息传递
  - [数据操作](/docs/obs/trace/http-example/data-operation) - 追踪数据操作
- **最佳实践**
  - [TraceID 注入和获取](/docs/obs/trace/best-practice/inject-traceid) - 日志与追踪结合

#### 指标监控

- [指标监控](/docs/obs/metric/index) - 系统与应用指标监控

### 框架设计

- [工程目录设计](/docs/design/project-structure) - 项目结构与目录规范
- [代码分层设计](/docs/design/code-layer) - 分层架构与职责划分
- [常见问题解答](/docs/design/faq) - 常见问题与解决方案
