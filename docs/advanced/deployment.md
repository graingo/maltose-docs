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
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd

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

这个 `Dockerfile` 为您提供了一个坚实的起点，您可以根据自己项目的具体需求（例如，需要安装额外的工具、处理静态资源等）对其进行调整。
