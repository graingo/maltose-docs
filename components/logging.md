# 日志

`mlog` 是 Maltose 框架提供的结构化日志组件，它基于 [Logrus](https://github.com/sirupsen/logrus) 实现，并在此基础上提供了更丰富、更便捷的功能，特别是在可观测性和配置方面。

## 特性

- **结构化日志**: 支持 `text` 和 `json` 两种输出格式，便于机器解析和日志系统采集。
- **日志分级**: 支持 `Debug`, `Info`, `Warn`, `Error`, `Fatal`, `Panic` 等多个日志级别。
- **自动 TraceID 注入**: 自动从 `context.Context` 中提取 `TraceID` 和 `SpanID` 并添加到每一条日志中，轻松实现日志的链路追踪。
- **文件归档与清理**: 内置了日志文件的按天轮转和自动清理功能，无需借助外部工具。
- **配置驱动**: 支持通过 `Config` 结构体或 `map` 对日志进行全面的配置。
- **上下文信息注入**: 可以配置从 `context.Context` 中自动提取指定的键值对并添加到日志字段中。

## 快速上手

`mlog` 提供了便捷的全局方法，通过 `m` 包即可调用。

```go
package main

import (
	"context"
	"github.com/graingo/maltose/frame/m"
)

func main() {
    ctx := context.Background()

    // 通过 m.Log() 获取默认日志实例并打印
    m.Log().Info(ctx, "这是一条 Info 级别的日志")
    m.Log().Warn(ctx, "这是一条 Warn 级别的日志")
    m.Log().Errorf(ctx, "发生了一个错误, code: %d", 1001)

    // 假设 ctx 中已经包含了 TraceID
    // 输出的日志会自动包含 trace_id 和 span_id 字段
    m.Log().Info(ctx, "这条日志会自动带上 TraceID")
}
```

## 配置

`mlog` 的强大之处在于其灵活的配置。您可以通过 `m.Log().SetConfig` 或 `m.Log().SetConfigWithMap` 来进行配置。

### 配置文件示例

您可以将日志配置写入 `config.yaml` 中，然后通过 `mcfg` 组件加载并设置。

```yaml
# file: config.yaml
log:
  level: "debug" # 日志级别
  path: "./logs" # 日志文件存放目录
  file: "{Y}-{m}-{d}.log" # 日志文件名，支持日期占位符
  stdout: true # 是否同时输出到控制台
  format: "json" # 日志格式: text 或 json
  autoClean: 7 # 日志文件保留天数，0表示不清理
  ctxKeys: ["userID", "requestURI"] # 从 context 中自动提取的字段
```

### 代码中加载配置

```go
// 假设您已经通过 m.Config() 加载了配置
logConfig, _ := m.Config().Get(ctx, "log")

// 将 map 配置应用到默认 logger
err := m.Log().SetConfigWithMap(logConfig.Map())
if err != nil {
    panic(err)
}

// 现在 mlog 的行为就和配置文件中定义的一致了
// 日志会以 json 格式输出到 ./logs/YYYY-MM-DD.log 文件和控制台
m.Log().Debug(ctx, "这是一条 Debug 日志")
```

## 核心功能详解

### TraceID 自动注入

这是 `mlog` 与 `mtrace` 组件联动的核心功能。只要您的 `context.Context` 中包含了由 OpenTelemetry 生成的 Span，`mlog` 就会自动将 `trace_id` 和 `span_id` 注入到日志的 `fields` 中。

```json
{
  "level": "info",
  "msg": "用户登录成功",
  "span_id": "8c6b7e8f0a1d9b3a",
  "time": "2023-10-27T10:00:00+08:00",
  "trace_id": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
}
```

### 自定义上下文注入

通过配置 `ctxKeys`，您可以让 `mlog` 自动从 `context.Context` 中提取您关心的业务字段。

```go
// 在配置中设置:
// CtxKeys: ["userID", "requestURI"]

// 在业务代码中，将信息存入 context
ctx = context.WithValue(context.Background(), "userID", 12345)
ctx = context.WithValue(ctx, "requestURI", "/users/profile")

// 记录日志
mlog.Info(ctx, "查询用户信息")
```

输出的 JSON 日志将会包含 `userID` 和 `requestURI` 字段：

```json
{
  "level": "info",
  "msg": "查询用户信息",
  "requestURI": "/users/profile",
  "time": "2023-10-27T10:00:00+08:00",
  "userID": 12345,
  "trace_id": "...",
  "span_id": "..."
}
```

这个功能对于构建可观测性系统、快速定位问题非常有帮助。

### 自定义钩子 (Custom Hooks)

除了内置的 `TraceID` 和 `ctxKeys` 注入功能，`mlog` 还提供了一个强大的 `Hook` 机制，允许您在日志写入前对日志条目（`Entry`）进行拦截和修改。这为您提供了极高的灵活性来扩展日志功能。

内置的 `TraceID` 和 `ctxKeys` 注入实际上就是通过内部钩子实现的。

#### `Hook` 接口

要创建一个自定义钩子，您需要实现 `mlog.Hook` 接口：

```go
package mlog

type Hook interface {
	// Levels 指定了该钩子对哪些日志级别生效。
	Levels() []Level
	// Fire 是钩子的核心执行函数。
	// 每一条符合级别的日志记录在写入前都会触发此函数。
	Fire(entry *Entry) error
}
```

- `Levels()`: 返回一个 `[]Level` 切片，定义了此钩子将作用于哪些日志级别。
- `Fire(entry *Entry)`: 这是钩子的主要逻辑。您可以访问并修改 `entry.Data` 来添加、删除或修改日志的字段。`entry.Data` 是一个 `map[string]interface{}`。

#### 使用示例：添加应用名字段

假设我们希望每一条日志都自动带上应用名 `app_name` 字段。我们可以创建一个 `AppNameHook`。

**1. 定义钩子**

```go
package main

import "github.com/graingo/maltose/os/mlog"

type AppNameHook struct {
    AppName string
}

// Levels 指定此钩子对所有级别的日志都生效
func (h *AppNameHook) Levels() []mlog.Level {
    return mlog.AllLevels()
}

// Fire 在日志条目中添加 app_name 字段
func (h *AppNameHook) Fire(entry *mlog.Entry) error {
    entry.Data["app_name"] = h.AppName
    return nil
}
```

_提示：`mlog.AllLevels` 是一个包含了所有日志级别的便捷切片。_

**2. 注册钩子**

在您的应用初始化阶段，创建钩子实例并将其添加到 `mlog` 中。

```go
import (
    "github.com/graingo/maltose/frame/m"
)

func main() {
    // ...
    appNameHook := &AppNameHook{AppName: "my-awesome-app"}
    m.Log().AddHook(appNameHook)

    // 现在所有的日志都会自动包含 app_name 字段
    m.Log().Info(context.Background(), "服务启动成功")
    // ...
}
```

**3. 输出结果**

最终输出的日志会是这样（以 JSON 格式为例）：

```json
{
  "app_name": "my-awesome-app",
  "level": "info",
  "msg": "服务启动成功",
  "time": "2023-10-27T11:00:00+08:00"
}
```

通过这种方式，您可以轻松地为日志系统添加各种自定义功能，例如：

- 将特定级别的错误日志发送到告警系统。
- 对敏感信息字段进行脱敏处理。
- 丰富日志内容，添加更多环境或应用相关的元数据。
