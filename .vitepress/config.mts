import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Maltose',
  description: '基于Gin打造的轻量级企业级Go开发框架',
  lang: 'zh-CN',
  base: '/maltose-docs/',
  ignoreDeadLinks: true,
  cleanUrls: true,
  themeConfig: {
    // logo: '/logo.png',
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/quick/download' },
      { text: '开发手册',
        items: [
          { text: '组件列表', link: '/components/' },
          { text: '服务观测性', link: '/obs/trace/index' },
        ]
       },
      { text: 'GitHub', link: 'https://github.com/graingo/maltose' }
    ],
    sidebar: {
      '/quick/': [
        {
          text: '快速开始',
          items: [
            { text: '下载与使用', link: '/quick/download' },
            { text: 'Hello World', link: '/quick/hello-world' },
            { text: '获取请求参数', link: '/quick/request-param' },
            { text: '请求数据结构', link: '/quick/request-struct' },
            { text: '使用规范路由', link: '/quick/standard-route' },
            { text: '中间件初试用', link: '/quick/middleware' },
            { text: '统一返回结构', link: '/quick/uniform-response' },
            { text: '生成接口文档', link: '/quick/api-docs' },
            { text: '下一步学习', link: '/quick/quick-next' },
          ],
          collapsed: true,
        }
      ],
      '/obs/': [
        {
          text: '服务观测性',
          items: [
            { text: '链路追踪', link: '/obs/trace/index', 
              items: [
                { text: '背景知识', link: '/obs/trace/background' },
                { text: '准备工作', link: '/obs/trace/prepare' },
                { text: '基本示例', link: '/obs/trace/example'},
                { text: 'HTTP示例', link: '/obs/trace/http-example',
                  items: [
                    { text: 'baggage', link: '/obs/trace/http-example/baggage' },
                    { text: '数据操作', link: '/obs/trace/http-example/data-operation' },
                  ]
                },
                { text: '最佳实践',
                  items: [
                    { text: 'TraceID注入和获取', link: '/obs/trace/best-practice/inject-traceid' },
                  ]
                 },
              ]
             },
            { text: '指标监控', link: '/obs/metric/index' },
            { text: '日志收集', link: '/obs/log/index' },
          ]
        }
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/graingo/maltose' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 GrainGo'
    }
  }
})
