import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Maltose",
  description: "基于Gin打造的轻量级企业级Go开发框架",
  lang: "zh-CN",
  base: "/maltose-docs/",
  srcDir: "docs",
  head: [["link", { rel: "icon", href: "/maltose-docs/logo.svg" }]],
  ignoreDeadLinks: true,
  cleanUrls: true,
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "指南", link: "/guide/" },
      { text: "组件", link: "/components/" },
      { text: "进阶", link: "/advanced/" },
      { text: "CLI", link: "/cli/" },
      { text: "FAQ", link: "/faq/overview" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "指南",
          items: [
            { text: "简介", link: "/guide/" },
            { text: "快速开始", link: "/guide/getting-started" },
            { text: "核心概念", link: "/guide/core-concepts" },
            { text: "目录结构", link: "/guide/directory-structure" },
          ],
        },
      ],
      "/components/": [
        {
          text: "核心组件",
          items: [
            { text: "总览", link: "/components/" },
            { text: "Web Server (mhttp)", link: "/components/server" },
            { text: "路由 (Routing)", link: "/components/routing" },
            { text: "配置管理 (mcfg)", link: "/components/configuration" },
            { text: "日志 (mlog)", link: "/components/logging" },
            { text: "数据库 (mdb)", link: "/components/database" },
            { text: "缓存 (mcache)", link: "/components/cache" },
          ],
        },
        {
          text: "可观测性",
          items: [
            { text: "背景知识", link: "/components/observability/background" },
            {
              text: "链路追踪 (mtrace)",
              link: "/components/observability/tracing/",
            },
            {
              text: "指标监控 (mmetric)",
              link: "/components/observability/metrics/",
            },
          ],
        },
      ],
      "/advanced/": [
        {
          text: "进阶",
          items: [
            { text: "总览", link: "/advanced/" },
            { text: "中间件开发", link: "/advanced/middleware" },
            { text: "测试", link: "/advanced/testing" },
            { text: "错误处理", link: "/advanced/error-handling" },
            { text: "部署", link: "/advanced/deployment" },
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
            { text: "常见问题", link: "/faq/overview" },
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
