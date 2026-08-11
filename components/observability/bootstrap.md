# 统一初始化 Trace 与 Metric

`contrib/observability` 将已有的 OTLP Trace、Metric exporter 组合成一个启动入口和一个生命周期资源。它不会隐藏底层组件；需要单独控制 Provider 时，仍可直接使用 `otlptrace` 和 `otlpmetric`。

## 安装

```bash
go get github.com/graingo/maltose/contrib/observability@latest
```

## 配置

```yaml
observability:
  enabled: true
  service_name: checkout-api
  service_version: v1.2.0
  environment: production
  insecure: true
  shutdown_timeout: 10s
  attributes:
    region: cn-east-1
  trace:
    enabled: true
    endpoint: otel-collector:4317
    protocol: grpc
    timeout: 10s
    sample_ratio: 0.1
  metric:
    enabled: true
    endpoint: otel-collector:4317
    protocol: grpc
    timeout: 10s
    export_interval: 10s
```

`protocol` 支持 `grpc` 和 `http`。使用 HTTP 时可以通过 `url_path` 覆盖默认上报路径。`enabled: false` 或省略整个节点都会返回可安全关闭的空 Provider。

## 接入应用生命周期

```go
telemetry, err := observability.FromConfig(ctx, m.Config())
if err != nil {
    return err
}

app := m.NewApp(
    m.WithServer(m.Server()),
    m.WithCloser(telemetry),
)
return app.Run()
```

`m.WithCloser` 会在 HTTP Server 停止后关闭 Provider，Metric 与 Trace 只执行一次 shutdown。初始化 Metric 失败时，已经创建的 Trace Provider 也会被回收。

如需从其他配置节点读取，可将节点名作为第三个参数传给 `FromConfig`。
