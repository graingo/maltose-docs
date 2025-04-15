import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Maltose",
  description: "基于Gin打造的轻量级企业级Go开发框架",
  lang: "zh-CN",
  base: "/maltose-docs/",
  ignoreDeadLinks: true,
  cleanUrls: true,
  themeConfig: {
    // logo: '/logo.png',
    nav: [
      { text: "首页", link: "/" },
      { text: "快速开始", link: "/quick/download" },
      { text: "开发手册", link: "/docs/components/mhttp/start" },
      { text: "GitHub", link: "https://github.com/graingo/maltose" },
    ],
    sidebar: {
      "/quick/": [
        {
          text: "快速开始",
          items: [
            { text: "下载与使用", link: "/quick/download" },
            { text: "Hello World", link: "/quick/hello-world" },
            { text: "获取请求参数", link: "/quick/request-param" },
            { text: "请求数据结构", link: "/quick/request-struct" },
            { text: "使用规范路由", link: "/quick/standard-route" },
            { text: "中间件初试用", link: "/quick/middleware" },
            { text: "统一返回结构", link: "/quick/uniform-response" },
            { text: "生成接口文档", link: "/quick/api-docs" },
            { text: "下一步学习", link: "/quick/quick-next" },
          ],
        },
      ],
      "/docs/": [
        {
          text: "Web服务开发",
          collapsed: true,
          items: [
            { text: "开始使用", link: "/docs/components/mhttp/start" },
            { text: "路由管理", link: "/docs/components/mhttp/router" },
            { text: "请求处理", link: "/docs/components/mhttp/request" },
            { text: "响应处理", link: "/docs/components/mhttp/response" },
            { text: "中间件", link: "/docs/components/mhttp/middleware" },
            { text: "参数验证", link: "/docs/components/mhttp/validation" },
            { text: "接口文档", link: "/docs/components/mhttp/apidoc" },
            {
              text: "HTTP客户端",
              collapsed: true,
              link: "/docs/components/mclient/index",
              items: [
                { text: "基本使用", link: "/docs/components/mclient/basic" },
                { text: "数据处理", link: "/docs/components/mclient/data" },
                { text: "配置管理", link: "/docs/components/mclient/config" },
                { text: "中间件", link: "/docs/components/mclient/middleware" },
                { text: "重试机制", link: "/docs/components/mclient/retry" },
              ],
            },
          ],
        },
        {
          text: "核心组件",
          collapsed: true,
          items: [
            // 预留核心组件的位置
            // { text: '配置管理', link: '/docs/core/mconfig/index' },
            // { text: '日志处理', link: '/docs/core/mlog/index' },
            // { text: '错误处理', link: '/docs/core/merror/index' },
          ],
        },
        {
          text: "服务观测性",
          collapsed: true,
          items: [
            {
              text: "链路追踪",
              collapsed: true,
              link: "/docs/obs/trace/index",
              items: [
                { text: "背景知识", link: "/docs/obs/trace/background" },
                { text: "准备工作", link: "/docs/obs/trace/prepare" },
                { text: "基本示例", link: "/docs/obs/trace/example" },
                {
                  text: "HTTP示例",
                  collapsed: true,
                  items: [
                    {
                      text: "Baggage传递",
                      link: "/docs/obs/trace/http-example/baggage",
                    },
                    {
                      text: "数据操作",
                      link: "/docs/obs/trace/http-example/data-operation",
                    },
                  ],
                },
                {
                  text: "最佳实践",
                  collapsed: true,
                  items: [
                    {
                      text: "TraceID注入和获取",
                      link: "/docs/obs/trace/best-practice/inject-traceid",
                    },
                  ],
                },
              ],
            },
            { text: "指标监控", link: "/docs/obs/metric/index" },
          ],
        },
        {
          text: "框架设计",
          collapsed: true,
          items: [
            { text: "工程目录设计", link: "/docs/design/project-structure" },
            { text: "代码分层设计", link: "/docs/design/code-layer" },
            { text: "常见问题解答", link: "/docs/design/faq" },
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
