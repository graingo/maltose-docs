# 贡献指南

首先，非常感谢您愿意为 Maltose 社区做出贡献！您的每一份贡献，无论是代码、文档，还是一个简单的拼写错误修正，都对我们至关重要。

为了维护一个健康、有序、高效的社区环境，请您在贡献之前花几分钟时间阅读以下指南。

## 行为准则

我们致力于为所有参与者提供一个友好、安全和热情的环境。请务必遵守我们的 [行为准则](./CODE_OF_CONDUCT.md)。

## 如何贡献

我们欢迎各种形式的贡献，包括但不限于：

- **报告 Bug**: 如果您在使用中发现了 Bug，请通过 [GitHub Issues](https://github.com/graingo/maltose/issues) 提交。请确保提供详细的复现步骤、环境信息和错误日志。
- **功能建议**: 如果您有关于新功能或改进的想法，也欢迎通过 [GitHub Issues](https://github.com/graingo/maltose/issues) 与我们讨论。
- **提交 Pull Request (PR)**:
  - 修复已知 Bug。
  - 实现已讨论并同意的新功能。
  - 改进文档，修正拼写或语法错误。

## Pull Request 流程

1.  **Fork 仓库**: 将 `graingo/maltose` 仓库 Fork 到您自己的 GitHub 账户下。
2.  **克隆您的 Fork**: `git clone https://github.com/YourUsername/maltose.git`
3.  **创建分支**: 从 `main` 分支创建一个新的特性分支。分支命名应清晰地描述其目的，例如 `fix/some-bug` 或 `feat/new-feature`。
    ```bash
    git checkout -b feat/describe-your-feature
    ```
4.  **进行修改**: 在新分支上进行您的代码或文档修改。
5.  **保证代码质量**:
    - 确保您的代码遵循 Go 语言的编码规范。可以使用 `go fmt` 或 `goimports` 进行格式化。
    - 如果添加了新功能，请务必编写相应的单元测试。
    - 确保所有测试都能够通过 (`go test ./...`)。
6.  **提交更改**: 使用清晰、规范的提交信息。我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。
    ```bash
    git commit -m "feat: Add user authentication feature"
    ```
    **Commit Message 格式**: `type(scope): subject`
    - `type`: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` 等。
    - `scope` (可选): 本次提交影响的范围，如 `mhttp`, `mlog` 等。
    - `subject`: 简洁地描述本次提交的目的。
7.  **Push 到您的 Fork**:
    ```bash
    git push origin feat/describe-your-feature
    ```
8.  **创建 Pull Request**: 在 GitHub 上，从您的特性分支向 `graingo/maltose` 的 `main` 分支发起一个 Pull Request。请在 PR 描述中清晰地说明您做了什么，以及为什么要这么做。

感谢您的贡献！
