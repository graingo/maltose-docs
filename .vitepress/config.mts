import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Maltose",
  description: "基于Gin打造的轻量级企业级Go开发框架",
  lang: "zh-CN",
  base: "/maltose-docs/",
  head: [["link", { rel: "icon", href: "/maltose-docs/favicon.ico" }]],
  ignoreDeadLinks: true,
  cleanUrls: true,
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "指南", link: "/guide/" },
      { text: "手册", link: "/components/" },
      { text: "进阶", link: "/advanced/" },
      { text: "CLI", link: "/cli/" },
      { text: "FAQ", link: "/faq/" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "指南",
          items: [
            { text: "简介", link: "/guide/" },
            { text: "快速开始", link: "/guide/getting-started" },
            { text: "核心概念", link: "/guide/core-concepts" },
            { text: "全局对象", link: "/guide/global-instances" },
            { text: "目录结构", link: "/guide/directory-structure" },
          ],
        },
      ],
      "/components/": [
        {
          text: "核心组件",
          items: [
            {
              text: "Web",
              link: "/components/server/",
              items: [
                { text: "路由", link: "/components/server/routing" },
                {
                  text: "标准响应",
                  link: "/components/server/standard-response",
                },
                { text: "中间件", link: "/components/server/middleware" },
              ],
            },
            { text: "HTTP 客户端", link: "/components/http-client" },
            { text: "配置管理", link: "/components/configuration" },
            { text: "日志", link: "/components/logging" },
            {
              text: "数据库",
              items: [
                { text: "mdb", link: "/components/database/mdb" },
                { text: "mredis", link: "/components/database/mredis" },
              ],
            },
            { text: "缓存", link: "/components/cache" },
          ],
        },
        {
          text: "可观测性",
          items: [
            { text: "背景知识", link: "/components/observability/background" },
            {
              text: "链路追踪",
              link: "/components/observability/tracing/",
            },
            {
              text: "指标监控",
              link: "/components/observability/metrics/",
            },
          ],
        },
      ],
      "/advanced/": [
        {
          text: "进阶",
          items: [
            { text: "测试", link: "/advanced/testing" },
            { text: "错误处理", link: "/advanced/error-handling" },
            { text: "部署", link: "/advanced/deployment" },
            { text: "跨边界链路追踪", link: "/advanced/messaging-tracing" },
            { text: "完整配置参考", link: "/advanced/full-configuration" },
          ],
        },
      ],
      "/cli/": [
        {
          text: "命令行工具",
          items: [{ text: "CLI 总览", link: "/cli/" }],
        },
      ],
      "/faq/": [
        {
          text: "FAQ",
          items: [
            { text: "常见问题", link: "/faq/" },
            { text: "设计哲学", link: "/faq/design-philosophy" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/graingo/maltose" },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2025 GrainGo",
    },
    outline: {
      level: [2, 3],
      label: "目录",
    },
    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "full",
        timeStyle: "medium",
      },
    },
    docFooter: {
      prev: "上一页",
      next: "下一页",
    },
    darkModeSwitchLabel: "外观",
    sidebarMenuLabel: "菜单",
    returnToTopLabel: "返回顶部",
  },
});
