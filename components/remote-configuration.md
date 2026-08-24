# Apollo 与 Nacos

Maltose 通过 `mcfg.Adapter` 接入远程配置中心。Apollo 和 Nacos Adapter 负责连接远端、解析配置并维护本地内存值，应用继续使用统一的 `mcfg.Config` 读取接口。

## 启动配置与业务配置分离

连接地址、命名空间和鉴权 Secret 属于启动配置，应来自环境变量、Secret 或独立的本地文件。不要把连接远程配置中心所需的信息只存放在该配置中心内，否则应用无法完成首次连接。

远程文档的根节点必须是对象：

```yaml
server:
  address: ":8080"
database:
  default:
    type: mysql
```

数组、字符串等根节点无法转换成 `map[string]any`，Adapter 会返回错误。

## Apollo

安装模块：

```bash
go get github.com/graingo/maltose/contrib/config/apollo
```

创建配置实例：

```go
ctx := context.Background()

adapter, err := apollo.New(ctx, apollo.Config{
    AppID:         "checkout-api",
    IP:            os.Getenv("APOLLO_ENDPOINT"),
    Cluster:       "default",
    NamespaceName: "application",
    Secret:        os.Getenv("APOLLO_SECRET"),
    MustStart:     true,
    Watch:         true,
})
if err != nil {
    return err
}

cfg := mcfg.NewWithAdapter(adapter)
address, err := cfg.String(ctx, "server.address")
if err != nil {
    return err
}
```

- `MustStart` 适合生产启动阶段：首次连接失败会直接返回错误。
- `Watch` 开启后，Apollo 变更会更新 Adapter 的内存值。
- 未注册进程级配置 Hook 时，后续读取会直接看到最新内存值。

## Nacos

安装模块：

```bash
go get github.com/graingo/maltose/contrib/config/nacos
```

创建配置实例：

```go
ctx := context.Background()

adapter, err := nacos.New(ctx, nacos.Config{
    ServerConfigs: []constant.ServerConfig{
        {
            IpAddr: os.Getenv("NACOS_HOST"),
            Port:   8848,
        },
    },
    ClientConfig: constant.ClientConfig{
        NamespaceId: os.Getenv("NACOS_NAMESPACE"),
        Username:    os.Getenv("NACOS_USERNAME"),
        Password:    os.Getenv("NACOS_PASSWORD"),
        CacheDir:    "/tmp/nacos/cache",
        LogDir:      "/tmp/nacos/log",
    },
    ConfigParam: vo.ConfigParam{
        DataId: "app.yaml",
        Group:  "DEFAULT_GROUP",
        Type:   "yaml",
    },
    Watch: true,
})
if err != nil {
    return err
}

cfg := mcfg.NewWithAdapter(adapter)
address, err := cfg.String(ctx, "server.address")
if err != nil {
    return err
}
```

Nacos 根据 `ConfigParam.Type` 解析远程内容。`Type` 为空时先读取 `DataId` 扩展名，两者都为空时按 JSON 处理。当前支持 JSON 以及 Viper 支持的 YAML、TOML 等格式。

`OnConfigChange` 会在有效的新配置写入内存后异步执行，可用于记录版本、发送应用事件或清理带 Hook 的配置缓存。

## 与 Scope 组合

远程配置可以直接作为显式 Scope 的配置源：

```go
cfg := mcfg.NewWithAdapter(adapter)
scope := m.NewScope(cfg)

server := scope.Server()
db, err := scope.TryDB()
```

这样创建的 Server、DB、Redis 和 Logger 都读取同一份远程配置，但实例仍隔离在该 Scope 内。

组件实例是首次访问时创建的。远程配置更新会改变后续 `cfg` 读取结果，不会自动重建已经创建的 Server、连接池或 Logger；需要动态生效的组件参数应由应用明确设计重载流程。

## Watch、Hook 与缓存

`mcfg.Config` 在没有 Hook 时不会额外缓存 Adapter 数据，因此 Apollo/Nacos 的内存更新可以被后续读取看到。

注册任意进程级 Hook 后，`mcfg.Config` 会缓存 Hook 处理结果。远端更新后必须调用 `cfg.ClearCache(ctx)`，下一次读取才会重新执行 Adapter 和 Hook。Nacos 可以在 `OnConfigChange` 中触发该操作；Apollo Adapter 当前没有应用回调，使用 Watch 时应避免为该 Config 注册进程级 Hook，或由应用控制刷新时机。

完整规则见[Hook 与缓存](./configuration-hooks)。

## 生产检查清单

- 启动时确认 Adapter 创建成功并读取一个关键配置项。
- 远程文档使用对象作为根节点，并在发布前校验格式。
- 连接信息与业务配置分离，Secret 不进入仓库。
- 明确 Watch 只更新配置值，不会自动重建业务组件。
- 为配置变更记录版本、DataID/Namespace 和结果，避免记录 Secret。
- 为配置中心不可用、内容错误和变更回滚准备可观测日志与告警。
