# AI 辅助开发

Maltose 提供两个官方 Agent Skill，分别服务于业务应用开发和框架维护。Skill 为 AI 补充可复用的开发流程、组件边界和验证清单，让不同工具在处理 Maltose 任务时遵循一致的方法。

Skill 源码统一维护在 [graingo/skills](https://github.com/graingo/skills)。

## 选择适合的 Skill

| 使用场景 | 项目规则 | 推荐 Skill |
| --- | --- | --- |
| 使用 Maltose 开发业务应用 | 业务仓库自己的 `AGENTS.md` 或 `CLAUDE.md` | `maltose-app-dev` |
| 修改 Maltose 框架、CLI、生成器、contrib、CI 或发布流程 | Maltose 仓库内的分层 `AGENTS.md` | `maltose-maintainer` |
| 修改与公共契约相关的 Maltose 文档或 Quickstart | 目标仓库规则和当前框架契约 | `maltose-maintainer` |

`AGENTS.md` 保存进入仓库后始终生效的规则，Skill 在匹配到具体任务时提供工作流。框架维护者同时遵循 Maltose 仓库规则和 `maltose-maintainer`；业务开发者使用自己项目的规则和 `maltose-app-dev`。

:::tip 普通用户从 app-dev 开始
如果你的目标是使用 Maltose 编写接口、业务逻辑、DAO、缓存或外部服务集成，只安装 `maltose-app-dev` 即可。
:::

## 安装

`skills` CLI 可以直接通过 `npx` 运行，不需要全局安装 npm 包。以下命令把 Skill 安装到用户级目录，适合在多个 Maltose 项目中复用。

安装业务应用开发 Skill：

```bash
npx skills add graingo/skills --skill maltose-app-dev -g
```

安装框架维护 Skill：

```bash
npx skills add graingo/skills --skill maltose-maintainer -g
```

同时安装两个 Skill：

```bash
npx skills add graingo/skills --skill maltose-app-dev maltose-maintainer -g
```

CLI 会识别本机支持的 AI 工具并让你确认安装目标。需要把 Skill 限定在当前项目时，在项目根目录执行相同命令并移除 `-g`。

完整参数见 [skills CLI 文档](https://www.skills.sh/docs/cli)。

## 更新与检查

官方 Skill 更新后，使用以下命令更新全部用户级 Skill：

```bash
npx skills update -g
```

也可以只更新一个 Skill：

```bash
npx skills update maltose-app-dev -g
npx skills update maltose-maintainer -g
```

查看当前用户级安装结果：

```bash
npx skills list -g
```

安装或更新后，重新开始 AI 会话或刷新客户端的 Skill 列表，使新版本进入当前工具的可用能力列表。

## 使用原则

1. 先让 AI 读取目标仓库规则、`go.mod` 和相邻实现。
2. 业务项目以 `go.mod` 锁定的 Maltose 版本为准，不直接套用当前主干才存在的 API。
3. 明确告诉 AI 当前任务属于业务应用开发还是框架维护；支持显式调用 Skill 的客户端可以直接选择对应名称。
4. 审查 AI 生成的 diff，并运行目标仓库要求的测试、静态检查和集成验证。

:::warning Skill 不能替代项目约束
Skill 提供工作流，不替代仓库内的 `AGENTS.md`、代码审查或 CI。安装和更新 Skill 前，请确认来源为 `graingo/skills` 并审查变更内容。
:::
