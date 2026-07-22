# Maltose 官方文档

这是 Maltose 框架的官方文档源码。Maltose 是一个基于 Gin 打造的轻量级企业级 Go 开发框架。

## 本地运行文档

1. 安装依赖

```bash
npm ci
```

2. 启动开发服务器

```bash
npm run docs:dev
```

3. 构建静态网站

```bash
npm run docs:build
```

## 文档结构

- `.vitepress/`: VitePress 配置
- `public/`: 静态资源
- `guide/`: 入门与核心概念
- `components/`: 组件手册
- `advanced/`: 测试、错误处理、部署等进阶主题
- `cli/`: CLI 总览与命令参考
- `faq/`: 高频排错与设计说明

文档的信息架构、事实来源和示例规范见 [DESIGN.md](./DESIGN.md)。

## 贡献指南

欢迎提交 PR 来完善文档。提交前至少运行：

```bash
npm run docs:build
```

示例应以当前 `maltose`、`mconv` 和 quickstart 实现为准；不要记录尚未公开的规划 API。

## 开源许可

MIT 许可证
