# Hook 与缓存

配置 Hook 在 Adapter 返回完整数据后执行，用于对配置进行进程级的统一转换。它适合补充默认值、解密字段和执行跨字段校验，不负责创建配置中心客户端。

## 注册 Hook

```go
mcfg.RegisterAfterLoadHook(func(
    _ context.Context,
    data map[string]any,
) (map[string]any, error) {
    if _, exists := data["environment"]; !exists {
        data["environment"] = "production"
    }
    return data, nil
})
```

支持三种注册值：

- `mcfg.ConfigHookFunc`；
- 相同签名的普通函数；
- 实现 `mcfg.StatefulHook` 的对象。

Hook 按注册顺序执行，应在任何 Config 首次读取前完成注册。传入不支持的类型会立即 panic。

## 进程级作用域

Hook 注册表属于进程全局状态，会作用于该进程内所有 `mcfg.Config`，包括默认配置、具名配置和显式 Scope 使用的配置。

因此 Hook 必须能够安全处理不同配置结构：

```go
mcfg.RegisterAfterLoadHook(func(
    _ context.Context,
    data map[string]any,
) (map[string]any, error) {
    serverNode, exists := data["server"]
    if !exists {
        return data, nil
    }
    if _, ok := serverNode.(map[string]any); !ok {
        return nil, fmt.Errorf("server configuration must be an object")
    }
    return data, nil
})
```

只针对单个配置源的转换更适合放进自定义 Adapter，避免影响无关 Config。

## 缓存规则

`mcfg.Config` 的缓存行为取决于是否存在 Hook：

| 状态 | `Data()` 行为 |
| --- | --- |
| 没有 Hook | 每次读取 Adapter，并返回深拷贝 |
| 存在 Hook | 首次读取 Adapter 并执行 Hook，随后返回处理结果的深拷贝 |
| 调用 `ClearCache` | 清除处理结果，下次读取重新执行 Adapter 和 Hook |
| 调用 `SetAdapter` | 替换 Adapter，同时清除处理结果 |

返回深拷贝意味着调用方修改 `Data()` 的结果不会污染 Config 内部状态。

## 配置更新后刷新

```go
cfg.ClearCache(ctx)
```

`ClearCache` 只清除 `mcfg.Config` 保存的 Hook 处理结果：

- 不会让 `AdapterFile` 自动重读磁盘；应先调用 `AdapterFile.SetFile`；
- 不会主动请求远程配置；是否请求由 Adapter 决定；
- 不会重建已经创建的 Server、DB、Redis 或 Logger。

远程 Watch 与 Hook 同时使用时，应在 Adapter 完成有效更新后清理缓存。具体限制见[Apollo 与 Nacos](./remote-configuration)。

## StatefulHook

需要在多次调用或多个 Config 之间保存状态时实现 `StatefulHook`：

```go
type decryptHook struct {
    key []byte
}

func (h *decryptHook) Hook(
    _ context.Context,
    data map[string]any,
) (map[string]any, error) {
    encrypted, ok := data["database_password_encrypted"].(string)
    if !ok || encrypted == "" {
        return data, nil
    }

    password, err := decrypt(h.key, encrypted)
    if err != nil {
        return nil, err
    }
    data["database_password"] = password
    return data, nil
}
```

StatefulHook 自行负责内部并发安全。框架会缓存每个 Config 的处理结果，但同一个 StatefulHook 仍可能被不同 Config 调用。

## 测试隔离

`mcfg.ClearHooks()` 用于测试结束时清理进程级注册：

```go
func TestConfigHook(t *testing.T) {
    mcfg.ClearHooks()
    t.Cleanup(mcfg.ClearHooks)

    // 注册 Hook 并创建本测试专用 Config。
}
```

`ClearHooks` 不会清理已存在 Config 的处理结果。复用同一个 Config 时还需要调用 `cfg.ClearCache(ctx)`；更简单的做法是每个测试创建新的 `mcfg.Config`。

## Hook 还是 Adapter？

| 需求 | 选择 |
| --- | --- |
| 所有配置统一补默认值或校验 | Hook |
| 单个配置源的解析、拉取或监听 | Adapter |
| 远程配置中心客户端 | Adapter |
| 只影响一个应用 Scope 的转换 | 自定义 Adapter |
| 进程统一解密或合规校验 | Hook |

Hook 应保持确定性：相同输入产生相同输出，错误包含明确路径，不在内部启动不可控的后台任务。
