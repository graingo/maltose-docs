# 日志

`mlog` 是 Maltose 框架提供的结构化日志组件，它基于 [Zap](https://github.com/uber-go/zap) 实现，并在此基础上提供了更丰富、更便捷的功能，特别是在可观测性和配置方面。

## 特性

- **高性能**: 基于 Zap 内核，提供极高的日志记录性能和极低的内存分配。
- **结构化日志**: 支持 `text` 和 `json` 两种输出格式，便于机器解析和日志系统采集。
- **日志分级**: 支持 `Debug`, `Info`, `Warn`, `Error`, `Fatal`, `Panic` 等多个日志级别。
- **自动 TraceID 注入**: 自动从 `context.Context` 中提取 `TraceID` 和 `SpanID` 并添加到每一条日志中，轻松实现日志的链路追踪。
- **强大的日志轮转**: 内置了灵活的文件日志轮转功能，支持**按大小**和**按日期**两种模式，并能自动清理过期日志。
- **配置驱动**: 支持通过配置文件对日志进行全面的配置，并支持动态修改配置。
- **上下文信息注入**: 可以配置从 `context.Context` 中自动提取指定的键值对并添加到日志字段中。

## 快速上手

`mlog` 提供了便捷的全局方法和两种日志记录风格：`printf` 风格和**结构化键值对**风格。

```go
package main

import (
	"context"
	"github.com/graingo/maltose/frame/m"
	"github.com/graingo/maltose/os/mlog"
)

func main() {
    ctx := context.Background()

    // 风格1: Printf 风格
    m.Log().Infof(ctx, "用户 %s 登录成功", "admin")

    // 风格2: 结构化键值对 (推荐)
    // 这种方式性能更高，且便于日志系统进行索引和查询
    m.Log().Infow(ctx, "用户登录成功", mlog.String("user", "admin"), mlog.Int("userID", 1001))

    // 假设 ctx 中已经包含了 TraceID
    // 输出的日志会自动包含 trace_id 和 span_id 字段
    m.Log().Info(ctx, "这条日志会自动带上 TraceID")
}
```

## 配置

`mlog` 的所有行为都由配置驱动。建议将日志配置写入 `config.yaml` 中，框架启动时会自动加载。

### 配置文件示例

以下是两个典型的配置示例，分别演示了**按大小轮转**和**按日期轮转**。

#### 示例 1: 按大小轮转 (Size-based Rotation)

当日志文件达到指定大小时会自动切割，这是最常用的模式。

```yaml
# file: config.yaml
log:
  level: "info"
  format: "json" # 日志格式: "json" 或 "text"
  stdout: true # 是否输出到控制台
  caller: true # 是否记录调用位置
  ctx_keys: ["userID"] # 从 context 中自动提取的字段

  # 文件日志配置
  filepath: "/var/log/app/maltose.log" # 日志文件路径
  max_size: 100 # (MB) 单个文件最大体积
  max_backups: 10 # 最多保留的旧文件数量
  max_age: 7 # (天) 旧文件最大保留天数
```

#### 示例 2: 按日期轮转 (Date-based Rotation)

如果你希望每天生成一个新的日志文件，可以使用日期模式。

```yaml
# file: config.yaml
log:
  level: "info"
  format: "json"
  stdout: false

  # 文件日志配置
  # 每天生成一个新日志文件，例如：access-2023-10-27.log
  filepath: "/var/log/app/access-{YYYY}-{MM}-{DD}.log"
  max_age: 30 # (天) 日志文件最长保留30天
```

### 配置参数详解

- `level`: 日志的输出级别。可选值为 `debug`, `info`, `warn`, `error`, `fatal`, `panic`。
- `format`: 日志格式，支持 `text` 和 `json`。默认为 `text`。
- `stdout`: 全局开关，控制是否将日志打印到标准输出（控制台）。
- `caller`: 是否在日志中记录源码文件名和行号。开启后会轻微影响性能。
- `ctxKeys`: 一个字符串数组，定义了需要从 `context.Context` 中自动提取并加入到日志字段的键名。
- `filepath`: 日志文件的完整路径。如果该字段不为空，则会启用文件日志。
  - 在 `size` 模式下，这是一个固定路径，如 `/var/log/app.log`。
  - 在 `date` 模式下，可以嵌入日期占位符。支持的占位符包括 `{YYYY}`, `{YY}`, `{MM}`, `{DD}`, `{HH}`, `{mm}`, `{ss}`。这些占位符可以自由组合，例如 `app-{YYYYMMDD}.log`。
    > **注意**：通常情况下，建议使用 `{DD}` (按天) 或 `{HH}` (按小时) 进行日志轮转。`{mm}` (分钟) 和 `{ss}` (秒) 级别的轮转仅为应对超高日志量的特殊场景或临时调试而设计，在常规应用中开启可能会导致文件数量过多和性能问题，请谨慎使用。
- `max_size`: **[仅 size 模式]** 单个日志文件的最大体积 (MB)，超过此大小会触发轮转。
- `max_backups`: **[仅 size 模式]** 当按大小轮转时，保留的旧日志文件的最大数量。
- `max_age`: **[通用]** 日志文件的最大保留天数（`size` 模式下指备份文件，`date` 模式下指所有匹配模式的文件）。

## 核心功能详解

### TraceID 自动注入

这是 `mlog` 与 `mtrace` 组件联动的核心功能。只要您的 `context.Context` 中包含了由 OpenTelemetry 生成的 Span，`mlog` 就会自动将 `trace_id` 和 `span_id` 注入到日志的 `fields` 中。

```json
{
  "level": "info",
  "ts": "2023-10-27T10:00:00.123+08:00",
  "caller": "mymodule/main.go:42",
  "msg": "用户登录成功",
  "trace_id": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "span_id": "8c6b7e8f0a1d9b3a"
}
```

### 自定义上下文注入

通过配置 `ctxKeys`，您可以让 `mlog` 自动从 `context.Context` 中提取您关心的业务字段。

```go
// 在配置中设置:
// log:
//   ctxKeys: ["userID", "requestURI"]

// 在业务代码中，将信息存入 context
ctx = context.WithValue(context.Background(), "userID", 12345)
ctx = context.WithValue(ctx, "requestURI", "/users/profile")

// 记录日志
mlog.Infow(ctx, "查询用户信息")
```

输出的 JSON 日志将会包含 `userID` 和 `requestURI` 字段：

```json
{
  "level": "info",
  "ts": "2023-10-27T10:30:00.456+08:00",
  "msg": "查询用户信息",
  "requestURI": "/users/profile",
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

// Hook a hook is a function that is called before a log entry is written.
type Hook interface {
	// Levels returns the log levels that the hook should be triggered for.
	Levels() []Level
	// Fire is called when a log entry is fired.
	Fire(entry *Entry) error
	// Name returns the name of the hook.
	Name() string
}
```

- `Levels()`: 返回一个 `[]Level` 切片，定义了此钩子将作用于哪些日志级别。
- `Fire(entry *Entry)`: 这是钩子的主要逻辑。您可以访问并修改 `entry` 来添加、删除或修改日志的字段。
- `Name()`: 返回钩子的唯一名称，用于后续的移除等操作。

#### 使用示例：添加应用名字段

假设我们希望每一条日志都自动带上应用名 `app_name` 字段。我们可以创建一个 `AppNameHook`。

**1. 定义钩子**

```go
package main

import "github.com/graingo/maltose/os/mlog"

type AppNameHook struct {
    AppName string
}

// Name returns the hook's name.
func (h *AppNameHook) Name() string {
	return "AppNameHook"
}

// Levels 指定此钩子对所有级别的日志都生效
func (h *AppNameHook) Levels() []mlog.Level {
    return mlog.AllLevels()
}

// Fire 在日志条目中添加 app_name 字段
func (h *AppNameHook) Fire(entry *mlog.Entry) error {
    entry.AddField(mlog.String("app_name", h.AppName))
    return nil
}
```

_提示：`mlog.AllLevels` 是一个包含了所有日志级别的便捷切片。_

**2. 注册钩子**

在您的应用初始化阶段，创建钩子实例并将其添加到 `mlog` 中。

```go
import (
    "context"
    "github.com/graingo/maltose/frame/m"
)

func main() {
    // ...
    appNameHook := &AppNameHook{AppName: "my-awesome-app"}
    m.Log().AddHook(appNameHook)

    // 现在所有的日志都会自动包含 app_name 字段
    m.Log().Infow(context.Background(), "服务启动成功")
    // ...
}
```

**3. 输出结果**

最终输出的日志会是这样（以 JSON 格式为例）：

```json
{
  "level": "info",
  "ts": "2023-10-27T11:00:00.789+08:00",
  "msg": "服务启动成功",
  "app_name": "my-awesome-app"
}
```

通过这种方式，您可以轻松地为日志系统添加各种自定义功能，例如：

- 将特定级别的错误日志发送到告警系统。
- 对敏感信息字段进行脱敏处理。
- 丰富日志内容，添加更多环境或应用相关的元数据。
