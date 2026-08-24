# CI 与多模块发布

本章面向 Maltose 维护者，说明仓库为什么需要逐模块验证，以及手动发布工作流如何保证根模块与子模块版本一致。

## 模块结构

Maltose 仓库包含多个可独立下载的 Go Module：

```text
github.com/graingo/maltose
├── cmd/maltose
├── contrib/config/apollo
├── contrib/config/nacos
├── contrib/metric/otlpmetric
├── contrib/trace/otlptrace
└── contrib/observability
```

`contrib/observability` 同时依赖根模块、`otlpmetric` 和 `otlptrace`，因此必须最后发布。

## CI 验证层次

Pull Request 和 `master` 推送共享以下基础检查：

1. 根模块全量 race 测试与覆盖率门槛；
2. MySQL、Redis、Apollo、Nacos 实际集成测试；
3. 每个子模块使用当前工作区源码的联调测试；
4. 每个模块关闭 workspace 后的独立 tidy、只读依赖和 race 测试；
5. lint 和 `govulncheck`。

公共 API 兼容性检查在 Pull Request 阶段执行，以目标分支的最新版本作为比较基线。

覆盖率门槛当前为 75%。Nacos SDK v2 的 RPC 重连状态存在上游 race，因此真实 Nacos 集成测试不使用 `-race`；Maltose Adapter 可独立测试的路径仍在 race 测试中。

## 为什么逐模块测试

一个覆盖全部模块的 `go.work` 会把原本独立的传递依赖图合并，可能掩盖缺失的 `go.sum`，也可能制造普通用户不会遇到的版本冲突。

CI 使用临时 `-modfile` 和本地 `replace` 让子模块引用当前 checkout，同时保持各模块独立解析。仓库内正式 `go.mod` 不允许留下本地路径 `replace`。

## 发布顺序

发布通过 GitHub Actions 的“手动发布”工作流触发，版本必须使用 `vX.Y.Z` 格式，并从最新 `master` 运行。

发布顺序固定为：

1. 根模块；
2. 第一层子模块：CLI、Apollo、Nacos、OTLP Metric、OTLP Trace；
3. `contrib/observability`；
4. 从 Go Module Proxy 下载所有已发布模块并重新编译验证；
5. 创建 GitHub Release。

对应 Tag 示例：

```text
v0.4.0
cmd/maltose/v0.4.0
contrib/config/apollo/v0.4.0
contrib/config/nacos/v0.4.0
contrib/metric/otlpmetric/v0.4.0
contrib/trace/otlptrace/v0.4.0
contrib/observability/v0.4.0
```

根模块发布后，工作流等待该版本可以从 Go Module Proxy 下载，再更新第一层子模块的依赖。`observability` 同样等待自己的三项依赖可下载后再发布，确保每个 Tag 都包含完整且可独立解析的 `go.mod`、`go.sum`。

## 发布前检查

- `master` 已包含计划发布的全部代码和文档；
- CI 的测试、lint、安全扫描和 API 兼容性检查通过；
- 所有模块执行 `go mod tidy -diff` 无输出；
- `version.go` 将由发布工作流更新，不手工提前创建 Tag；
- GitHub Token 或 PAT 有推送受保护分支、Tag 和 Release 的权限；
- 本次版本号尚未被其他提交占用。

## 失败恢复

发布脚本会识别根 Tag、第一层 Tag 和 Observability Tag 的完成状态。工作流中断后可以使用相同版本重新运行，它会从安全阶段继续。

以下不一致状态会直接终止：

- 只有部分第一层模块存在 Tag；
- 子模块 Tag 早于根模块 Tag；
- `master` 在部分发布后又包含无关提交；
- Tag 不属于发布分支或引用了错误依赖版本。

这些限制用于避免把不同提交拼接成同一个版本。遇到此类状态时，应先确认已发布 Tag 和 Module Proxy 内容，再决定恢复或发布新版本。

## 版本页与升级说明

每个正式版本可以在文档中增加对应版本页，内容保持四部分：

1. 新功能与重要修复；
2. Go、mconv 等最低依赖要求；
3. 兼容性结论；
4. 升级步骤。

向后兼容的版本直接写明：

> 本版本没有破坏性变更，更新依赖并执行完整测试即可。

只有用户必须修改代码、配置或部署流程时，才增加具体迁移步骤。版本页可以附带升级说明，不需要为每个版本长期维护独立的“迁移指南”栏目。

`v0.4.0` 的次版本号表示功能演进，不代表必须包含破坏性更新。Maltose 仍应主动保护有效用法的兼容性；如果未来确实需要不兼容调整，应在版本页、Release Notes 和 API 兼容性检查结果中明确说明。
