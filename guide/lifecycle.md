# 应用生命周期

`m.App` 负责把服务启动、退出信号、优雅关闭和资源释放组织成一个明确的应用生命周期。它不创建业务组件，只管理调用方注册进来的 Server、Hook 和 Closer。

## 完整示例

```go
package main

import (
    "context"
    "time"

    "github.com/graingo/maltose/contrib/observability"
    "github.com/graingo/maltose/frame/m"
)

func run(ctx context.Context) error {
    server := m.Server()
    logger := m.Log()

    db, err := m.TryDB()
    if err != nil {
        return err
    }
    redisClient, err := m.TryRedis()
    if err != nil {
        return err
    }
    telemetry, err := observability.FromConfig(ctx, m.Config())
    if err != nil {
        return err
    }

    app := m.NewApp(
        m.WithLogger(logger),
        m.WithServer(server),
        // 关闭回调逆序执行，因此 logger 最后关闭。
        m.WithCloser(logger, telemetry, redisClient, db),
        m.WithShutdownTimeout(10*time.Second),
    )
    return app.Run()
}
```

`m.WithCloser` 按参数顺序注册资源，关闭时逆序执行。上例的顺序是 DB → Redis → OpenTelemetry → Logger，使数据库和 Redis 关闭过程产生的日志与遥测仍有机会导出，最后再刷新日志。

## 运行过程

`Run()` 的执行过程如下：

1. 并发调用所有非 `nil` Server 的 `Start(ctx)`。
2. 监听 `SIGINT`、`SIGTERM` 和 Server 返回。
3. 任意 Server 返回时取消应用上下文；启动失败也走同一套关闭流程。
4. 并发调用各 Server 的 `Stop(ctx)`。
5. Server 停止完成后，逆序执行 Hook 和 Closer。
6. 汇总启动、停止和清理错误并返回。

Server 正常返回同样会结束整个应用。这适合“任一核心服务退出，应用整体退出”的部署模型。

## AppServer 契约

`m.WithServer` 接受实现以下接口的服务：

```go
type AppServer interface {
    Start(ctx context.Context) error
    Stop(ctx context.Context) error
}
```

- `Start` 应阻塞到服务停止；启动失败时返回具体错误。
- `Stop` 应支持重复调用，并在传入的 Context 到期前尽快返回。
- `Stop` 应使 `Start` 解除阻塞并正常结束。

`mhttp.Server` 已实现该接口。消息消费服务、定时任务调度器等长期运行组件也可以实现同一契约后交给 `m.App` 管理。

## Hook 与 Closer

需要 Context 的清理逻辑使用 `m.WithShutdownHook`：

```go
app := m.NewApp(
    m.WithShutdownHook(func(ctx context.Context) error {
        return producer.Flush(ctx)
    }),
)
```

实现 `io.Closer` 的资源使用 `m.WithCloser`：

```go
app := m.NewApp(
    m.WithCloser(logger, redisClient, db),
)
```

Hook 与 Closer 进入同一个逆序关闭序列。多个 `WithShutdownHook`、`WithCloser` 选项之间的先后顺序会直接决定实际关闭顺序。

## 超时与错误

默认关闭超时为 10 秒，可通过 `m.WithShutdownTimeout` 调整。每个 Server、Hook 和 Closer 都获得独立的超时窗口，一个回调超时不会阻止后续回调执行。

`WithShutdownHook` 应主动监听传入的 Context。`io.Closer.Close()` 没有 Context 参数，超时只能让 `m.App` 停止等待，不能强制终止仍在执行的 `Close`；耗时资源更适合包装成 Hook。

`Run()` 会返回：

- Server 启动或运行错误；
- Server 停止错误；
- Hook、Closer 的错误或超时；
- 上述多个错误的组合。

正常退出产生的 `context.Canceled` 不会被当作应用错误。

## 常见错误

- 直接调用 `server.Run()`，却忘记关闭 DB、Redis 或遥测 Provider。
- 在业务 Handler 中延迟初始化外部资源，导致启动成功后才暴露连接错误。
- 把有先后依赖的资源按错误顺序注册，导致日志或遥测先于业务资源关闭。
- 在 Hook 中忽略 Context，导致进程退出时间不可控。

实例由谁创建、不同应用如何隔离，见[全局对象](./global-instances)和[Scope 与实例隔离](../advanced/scopes)。
