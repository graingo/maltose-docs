# 日志

`mlog` 是 Maltose 的结构化日志组件，底层基于 Zap。它支持文本和 JSON 两种输出格式，并且和 `mtrace`、`mdb`、`mredis` 等组件有直接集成。

## 快速上手

```go
package main

import (
    "context"

    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/os/mlog"
)

func main() {
    ctx := context.Background()

    m.Log().Infof(ctx, "user %s login", "admin")

    m.Log().Infow(
        ctx,
        "user login",
        mlog.String("user", "admin"),
        mlog.Int("user_id", 1001),
    )
}
```

## 配置

运行时默认读取顶层 `logger` 节点。

```yaml
logger:
  service_name: "maltose"
  level: "info"
  format: "json"
  stdout: true
  caller: false
  filepath: "logs/app.log"
  max_size: 100
  max_backups: 10
  max_age: 7
  ctx_keys:
    - request_id
```

### 常用配置项

| 配置项 | 说明 |
| --- | --- |
| `service_name` | 服务名 |
| `level` | `debug` / `info` / `warn` / `error` / `fatal` / `panic` |
| `format` | `json` 或 `text` |
| `stdout` | 是否输出到标准输出 |
| `caller` | 是否记录调用位置 |
| `development` | 是否启用开发模式 |
| `filepath` | 文件日志路径 |
| `max_size` | 按大小滚动时的单文件上限，单位 MB |
| `max_backups` | 保留旧文件数量 |
| `max_age` | 日志保留天数 |
| `ctx_keys` | 从上下文提取的业务字段 |

## Trace 字段自动注入

只要传入的 `context.Context` 已经包含链路信息，`mlog` 会自动追加：

- `trace.id`
- `span.id`

```json
{
  "level": "info",
  "msg": "user login",
  "trace.id": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "span.id": "8c6b7e8f0a1d9b3a"
}
```

## 上下文字段注入

`ctx_keys` 读取的是 `context.Context` 中以 `mlog.CtxKey(...)` 写入的值。

```go
package main

import (
    "context"

    "github.com/graingo/maltose/os/mlog"
)

func main() {
    ctx := context.WithValue(context.Background(), mlog.CtxKey("request_id"), "req-123")
    ctx = context.WithValue(ctx, mlog.CtxKey("user_id"), 1001)

    logger := mlog.New()
    if err := logger.SetConfigWithMap(map[string]any{
        "ctx_keys": []string{"request_id", "user_id"},
    }); err != nil {
        panic(err)
    }

    logger.Infow(ctx, "query user")
}
```

## 自定义 Hook

`Hook` 接口如下：

```go
type Hook interface {
    Name() string
    Levels() []mlog.Level
    Fire(entry *mlog.Entry)
}
```

示例：为所有日志添加 `app_name` 字段。

```go
package main

import (
    "context"

    "github.com/graingo/maltose/frame/m"
    "github.com/graingo/maltose/os/mlog"
)

type AppNameHook struct {
    AppName string
}

func (h *AppNameHook) Name() string {
    return "app_name"
}

func (h *AppNameHook) Levels() []mlog.Level {
    return mlog.AllLevels()
}

func (h *AppNameHook) Fire(entry *mlog.Entry) {
    entry.AddField(mlog.String("app_name", h.AppName))
}

func main() {
    if err := m.Log().AddHook(&AppNameHook{AppName: "my-app"}); err != nil {
        panic(err)
    }

    m.Log().Infow(context.Background(), "service started")
}
```

## 组件级日志

`server`、`database`、`redis` 都可以配置自己的 `logger` 子节点；未单独配置时，会回退到全局 `logger`。

```yaml
database:
  default:
    type: "mysql"
    dsn: "root:password@tcp(127.0.0.1:3306)/app?charset=utf8mb4&parseTime=True&loc=Local"
    logger:
      level: "warn"
      stdout: true
```

## 使用建议

- 面向检索和聚合时优先使用 `Infow` / `Warnw` / `Errorw`。
- 需要格式化字符串时使用 `Infof` / `Warnf` / `Errorf`。
- 传入上下文时统一使用真实业务上下文，链路字段和自定义 `ctx_keys` 才能生效。
