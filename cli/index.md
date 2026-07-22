# Maltose CLI

`maltose` 用于创建项目，以及从数据库或 Go 契约生成重复代码。生成器负责骨架，不替代业务实现。

## 安装

CLI 需要 Go 1.23 或更高版本：

```bash
go install github.com/graingo/maltose/cmd/maltose@latest
maltose --version
```

确保 `$(go env GOPATH)/bin` 已加入 `PATH`。

## 命令速查

| 命令 | 输入 | 主要输出 |
| --- | --- | --- |
| `maltose new` | quickstart Git 模板 | 新项目目录 |
| `maltose gen model` | 数据库 `.env` | `internal/model` |
| `maltose gen dao` | 数据库 `.env` | `internal/dao` |
| `maltose gen service` | `api` 中的 `*Req`/`*Res` | Controller、Service |
| `maltose gen logic` | Service 接口 | Logic 实现骨架 |
| `maltose gen openapi` | 嵌入 `m.Meta` 的 API 定义 | OpenAPI YAML/JSON |

所有参数见[命令参考](./commands)。

## 推荐工作流

### 创建项目

```bash
maltose new my-project --module github.com/acme/my-project
cd my-project
```

当前 `new` 只更新 `go.mod`，不会同步改写模板 Go 文件中的 import path。生成后需将 `github.com/graingo/maltose-quickstart` 全局替换为新 module path。

### 数据库驱动开发

```bash
# 先在项目根目录准备 .env
maltose gen model
maltose gen dao
```

生成命令读取 `.env`；应用运行时读取 `mcfg`，两套配置需要保持一致。

### 契约驱动开发

1. 在 `api/<module>/<version>/` 定义 `*Req`、`*Res` 和 `m.Meta`。
2. 生成 Controller 与 Service。
3. 生成 Logic 骨架。
4. 完成所有 `TODO`/`implement me`。
5. 生成 OpenAPI，并运行测试。

```bash
maltose gen service
maltose gen logic
maltose gen openapi
go test ./...
```

## 生成代码的边界

- 生成前提交或暂存现有改动，便于审查差异。
- `internal/dao/internal` 属于生成实现，不要直接维护业务逻辑。
- Controller 和 Logic 骨架仍需要人工实现。
- 数据库或 API 契约变化后重新生成，并检查是否出现重复或不兼容签名。
- 将生成代码纳入版本控制，避免不同开发环境产生漂移。
