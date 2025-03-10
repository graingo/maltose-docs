import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Maltose',
  description: '基于Gin打造的轻量级企业级Go开发框架',
  lang: 'zh-CN',
  themeConfig: {
    // logo: '/logo.png',
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/quick/download' },
      { 
        text: '组件列表', 
        items: [
          { text: 'HTTP服务 (mhttp)', link: '/net/mhttp/index' },
          { text: '分布式追踪 (mtrace)', link: '/net/mtrace/index' },
          { text: '日志系统 (mlog)', link: '/os/mlog/index' },
          { text: '配置管理 (mcfg)', link: '/os/mcfg/index' }
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
          ]
        }
      ],
      '/net/mhttp/': [
        {
          text: 'HTTP服务 (mhttp)',
          items: [
            { text: '概述', link: '/net/mhttp/index' },
            { text: '服务器配置', link: '/net/mhttp/server' },
            { text: '路由管理', link: '/net/mhttp/router' },
            { text: '中间件', link: '/net/mhttp/middleware' },
            { text: '请求处理', link: '/net/mhttp/request' },
            { text: '响应处理', link: '/net/mhttp/response' },
            { text: '服务观测性', link: '/net/mhttp/observability' },
            { text: 'API文档生成', link: '/net/mhttp/apidoc' }
          ]
        }
      ],
      '/net/mtrace/': [
        {
          text: '分布式追踪 (mtrace)',
          items: [
            { text: '概述', link: '/net/mtrace/index' },
            { text: 'Baggage', link: '/net/mtrace/baggage' },
            { text: 'Span管理', link: '/net/mtrace/span' }
          ]
        }
      ],
      '/os/mlog/': [
        {
          text: '日志系统 (mlog)',
          items: [
            { text: '概述', link: '/os/mlog/index' },
            { text: '日志配置', link: '/os/mlog/config' },
            { text: '高级用法', link: '/os/mlog/advanced' }
          ]
        }
      ],
      '/os/mcfg/': [
        {
          text: '配置管理 (mcfg)',
          items: [
            { text: '概述', link: '/os/mcfg/index' },
            { text: '配置文件', link: '/os/mcfg/files' },
            { text: '多环境配置', link: '/os/mcfg/environments' }
          ]
        }
      ]
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
