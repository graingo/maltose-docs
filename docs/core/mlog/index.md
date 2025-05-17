# 日志系统模块 (mlog)

`mlog` 是 Maltose 框架的日志系统模块，它基于 [logrus](https://github.com/sirupsen/logrus) 构建，提供了结构化日志记录、多输出目标、日志级别控制、上下文集成等功能。

## 主要特性

- 结构化日志记录
- 支持多种日志级别 (Debug, Info, Warn, Error, Fatal, Panic)
- 上下文信息集成
- 链路追踪自动关联
- 多输出目标支持 (控制台、文件、网络等)
- 日志钩子机制
- 日志格式化器 (文本格式、JSON 格式)
- 实例管理

## 快速开始

### 基本用法

```go
package main

import (
    "context"

    "github.com/graingo/maltose/os/mlog"
)

func main() {
    // 获取默认日志实例
    logger := mlog.DefaultLogger()

    // 创建上下文
    ctx := context.Background()

    // 记录不同级别的日志
    logger.Debug(ctx, "这是一条调试日志")
    logger.Info(ctx, "这是一条信息日志")
    logger.Warn(ctx, "这是一条警告日志")
    logger.Error(ctx, "这是一条错误日志")

    // 使用格式化日志
    logger.Infof(ctx, "用户 %s 登录成功，角色: %s", "admin", "管理员")

    // 使用全局默认方法
    mlog.Info(ctx, "使用全局默认日志记录器")
}
```

### 配置日志选项

```go
package main

import (
    "context"
    "os"

    "github.com/graingo/maltose/os/mlog"
)

func main() {
    // 创建配置
    config := mlog.DefaultConfig()

    // 设置日志级别
    config.Level = mlog.DebugLevel

    // 设置日志格式
    config.Format = "json"

    // 设置输出
    config.Writer = os.Stdout

    // 捕获上下文键值
    config.CtxKeys = []string{"user_id", "trace_id", "request_id"}

    // 创建新的日志实例
    logger := mlog.New()
    logger.SetConfig(config)

    // 使用配置后的日志记录
    ctx := context.WithValue(context.Background(), "user_id", "12345")
    logger.Info(ctx, "用户操作记录")
}
```

### 文件输出

```go
package main

import (
    "context"

    "github.com/graingo/maltose/os/mlog"
)

func main() {
    // 创建配置
    config := mlog.DefaultConfig()

    // 设置文件输出
    config.Path = "/var/logs/app"
    config.File = "{Y}-{m}-{d}.log"  // 按日期生成日志文件

    // 创建日志实例
    logger := mlog.New()
    logger.SetConfig(config)

    // 记录日志
    ctx := context.Background()
    logger.Info(ctx, "应用启动成功")
}
```

### 添加自定义钩子

```go
package main

import (
    "context"

    "github.com/graingo/maltose/os/mlog"
    "github.com/sirupsen/logrus"
)

// 自定义日志钩子
type MetricsHook struct{}

// 实现钩子接口
func (h *MetricsHook) Levels() []logrus.Level {
    return []logrus.Level{
        logrus.ErrorLevel,
        logrus.FatalLevel,
        logrus.PanicLevel,
    }
}

func (h *MetricsHook) Fire(entry *logrus.Entry) error {
    // 当发生错误日志时，增加错误计数指标
    // metrics.IncCounter("log_errors_total", 1)
    return nil
}

func main() {
    // 创建日志实例
    logger := mlog.New()

    // 添加自定义钩子
    logger.AddHook(&MetricsHook{})

    // 记录日志将触发钩子
    ctx := context.Background()
    logger.Error(ctx, "发生错误")
}
```

### 与链路追踪集成

`mlog` 默认与链路追踪集成，会自动从上下文中提取追踪 ID：

```go
package main

import (
    "context"

    "github.com/graingo/maltose/net/mtrace"
    "github.com/graingo/maltose/os/mlog"
    "go.opentelemetry.io/otel/trace"
)

func main() {
    // 初始化追踪
    tp := mtrace.InitTracer("my-service")
    defer tp.Shutdown(context.Background())

    // 创建跟踪上下文
    ctx, span := tp.Tracer("main").Start(context.Background(), "main-operation")
    defer span.End()

    // 使用带有追踪上下文的日志
    logger := mlog.New()
    logger.Info(ctx, "操作执行中") // 日志会自动包含 trace_id 和 span_id

    // 获取当前跟踪ID
    traceID := trace.SpanFromContext(ctx).SpanContext().TraceID().String()
    logger.Infof(ctx, "当前操作的跟踪ID: %s", traceID)
}
```

## 下一步

在接下来的章节中，我们将详细介绍：

- [日志级别](/docs/core/mlog/levels) - 不同日志级别的使用场景
- [日志格式](/docs/core/mlog/formats) - 自定义日志输出格式
- [多输出目标](/docs/core/mlog/outputs) - 配置多种日志输出目标
- [上下文集成](/docs/core/mlog/context) - 与上下文的集成和信息传递
