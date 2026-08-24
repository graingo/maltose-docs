# 完整配置参考

本文给出当前公开 API 对应的一份可落地配置示例。为了减少歧义，这里统一使用嵌套实例形式，例如 `server.default`、`database.default`、`redis.default`。

:::tip 使用方式
这是一份字段参考，不建议原样复制到所有环境。先保留实际使用的组件和字段，再由 Secret、配置中心或部署系统注入敏感值。
:::

## `config.yaml`

```yaml
server:
  default:
    server_name: "maltose-app"
    address: ":8080"
    server_locale: "zh"
    read_timeout: "60s"
    write_timeout: "60s"
    idle_timeout: "60s"
    max_header_bytes: 1048576
    health_check: "/health"
    tls_enable: false
    tls_cert_file: ""
    tls_key_file: ""
    graceful_enable: true
    graceful_timeout: "30s"
    graceful_wait_time: "5s"
    openapi_path: "/api.json"
    swagger_path: "/swagger"
    swagger_template: ""
    print_routes: false
    logger:
      level: "info"
      stdout: true

logger:
  service_name: "maltose-app"
  level: "info"
  time_format: "2006-01-02 15:04:05.000"
  format: "json"
  stdout: true
  caller: false
  development: false
  filepath: "logs/app.log"
  max_size: 100
  max_backups: 10
  max_age: 7
  ctx_keys:
    - request_id

database:
  default:
    type: "mysql"
    dsn: ""
    host: "127.0.0.1"
    port: "3306"
    user: "root"
    password: "your_password"
    db_name: "my_database"
    max_idle_time: "10s"
    max_idle_connection: 10
    max_open_connection: 100
    max_lifetime: "0s"
    slow_threshold: "300ms"
    logger:
      level: "info"
      stdout: true

    replicas:
      - type: "mysql"
        host: "192.168.1.2"
        port: "3306"
        user: "readonly_user"
        password: "your_password"
        db_name: "my_database"
      - type: "mysql"
        host: "192.168.1.3"
        port: "3306"
        user: "readonly_user"
        password: "your_password"
        db_name: "my_database"

redis:
  default:
    address: "127.0.0.1:6379"
    db: 0
    user: ""
    password: ""
    master_name: ""
    pool_size: 10
    min_idle_conns: 0
    max_idle_conns: 0
    max_retries: 3
    min_retry_backoff: "8ms"
    max_retry_backoff: "512ms"
    dial_timeout: "5s"
    read_timeout: "3s"
    write_timeout: "3s"
    pool_timeout: "4s"
    conn_max_idle_time: "5m"
    slow_threshold: "20ms"
    logger:
      level: "info"
      stdout: true

  cache:
    address: "127.0.0.1:6379"
    db: 1

observability:
  enabled: true
  service_name: "maltose-app"
  service_version: "v1.0.0"
  environment: "production"
  insecure: true
  shutdown_timeout: "10s"
  attributes:
    region: "cn-east-1"
  trace:
    enabled: true
    protocol: "grpc"
    endpoint: "localhost:4317"
    timeout: "10s"
    url_path: ""
    sample_ratio: 1.0
  metric:
    enabled: true
    protocol: "grpc"
    endpoint: "localhost:4317"
    timeout: "10s"
    url_path: ""
    export_interval: "10s"
```

## 说明

### 1. `logger` 才是全局日志节点

当前运行时读取的是 `logger`，不是 `log`。

### 2. `server` / `database` / `redis` 支持两种结构

以下两种写法都能工作：

```yaml
server:
  address: ":8080"
```

```yaml
server:
  default:
    address: ":8080"
```

本文统一展示 `default` 形式，是为了和多实例写法保持一致。

### 3. 组件级 `logger` 会覆盖全局日志配置

如果 `server.default.logger`、`database.default.logger`、`redis.default.logger` 存在，就优先使用各自的日志配置；否则回退到全局 `logger`。

### 4. `observability` 仍然由应用侧初始化

这里给出的是统一初始化模块读取的配置结构。应用仍需调用 `observability.FromConfig`，并把返回的 Provider 注册到 `m.WithCloser`。

### 5. 敏感信息不要直接写死

数据库密码、Redis 密码、OTLP endpoint 凭证更适合由环境变量、Secret 或配置中心注入。

### 6. 副本配置不会继承主库

`database.*.replicas` 中的每一项都会独立创建驱动，因此需重复填写 `type` 和完整连接参数，或直接填写完整 `dsn`。

### 7. 只列出当前运行时生效的配置字段

`logger.Writer`、`database.Plugins`、`redis.Hooks` 等 Go 接口或函数值需要在代码中设置，无法通过 YAML 表达。兼容字段 `server_root`、`tls_server_name` 当前不参与运行时行为，因此不应写入新配置。HTTP/JSON OTLP 的 `url_path` 留空时由 OpenTelemetry exporter 使用协议默认路径。
