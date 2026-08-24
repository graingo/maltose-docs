# Scope 与实例隔离

Scope 是 Maltose 的应用实例边界。它持有一份 `mcfg.Config`，并为 Server、DB、Redis 和 Logger 分别维护具名实例容器。

## 默认 Scope

包级门面使用进程默认 Scope：

```go
server := m.Server()
db := m.DB("report")
redisClient := m.Redis("cache")
logger := m.Log("access")
```

同一名称在默认 Scope 中只创建一次，适合单应用进程和常规业务代码。

## 创建显式 Scope

显式 Scope 必须传入非 `nil` 配置，不会隐式回退到进程默认配置：

```go
adapter, err := mcfg.NewAdapterContent(`
logger:
  service_name: checkout-api
server:
  address: ":0"
`, "yaml")
if err != nil {
    return err
}

scope := m.NewScope(mcfg.NewWithAdapter(adapter))
server := scope.Server()
logger := scope.Log()
```

同一 Scope 内的同名组件保持单例：

```go
first := scope.Server("admin")
second := scope.Server("admin")
fmt.Println(first == second) // true
```

不同 Scope 即使使用相同名称，也会得到不同实例。

## 测试隔离

测试可以为每个用例创建独立配置和 Scope，不需要修改 `m.Config()` 或清理默认组件容器：

```go
func newTestScope(t *testing.T, serviceName string) *m.Scope {
    t.Helper()

    adapter, err := mcfg.NewAdapterContent(`
logger:
  service_name: `+serviceName+`
server:
  address: ":0"
`, "yaml")
    require.NoError(t, err)

    return m.NewScope(mcfg.NewWithAdapter(adapter))
}
```

对于 DB、Redis，优先使用 `scope.TryDB()`、`scope.TryRedis()`，让配置或连接错误以 `error` 返回，便于测试断言。

## 同进程多应用

多个 Scope 可以由一个 `m.App` 统一管理生命周期：

```go
publicScope := m.NewScope(publicConfig)
adminScope := m.NewScope(adminConfig)

publicServer := publicScope.Server()
adminServer := adminScope.Server()

app := m.NewApp(
    m.WithServer(publicServer, adminServer),
    m.WithCloser(publicScope.Log(), adminScope.Log()),
)
```

两个 Server 可以使用不同地址、日志和数据源；任意一个 Server 退出都会触发整个 App 的关闭流程。如果它们必须独立部署、扩缩容或故障隔离，拆成不同进程通常更合适。

## 隔离范围

| 状态 | 显式 Scope 是否隔离 | 说明 |
| --- | --- | --- |
| `mcfg.Config` | 是 | 创建 Scope 时显式传入 |
| Server、DB、Redis、Logger 实例 | 是 | 每个 Scope 有独立容器 |
| 同一 Scope 的具名实例 | 复用 | 名称相同即返回同一对象 |
| `mcfg` 加载 Hook | 否 | Hook 是进程级注册表 |
| `mcache` 包级默认缓存 | 否 | 不属于 `m/mins` Scope |
| OpenTelemetry 全局 Provider | 否 | 属于进程级全局状态 |

Scope 不等于完整的进程沙箱。需要隔离 Hook、包级缓存、环境变量或 OpenTelemetry Provider 时，应在测试中显式清理，或使用独立进程。

## 生命周期归属

Scope 负责创建和复用实例，不会自动关闭资源：

- Server 通过 `m.WithServer` 注册；
- DB、Redis、Logger 等 `io.Closer` 通过 `m.WithCloser` 注册；
- 需要 Context 的资源通过 `m.WithShutdownHook` 注册。

完整关闭顺序见[应用生命周期](../guide/lifecycle)。

## 如何选择

- 单应用业务代码：使用包级 `m.*` 门面。
- 同一应用的多个数据源或日志用途：使用具名实例。
- 单元测试、同进程多应用：使用显式 Scope。
- 可复用库：接收所需接口或具体实例，不要隐式依赖任一 Scope。
