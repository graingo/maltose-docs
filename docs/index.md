# 开发手册

## 目录结构

### 指南

- [快速开始](/docs/guide/quick-start) - 快速上手指南
- [安装说明](/docs/guide/installation) - 详细安装步骤
- [架构概览](/docs/guide/architecture) - 框架整体架构

### 核心组件

#### 配置管理

- [基本介绍](/docs/core/mcfg/index) - 配置模块概述
- [配置加载](/docs/core/mcfg/loading) - 配置文件加载方式
- [配置获取](/docs/core/mcfg/getting) - 获取配置项值
- [配置热更新](/docs/core/mcfg/hot-reload) - 动态更新配置
- [适配器](/docs/core/mcfg/adapters) - 自定义配置源

#### 日志系统

- [基本介绍](/docs/core/mlog/index) - 日志模块概述
- [日志级别](/docs/core/mlog/levels) - 不同日志级别使用
- [日志格式](/docs/core/mlog/formats) - 自定义日志格式
- [多输出目标](/docs/core/mlog/outputs) - 日志输出到多个目标
- [上下文集成](/docs/core/mlog/context) - 上下文信息与日志集成

#### 实例管理

- [基本介绍](/docs/core/minstance/index) - 实例管理模块概述
- [单例管理](/docs/core/minstance/singleton) - 单例模式的使用
- [命名实例](/docs/core/minstance/named) - 命名实例的使用

### 数据库

#### 数据库操作

- [基本介绍](/docs/database/mdb/index) - 数据库模块概述
- [连接配置](/docs/database/mdb/config) - 数据库连接配置
- [基本操作](/docs/database/mdb/basic) - 基本 CRUD 操作
- [事务管理](/docs/database/mdb/transaction) - 事务处理
- [查询构建](/docs/database/mdb/query) - 复杂查询构建
- [钩子与回调](/docs/database/mdb/hooks) - 钩子和回调机制
- [日志与追踪](/docs/database/mdb/logging) - 数据库操作日志和追踪

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
- [基础指标](/docs/obs/metric/basic) - 基础系统指标
- [自定义指标](/docs/obs/metric/custom) - 自定义应用指标
- [仪表盘](/docs/obs/metric/dashboard) - 指标可视化与仪表盘

### 框架设计

- [工程目录设计](/docs/design/project-structure) - 项目结构与目录规范
- [代码分层设计](/docs/design/code-layer) - 分层架构与职责划分
- [常见问题解答](/docs/design/faq) - 常见问题与解决方案
