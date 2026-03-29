# 完整配置参考

本文给出当前公开 API 对应的一份可落地配置示例。为了减少歧义，这里统一使用嵌套实例形式，例如 `server.default`、`database.default`、`redis.default`。

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
    graceful_enable: true
    graceful_timeout: "30s"
    graceful_wait_time: "5s"
    openapi_path: "/api.json"
    swagger_path: "/swagger"
    print_routes: false
    logger:
      level: "info"
      stdout: true

logger:
  service_name: "maltose-app"
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

database:
  default:
    type: "mysql"
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
      - host: "192.168.1.2"
        port: "3306"
        user: "readonly_user"
        password: "your_password"
        db_name: "my_database"
      - host: "192.168.1.3"
        port: "3306"
        user: "readonly_user"
        password: "your_password"
        db_name: "my_database"

redis:
  default:
    address: "127.0.0.1:6379"
    db: 0
    password: ""
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

trace:
  enable: true
  protocol: "grpc"
  endpoint: "localhost:4317"
  insecure: true
  timeout: "10s"
  url_path: "/v1/traces"
  compression: 1
  sampling_rate: 1.0

metric:
  enable: true
  protocol: "grpc"
  endpoint: "localhost:4317"
  insecure: true
  timeout: "10s"
  url_path: "/v1/metrics"
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

### 4. `trace` 和 `metric` 仍然是应用侧初始化

这里给出的是推荐配置结构，方便你在应用启动时读取。它们不会仅靠配置文件自动完成 exporter 初始化。

### 5. 敏感信息不要直接写死

数据库密码、Redis 密码、OTLP endpoint 凭证更适合由环境变量、Secret 或配置中心注入。
