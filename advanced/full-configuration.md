# 完整配置参考

本文档提供了一个 Maltose 框架的完整 `config.yaml` 配置文件示例，其中包含了绝大部分常用组件的配置项，并附有详细的注释。您可以将其作为项目配置的起点或参考手册。

## `config.yaml`

```yaml
# ----------------------------------------------------------------
# Server (mhttp)
# HTTP 服务器相关配置
# ----------------------------------------------------------------
server:
  # 服务名称，会用于 OpenTelemetry 的 service.name
  name: "maltose-app"
  # 服务器监听地址和端口
  address: ":8080"
  # 读取请求头的最长时间
  read_timeout: "5s"
  # 写入响应的最长时间
  write_timeout: "10s"
  # 连接保持空闲的最长时间
  idle_timeout: "15s"
  # 是否启用优雅停机
  graceful_enable: true
  # 优雅停机的最长等待时间
  graceful_timeout: "10s"
  # OpenAPI 规范的访问路径
  openapi_path: "/api.json"
  # Swagger UI 的访问路径
  swagger_path: "/swagger"
  # 日志配置（可选，无则使用 全局日志配置）
  logger:
    level: "info"
    stdout: true
    filepath: "logs/http.log"

# ----------------------------------------------------------------
# Log (mlog)
# 日志组件相关配置
# ----------------------------------------------------------------
log:
  # 日志级别: debug, info, warn, error, fatal, panic
  level: "info"
  # 是否同时将日志输出到标准输出 (控制台)
  stdout: true
  # 日志格式: "text" 或 "json"
  format: "json"
  # 配置从 context.Context 中自动提取并添加到日志字段的键名列表
  ctxKeys: ["userID", "requestURI"]

  # --- 文件日志轮转配置 ---
  # 如果省略 filepath, 则不输出到文件
  #
  # 示例1 (按大小轮转):
  # filepath: "logs/app.log"
  # max_size: 100
  # max_backups: 10
  # max_age: 7
  #
  # 示例2 (按日期轮转):
  # filepath: "logs/app-{YYYY}-{MM}-{DD}.log"
  # max_age: 30
  filepath: "logs/app.log"
  max_size: 100
  max_backups: 10
  max_age: 7

# ----------------------------------------------------------------
# Database (mdb)
# 关系型数据库相关配置 (支持多实例)
# ----------------------------------------------------------------
database:
  # 数据库类型: mysql, pgsql, sqlite
  type: "mysql"
  host: "127.0.0.1"
  port: "3306"
  user: "root"
  password: "your_password"
  db_name: "my_database"
  # 或者直接使用 DSN 连接
  dsn: "root:your_password@tcp(127.0.0.1:3306)/my_database?charset=utf8mb4&parseTime=True&loc=Local"
  # 连接池配置
  max_idle_connection: 10
  max_open_connection: 100
  # SQL 执行时间超过该值，会被 mlog 记录为 Warn 级别的慢查询日志
  slow_threshold: "500ms"
  # 日志配置（可选，无则使用 全局日志配置）
  logger:
    level: "info"
    stdout: true
    filepath: "logs/database.log"
  # 读写分离配置 (可选)
  replicas:
    # 第一个只读副本
    - host: "192.168.1.2"
      port: "3306"
      user: "readonly_user"
      password: "your_password"
      db_name: "my_database"
    # 第二个只读副本
    - host: "192.168.1.3"
      port: "3306"
      user: "readonly_user"
      password: "your_password"
      db_name: "my_database"

# ----------------------------------------------------------------
# Redis (mredis)
# Redis 客户端相关配置 (支持多实例)
# ----------------------------------------------------------------
redis:
  # 默认实例
  default:
    address: "127.0.0.1:6379"
    password: "" # 密码，如果没有则留空
    db: 0 # 数据库编号
    pool_size: 10 # 连接池大小
    # 命令执行时间超过该值，会被 mlog 记录为 Warn 级别的慢命令日志
    slow_threshold: "20ms"
    # 日志配置（可选，无则使用 全局日志配置）
    logger:
      level: "info"
      stdout: true
      filepath: "logs/redis.log"

  # 用于缓存的另一个实例
  cache:
    address: "127.0.0.1:6379"
    password: ""
    db: 1 # 推荐为缓存使用独立的 db
    pool_size: 20
    slow_threshold: "50ms"

# ----------------------------------------------------------------
# Trace (mtrace)
# 链路追踪相关配置。
# 注意：以下配置主要用于初始化 contrib/trace/otlptrace 包，不会被框架自动加载。
# ----------------------------------------------------------------
trace:
  # 是否启用链路追踪
  enable: true

  # --- Exporter 配置 ---
  # 协议: "grpc" 或 "http"
  protocol: "grpc"
  # Exporter 的 Endpoint 地址 (例如: "localhost:4317" for gRPC, "localhost:4318" for HTTP)
  endpoint: "localhost:4317"
  # 是否使用非安全连接 (例如 http, 而不是 https)
  insecure: true
  # 导出超时时间
  timeout: "10s"
  # (仅 HTTP) URL 路径
  url_path: "/v1/traces"
  # (仅 HTTP) 压缩级别, 1 代表 gzip
  compression: 1

  # --- Sampler 配置 ---
  # 采样率 (0.0 到 1.0, 1.0 表示全部采样)
  sampling_rate: 1.0

# ----------------------------------------------------------------
# Metric (mmetric)
# 指标监控相关配置。
# 注意：以下配置主要用于初始化 contrib/metric/otlpmetric 包，不会被框架自动加载。
# ----------------------------------------------------------------
metric:
  # 是否启用指标监控
  enable: true

  # --- Exporter 配置 ---
  # 协议: "grpc" 或 "http"
  protocol: "grpc"
  # Exporter 的 Endpoint 地址
  endpoint: "localhost:4317"
  # 是否使用非安全连接
  insecure: true
  # 导出超时时间
  timeout: "10s"
  # (仅 HTTP) URL 路径
  url_path: "/v1/metrics"
  # 指标导出间隔
  export_interval: "10s"

**注意**:

- 以上配置项并非全部，某些组件可能还有更细粒度的配置，但这里列出的是最常用和最重要的部分。
- **关于 `trace` 和 `metric`**: 这两部分的配置仅为推荐的结构示例，**不会**被框架自动加载。您需要自行在代码中读取这部分配置，并调用 `contrib` 包中的初始化函数来启动 Exporter。
- 在实际项目中，您应该将敏感信息（如数据库密码）通过环境变量或更安全的配置中心进行管理，而不是硬编码在文件中。
```
