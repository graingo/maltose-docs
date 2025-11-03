# 部署指南

将您的 Maltose 应用部署到生产环境通常涉及两个主要步骤：

1.  **构建二进制文件**: 将您的 Go 代码编译成一个独立的可执行二进制文件。
2.  **容器化**: 将该二进制文件与必要的配置文件打包到一个 Docker 镜像中，以便在任何支持 Docker 的环境中运行。

本指南将提供一个推荐的、多阶段构建的 `Dockerfile`，它可以生成一个体积小且相对安全的生产镜像。

## 推荐的 Dockerfile

我们推荐使用**多阶段构建（multi-stage build）**来创建您的 Docker 镜像。这种方法的好处是：

- **构建环境与运行环境分离**: Go 编译工具链、源代码和依赖库只存在于构建阶段，最终的生产镜像不包含这些内容。
- **减小镜像体积**: 最终镜像只包含编译好的二进制文件、配置文件和一个最小化的基础镜像（如 `alpine`），体积非常小。
- **提高安全性**: 生产镜像中不包含源代码和编译工具，减少了攻击面。

在您的项目根目录下创建一个名为 `Dockerfile` 的文件，并填入以下内容：

```dockerfile
# --- 构建阶段 ---
# 使用官方的 Go 镜像作为构建环境
# 选择一个具体的版本以保证构建的可复现性
FROM golang:1.21-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 go.mod 和 go.sum 文件
COPY go.mod go.sum ./

# 下载依赖项
# 这一步可以利用 Docker 的层缓存，只有在依赖变更时才会重新执行
RUN go mod download

# 复制所有源代码
COPY . .

# 编译应用程序
# - CGO_ENABLED=0: 禁用 CGO，以便静态链接，生成一个不依赖 C 库的纯 Go 二进制文件
# - -ldflags "-s -w": 移除调试信息，减小二进制文件体积
# - -o /app/server: 指定输出的二进制文件名为 server
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server .

# --- 运行阶段 ---
# 使用一个极简的基础镜像，例如 scratch 或 alpine
# scratch 是一个完全空的镜像，最安全，但需要处理时区和 CA 证书问题
# alpine 是一个不错的折中方案，体积小且包含基本的工具
FROM alpine:latest

# 设置工作目录
WORKDIR /app

# 从构建阶段复制编译好的二进制文件
COPY --from=builder /app/server .

# 复制配置文件
# 假设您的配置文件都在 config 目录下
COPY config/ ./config

# (可选) 如果您的应用需要访问 HTTPS 服务，需要复制 CA 证书
# COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# 暴露应用程序监听的端口
# 这需要和您在 config.yaml 中配置的端口一致
EXPOSE 8080

# 定义容器启动时执行的命令
# 启动我们编译好的二进制文件
ENTRYPOINT ["/app/server"]
```

## 构建和运行容器

### 1. 构建镜像

在项目根目录下（`Dockerfile` 所在的位置），执行以下命令来构建 Docker 镜像：

```bash
# -t my-app:latest: 为镜像打上一个标签，格式为 <image-name>:<tag>
docker build -t my-app:latest .
```

### 2. 运行容器

构建成功后，您可以使用 `docker run` 命令来启动您的应用容器：

```bash
# -d: 后台运行容器
# -p 8080:8080: 将宿主机的 8080 端口映射到容器的 8080 端口
# --name my-app-container: 为容器指定一个名称
docker run -d -p 8080:8080 --name my-app-container my-app:latest
```

现在，您的 Maltose 应用程序就已经成功地以容器化的方式运行起来了。您可以通过访问 `http://localhost:8080` (或者您配置的相应路由)来与它交互。

### 查看日志

您可以使用以下命令来查看容器的实时日志：

```bash
docker logs -f my-app-container
```

## Docker Compose 部署

在生产环境中，应用通常需要依赖数据库、Redis 等服务。使用 Docker Compose 可以方便地管理多个容器。

### 完整的 docker-compose.yml

在项目根目录创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: maltose-app
    ports:
      - "8080:8080"
    environment:
      # 覆盖配置文件中的设置
      - APP_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - REDIS_ADDR=redis:6379
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - app-network

  mysql:
    image: mysql:8.0
    container_name: maltose-mysql
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-your_password}
      MYSQL_DATABASE: ${MYSQL_DATABASE:-myapp}
      MYSQL_USER: ${MYSQL_USER:-myapp}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-myapp_password}
    volumes:
      - mysql_data:/var/lib/mysql
      # 可选：导入初始化 SQL
      # - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD:-your_password}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: maltose-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

volumes:
  mysql_data:
    driver: local
  redis_data:
    driver: local

networks:
  app-network:
    driver: bridge
```

### 环境变量管理

创建 `.env` 文件存储敏感信息（**不要提交到 Git**）：

```bash
# .env
APP_ENV=production

# MySQL
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_DATABASE=myapp
MYSQL_USER=myapp
MYSQL_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password
```

在 `.gitignore` 中添加：

```
.env
.env.local
.env.production
```

### 使用 Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app

# 停止所有服务
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v
```

## Dockerfile 优化

### 添加健康检查

更新 Dockerfile，添加健康检查支持：

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server .

FROM alpine:latest

# 安装必要的工具
RUN apk --no-cache add ca-certificates wget

WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/config ./config

EXPOSE 8080

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:8080/health || exit 1

CMD ["./server"]
```

### 使用 .dockerignore

创建 `.dockerignore` 文件，减少构建上下文大小：

```
.git
.gitignore
.env
.env.*
README.md
*.md
.vscode
.idea
*.log
tmp/
dist/
```

## Kubernetes 部署

### Deployment 配置

创建 `k8s/deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maltose-app
  labels:
    app: maltose-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: maltose-app
  template:
    metadata:
      labels:
        app: maltose-app
    spec:
      containers:
      - name: app
        image: your-registry/maltose-app:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: APP_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: db_host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: db_password
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 2
          failureThreshold: 3
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: app-config
---
apiVersion: v1
kind: Service
metadata:
  name: maltose-app-service
spec:
  type: LoadBalancer
  selector:
    app: maltose-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

### ConfigMap 配置

创建 `k8s/configmap.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  db_host: "mysql-service"
  db_port: "3306"
  db_name: "myapp"
  redis_addr: "redis-service:6379"
  config.yaml: |
    server:
      address: ":8080"
    log:
      level: "info"
      stdout: false
      filepath: "/app/logs/app.log"
```

### Secret 配置

创建 `k8s/secret.yaml`：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  db_password: "your_secure_password"
  redis_password: "your_redis_password"
```

### 部署到 K8s

```bash
# 应用配置
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml

# 查看部署状态
kubectl get deployments
kubectl get pods
kubectl get services

# 查看日志
kubectl logs -f deployment/maltose-app

# 扩容
kubectl scale deployment maltose-app --replicas=5
```

## 生产环境检查清单

部署到生产环境前，请确保：

### 安全性
- [ ] 配置文件中的敏感信息（密码、密钥）已移至环境变量或 Secret
- [ ] 启用 HTTPS/TLS
- [ ] 设置合理的 CORS 策略
- [ ] 启用请求限流
- [ ] 日志中不包含敏感信息

### 可观测性
- [ ] 日志级别设置为 INFO 或 WARN
- [ ] 启用链路追踪（Jaeger/Zipkin）
- [ ] 配置指标监控（Prometheus）
- [ ] 设置告警规则
- [ ] 实现健康检查接口

### 性能
- [ ] 数据库连接池参数已优化
- [ ] Redis 连接池参数已优化
- [ ] 启用 HTTP/2
- [ ] 配置合理的超时时间
- [ ] 启用 GZIP 压缩

### 可靠性
- [ ] 配置优雅停机
- [ ] 设置资源限制（内存、CPU）
- [ ] 配置重启策略
- [ ] 启用健康检查
- [ ] 配置备份策略

### 其他
- [ ] 配置日志轮转
- [ ] 设置时区（容器中）
- [ ] 准备回滚方案
- [ ] 文档已更新
