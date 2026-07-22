# 并发控制

`msync` 是 Maltose 提供的进程内并发控制工具包，包含同键请求合并、同键串行化、并发数限制和对象池。

```go
import "github.com/graingo/maltose/util/msync"
```

## SingleFlight：合并同键请求

同一个 key 的并发调用只执行一次函数，其余调用共享结果，适合防止缓存击穿。

```go
sf := msync.NewSingleFlight()

value, err := sf.Do("user:42", func() (any, error) {
	return loadUser(42)
})

value, fresh, err := sf.DoEx("user:42", func() (any, error) {
	return loadUser(42)
})
// fresh 表示当前调用是否真正执行了函数。
```

## LockedCalls：同键串行执行

与 `SingleFlight` 不同，每个调用都会执行；相同 key 的调用按顺序运行，不同 key 可并行运行。

```go
calls := msync.NewLockedCalls()

value, err := calls.Do("account:42", func() (any, error) {
	return updateBalance(42)
})
```

## Limit：限制并发数

```go
limit := msync.NewLimit(10)
limit.Borrow() // 已满时阻塞
defer func() {
	if err := limit.Return(); err != nil {
		panic(err)
	}
}()

// 执行业务操作
```

无需等待时可使用 `TryBorrow`：

```go
if !limit.TryBorrow() {
	return errors.New("系统繁忙")
}
defer limit.Return()
```

`Borrow`/`TryBorrow` 成功后必须与一次 `Return` 配对；多余的 `Return` 会返回 `msync.ErrLimitReturn`。

## Pool：复用对象

```go
pool := msync.NewPool(
	50,
	func() any { return new(bytes.Buffer) },
	func(value any) { value.(*bytes.Buffer).Reset() },
	msync.WithMaxAge(5*time.Minute),
)

buffer := pool.Get().(*bytes.Buffer)
defer pool.Put(buffer)

buffer.WriteString("hello")
```

当池已达到容量且没有空闲对象时，`Get` 会等待；`Put` 归还对象。还可通过 `Size`、`Available` 查看状态，通过 `Clear` 销毁空闲对象。

## 选择建议

- `SingleFlight`：多个调用可以共享同一个结果。
- `LockedCalls`：每个调用都必须执行，但同键不能并行。
- `Limit`：限制当前进程内的并发操作数量。
- `Pool`：复用创建成本较高的对象。

这些工具均为进程内机制。跨实例限流或分布式锁应使用网关、Redis 等外部协调组件。
