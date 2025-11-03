# 并发控制 (msync)

`msync` 是 Maltose 框架提供的并发控制工具包，位于 `util/msync`，为高并发场景提供了一系列实用的并发控制原语。

## 特性

- **SingleFlight**：防止缓存击穿，请求合并
- **LockedCalls**：按 Key 串行化执行
- **Limit**：并发数限制
- **Pool**：高级对象池

## 安装

```bash
go get github.com/graingo/maltose
```

## 快速上手

### SingleFlight - 防止缓存击穿

```go
package main

import (
    "fmt"
    "github.com/graingo/maltose/util/msync"
)

func main() {
    sf := msync.NewSingleFlight()

    // 多个并发请求会共享一次执行结果
    result, err := sf.Do("cache-key", func() (any, error) {
        // 查询数据库
        return queryDatabase()
    })
}
```

### LockedCalls - 串行化执行

```go
func main() {
    lc := msync.NewLockedCalls()

    // 同一用户的操作串行执行
    _, err := lc.Do("user-123", func() (any, error) {
        return updateUserBalance(amount)
    })
}
```

### Limit - 并发限制

```go
func main() {
    limit := msync.NewLimit(10) // 最多 10 个并发

    limit.Borrow()
    defer limit.Return()
    // 执行操作
}
```

### Pool - 对象池

```go
func main() {
    pool := msync.NewPool(
        50, // 容量
        func() any { return createConnection() }, // 创建函数
        func(x any) { x.(*Connection).Close() }, // 销毁函数
        msync.WithMaxAge(5*time.Minute), // 5分钟过期
    )

    conn := pool.Get()
    defer pool.Put(conn)
    // 使用连接
}
```

---

## SingleFlight - 防止缓存击穿

### 概述

SingleFlight 模式用于防止多个并发请求同时访问同一资源导致的"缓存击穿"问题。当多个请求访问相同的 key 时，只有第一个请求会真正执行，其他请求等待并共享第一个请求的结果。

**工作原理：**

```
请求A ---> 执行 fn() --------> 返回 result_A
请求B ---> 等待 ------------> 返回 result_A (共享)
请求C ---> 等待 ------------> 返回 result_A (共享)
```

### 使用场景

1. **防止缓存击穿**
   - 热点数据查询
   - 缓存过期时的并发访问

2. **API 请求合并**
   - 相同参数的 API 调用
   - 第三方服务查询

3. **计算密集型操作**
   - 复杂统计查询
   - 数据聚合计算

### 示例代码

#### 基础用法

```go
package main

import (
    "context"
    "fmt"
    "time"
    "github.com/graingo/maltose/util/msync"
)

type UserService struct {
    sf *msync.SingleFlight
    db *Database
    cache *Cache
}

func NewUserService(db *Database, cache *Cache) *UserService {
    return &UserService{
        sf:    msync.NewSingleFlight(),
        db:    db,
        cache: cache,
    }
}

func (s *UserService) GetUser(ctx context.Context, userID string) (*User, error) {
    // 1. 先查缓存
    if user, err := s.cache.Get(ctx, userID); err == nil {
        return user, nil
    }

    // 2. 缓存未命中，使用 SingleFlight 查询数据库
    // 即使有 1000 个并发请求，也只会查询数据库 1 次
    val, err := s.sf.Do(userID, func() (any, error) {
        user, err := s.db.QueryUser(ctx, userID)
        if err != nil {
            return nil, err
        }

        // 写入缓存
        s.cache.Set(ctx, userID, user, 5*time.Minute)
        return user, nil
    })

    if err != nil {
        return nil, err
    }

    return val.(*User), nil
}
```

#### 区分新鲜结果和共享结果

使用 `DoEx` 方法可以知道结果是新执行的还是共享的：

```go
func (s *UserService) GetUserEx(ctx context.Context, userID string) (*User, error) {
    val, fresh, err := s.sf.DoEx(userID, func() (any, error) {
        return s.db.QueryUser(ctx, userID)
    })

    if fresh {
        fmt.Printf("从数据库查询用户: %s\n", userID)
    } else {
        fmt.Printf("共享其他请求的结果: %s\n", userID)
    }

    if err != nil {
        return nil, err
    }

    return val.(*User), nil
}
```

#### API 请求合并

```go
type WeatherService struct {
    sf *msync.SingleFlight
    client *http.Client
}

func (s *WeatherService) GetWeather(ctx context.Context, city string) (*Weather, error) {
    // 同一个城市的天气查询，多个请求共享一次 API 调用
    val, err := s.sf.Do(city, func() (any, error) {
        resp, err := s.client.Get("https://api.weather.com/v1/" + city)
        if err != nil {
            return nil, err
        }
        defer resp.Body.Close()

        var weather Weather
        if err := json.NewDecoder(resp.Body).Decode(&weather); err != nil {
            return nil, err
        }

        return &weather, nil
    })

    if err != nil {
        return nil, err
    }

    return val.(*Weather), nil
}
```

### API 参考

```go
// NewSingleFlight 创建新实例
func NewSingleFlight() *SingleFlight

// Do 执行函数，相同 key 的请求会共享结果
func (sf *SingleFlight) Do(key string, fn func() (any, error)) (any, error)

// DoEx 执行函数，并返回是否为新鲜结果
func (sf *SingleFlight) DoEx(key string, fn func() (any, error)) (val any, fresh bool, err error)
```

### 性能对比

```
场景：100 个并发请求查询同一个用户

不使用 SingleFlight：
- 数据库查询次数：100 次
- 响应时间：~500ms
- 数据库压力：高

使用 SingleFlight：
- 数据库查询次数：1 次
- 响应时间：~50ms (第一个请求) + ~5ms (其他请求)
- 数据库压力：低
- 性能提升：10 倍+
```

### 注意事项

#### ✅ 适用场景

- 查询数据库/缓存
- 调用外部 API
- 计算密集型操作
- 短时间内可能有大量重复请求

#### ❌ 不适用场景

- **写操作**：每个写操作都需要独立执行
- **长时间执行的操作**：如果函数执行超过 5 秒，后续请求会等待很久
- **需要独立 Context 的操作**：等待的协程无法提前取消

#### ⚠️ 重要提示

1. **错误会被共享**：如果第一个请求失败，所有等待的请求都会收到同样的错误
2. **类型断言**：返回值是 `any` 类型，需要手动类型断言
3. **无法取消**：等待中的请求无法通过 Context 取消

---

## LockedCalls - 串行化执行

### 概述

LockedCalls 确保同一 key 的操作按顺序串行执行，每个请求独立执行并返回各自的结果。与 SingleFlight 不同，LockedCalls 不会共享结果。

**工作原理：**

```
请求A ---> 执行 fn() --------> 返回 result_A
请求B ---> 等待 ---> 执行 fn() ---> 返回 result_B (独立)
请求C ---> 等待 --------> 执行 fn() -> 返回 result_C (独立)
```

### 与 SingleFlight 的区别

| 特性 | SingleFlight | LockedCalls |
|------|-------------|------------|
| 执行次数 | 只执行一次 | 每个请求都执行 |
| 结果 | 共享第一个请求的结果 | 各自独立的结果 |
| 使用场景 | 读操作 | 写操作 |
| 性能 | 更高（减少执行次数） | 较低（保证顺序） |

### 使用场景

1. **写操作串行化**
   - 账户余额更新
   - 订单状态修改
   - 库存扣减

2. **需要顺序保证的操作**
   - 文件写入
   - 日志追加
   - 配置更新

3. **资源锁定**
   - 同一资源的操作互斥
   - 防止并发修改

### 示例代码

#### 账户余额更新

```go
package main

import (
    "context"
    "github.com/graingo/maltose/util/msync"
)

type AccountService struct {
    lc *msync.LockedCalls
    db *Database
}

func NewAccountService(db *Database) *AccountService {
    return &AccountService{
        lc: msync.NewLockedCalls(),
        db: db,
    }
}

// 同一用户的充值操作必须串行执行
func (s *AccountService) Recharge(ctx context.Context, userID string, amount int64) error {
    _, err := s.lc.Do(userID, func() (any, error) {
        // 1. 查询当前余额
        balance, err := s.db.GetBalance(ctx, userID)
        if err != nil {
            return nil, err
        }

        // 2. 更新余额
        newBalance := balance + amount
        if err := s.db.UpdateBalance(ctx, userID, newBalance); err != nil {
            return nil, err
        }

        // 3. 记录日志
        if err := s.db.LogRecharge(ctx, userID, amount); err != nil {
            return nil, err
        }

        return newBalance, nil
    })

    return err
}
```

**为什么不能用 SingleFlight？**

```
用户 A 发起充值 100 元（请求1）
用户 A 发起充值 200 元（请求2，几乎同时）

使用 SingleFlight：
- 请求1 执行，充值 100 元
- 请求2 等待，共享请求1 的结果
- 结果：只充值了 100 元！请求2 的 200 元丢失了！❌

使用 LockedCalls：
- 请求1 执行，充值 100 元
- 请求2 等待请求1 完成后，独立执行，充值 200 元
- 结果：正确充值了 300 元 ✅
```

#### 文件操作互斥

```go
type FileService struct {
    lc *msync.LockedCalls
}

func (s *FileService) AppendToFile(filename string, content string) error {
    _, err := s.lc.Do(filename, func() (any, error) {
        // 同一文件的多个写操作串行化
        f, err := os.OpenFile(filename, os.O_APPEND|os.O_WRONLY|os.O_CREATE, 0644)
        if err != nil {
            return nil, err
        }
        defer f.Close()

        _, err = f.WriteString(content + "\n")
        return nil, err
    })

    return err
}
```

#### 分布式锁的本地实现

```go
type DistributedLock struct {
    lc    *msync.LockedCalls
    redis *redis.Client
}

func (dl *DistributedLock) WithLock(key string, fn func() error) error {
    // 1. 本地锁：防止同一进程内的并发
    _, err := dl.lc.Do(key, func() (any, error) {
        // 2. 分布式锁：防止不同进程间的并发
        lockKey := "lock:" + key
        locked, err := dl.redis.SetNX(context.Background(), lockKey, "1", 10*time.Second).Result()
        if err != nil {
            return nil, err
        }
        if !locked {
            return nil, errors.New("获取分布式锁失败")
        }
        defer dl.redis.Del(context.Background(), lockKey)

        // 3. 执行业务逻辑
        return nil, fn()
    })

    return err
}
```

### API 参考

```go
// NewLockedCalls 创建新实例
func NewLockedCalls() *LockedCalls

// Do 执行函数，同一 key 的请求串行执行
func (lc *LockedCalls) Do(key string, fn func() (any, error)) (any, error)
```

### 性能对比

```
测试：1000 个并发请求，操作 100 个不同的 key，每个操作耗时 10ms

方案1：使用全局锁
- 总耗时：10,000ms (完全串行)
- QPS：100

方案2：使用 LockedCalls
- 总耗时：100ms (100 个 key 并行执行，每个 key 内部串行)
- QPS：10,000
- 性能提升：100 倍 ✅
```

### 注意事项

- ✅ **适用于写操作**：每个写操作都需要执行
- ✅ **保证顺序**：同一 key 的操作按到达顺序执行
- ❌ **不适合高频操作**：会阻塞后续请求
- ⚠️ **错误独立**：每个请求的错误独立返回

---

## Limit - 并发数限制

### 概述

Limit 是基于 channel 的信号量实现，用于控制同时执行的任务数量，防止资源耗尽。

### 使用场景

1. **限制并发请求数**
   - HTTP 客户端请求限流
   - 数据库连接数控制

2. **资源保护**
   - CPU 密集型任务限制
   - 内存占用控制

3. **流量控制**
   - 防止过载
   - 平滑负载

### 示例代码

#### 限制并发请求数

```go
package main

import (
    "io"
    "net/http"
    "sync"
    "github.com/graingo/maltose/util/msync"
)

type APIClient struct {
    client *http.Client
    limit  *msync.Limit
}

func NewAPIClient(maxConcurrent int) *APIClient {
    return &APIClient{
        client: &http.Client{Timeout: 10 * time.Second},
        limit:  msync.NewLimit(maxConcurrent),
    }
}

func (c *APIClient) BatchRequest(urls []string) []Result {
    results := make([]Result, len(urls))
    var wg sync.WaitGroup
    wg.Add(len(urls))

    for i, url := range urls {
        go func(index int, u string) {
            defer wg.Done()

            // 1. 获取许可（如果超过限制，会在此阻塞）
            c.limit.Borrow()
            defer c.limit.Return()

            // 2. 发起请求
            resp, err := c.client.Get(u)
            if err != nil {
                results[index] = Result{Error: err}
                return
            }
            defer resp.Body.Close()

            // 3. 处理响应
            body, _ := io.ReadAll(resp.Body)
            results[index] = Result{Data: body}
        }(i, url)
    }

    wg.Wait()
    return results
}

// 使用
func main() {
    client := NewAPIClient(10) // 最多 10 个并发请求
    urls := make([]string, 100) // 100 个 URL
    results := client.BatchRequest(urls) // 实际会分 10 批执行
}
```

#### 非阻塞式流量控制

```go
func RateLimitedHandler(limit *msync.Limit) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // 尝试获取许可，不阻塞
        if !limit.TryBorrow() {
            http.Error(w, "Too many concurrent requests", http.StatusTooManyRequests)
            return
        }
        defer limit.Return()

        // 处理请求
        // ...
    }
}
```

#### 数据库批量操作限流

```go
type BatchInserter struct {
    db    *sql.DB
    limit *msync.Limit
}

func NewBatchInserter(db *sql.DB, maxConcurrent int) *BatchInserter {
    return &BatchInserter{
        db:    db,
        limit: msync.NewLimit(maxConcurrent),
    }
}

func (bi *BatchInserter) InsertUsers(users []User) []error {
    errors := make([]error, len(users))
    var wg sync.WaitGroup
    wg.Add(len(users))

    for i, user := range users {
        go func(index int, u User) {
            defer wg.Done()

            bi.limit.Borrow()
            defer bi.limit.Return()

            _, err := bi.db.Exec(
                "INSERT INTO users (name, email) VALUES (?, ?)",
                u.Name, u.Email,
            )
            errors[index] = err
        }(i, user)
    }

    wg.Wait()
    return errors
}
```

### API 参考

```go
// NewLimit 创建新实例，n 为最大并发数
func NewLimit(n int) *Limit

// Borrow 获取许可（阻塞式）
func (l *Limit) Borrow()

// TryBorrow 尝试获取许可（非阻塞式）
func (l *Limit) TryBorrow() bool

// Return 归还许可
func (l *Limit) Return() error
```

### 使用模式

```go
// 模式1：阻塞式（推荐用于批处理）
limit.Borrow()
defer limit.Return()
// 执行操作

// 模式2：非阻塞式（推荐用于 Web 请求）
if limit.TryBorrow() {
    defer limit.Return()
    // 执行操作
} else {
    // 拒绝请求
}
```

### 注意事项

- ✅ **简单高效**：基于 channel，性能优秀
- ✅ **使用 defer**：确保 Return 被调用
- ❌ **只控制数量**：不控制速率（如需速率限制，使用 `rate.Limiter`）
- ⚠️ **避免死锁**：Borrow 和 Return 必须成对出现

---

## Pool - 对象池

### 概述

Pool 是一个高级对象池，支持容量限制、对象过期和自定义生命周期管理。与 `sync.Pool` 不同，它不会被 GC 清空，且功能更强大。

### 与 sync.Pool 的区别

| 特性 | sync.Pool | msync.Pool |
|------|-----------|-----------|
| 容量限制 | 无限制 | 可设置最大容量 |
| 对象过期 | 不支持 | 支持最大空闲时间 |
| 自定义销毁 | 不支持 | 支持 destroy 回调 |
| 阻塞获取 | 不支持 | 支持阻塞等待 |
| GC 行为 | 会被 GC 清空 | 不会被 GC 清空 |

### 使用场景

1. **连接池**
   - 数据库连接
   - Redis 连接
   - HTTP 连接

2. **对象池**
   - 大对象复用
   - Buffer 池
   - 协议对象池

3. **资源管理**
   - 需要限制总数
   - 需要定期清理
   - 需要自定义销毁逻辑

### 示例代码

#### 数据库连接池

```go
package main

import (
    "database/sql"
    "time"
    "github.com/graingo/maltose/util/msync"
)

type DBPool struct {
    pool *msync.Pool
}

func NewDBPool(maxConns int, connStr string) *DBPool {
    return &DBPool{
        pool: msync.NewPool(
            maxConns,
            // 创建连接
            func() any {
                conn, err := sql.Open("mysql", connStr)
                if err != nil {
                    return nil
                }
                return conn
            },
            // 销毁连接
            func(x any) {
                if conn, ok := x.(*sql.DB); ok {
                    conn.Close()
                }
            },
            // 设置连接最大空闲时间为 5 分钟
            msync.WithMaxAge(5*time.Minute),
        ),
    }
}

func (p *DBPool) Exec(query string, args ...any) error {
    conn := p.pool.Get().(*sql.DB)
    defer p.pool.Put(conn)

    _, err := conn.Exec(query, args...)
    return err
}

func (p *DBPool) Query(query string, args ...any) (*sql.Rows, error) {
    conn := p.pool.Get().(*sql.DB)
    // 注意：需要在外部处理归还逻辑
    return conn.Query(query, args...)
}

// 使用 Use 方法封装获取和归还
func (p *DBPool) Use(fn func(*sql.DB) error) error {
    conn := p.pool.Get().(*sql.DB)
    defer p.pool.Put(conn)
    return fn(conn)
}

// 使用示例
func main() {
    pool := NewDBPool(20, "user:pass@tcp(127.0.0.1:3306)/db")

    err := pool.Use(func(conn *sql.DB) error {
        return conn.QueryRow("SELECT * FROM users WHERE id = ?", 123).Scan(&user)
    })
}
```

#### Buffer 池（减少 GC 压力）

```go
type BufferPool struct {
    pool *msync.Pool
}

func NewBufferPool(maxBuffers int, bufferSize int) *BufferPool {
    return &BufferPool{
        pool: msync.NewPool(
            maxBuffers,
            func() any {
                return &bytes.Buffer{}
            },
            func(x any) {
                // 销毁时清空 buffer
                if buf, ok := x.(*bytes.Buffer); ok {
                    buf.Reset()
                }
            },
            msync.WithMaxAge(1*time.Minute),
        ),
    }
}

func (bp *BufferPool) Get() *bytes.Buffer {
    return bp.pool.Get().(*bytes.Buffer)
}

func (bp *BufferPool) Put(buf *bytes.Buffer) {
    buf.Reset() // 清空后再归还
    bp.pool.Put(buf)
}

// 使用
func processData(data []byte, pool *BufferPool) []byte {
    buf := pool.Get()
    defer pool.Put(buf)

    buf.Write(data)
    // 处理数据...
    return buf.Bytes()
}
```

#### HTTP 客户端池

```go
type HTTPClientPool struct {
    pool *msync.Pool
}

func NewHTTPClientPool(maxClients int) *HTTPClientPool {
    return &HTTPClientPool{
        pool: msync.NewPool(
            maxClients,
            func() any {
                return &http.Client{
                    Timeout: 30 * time.Second,
                    Transport: &http.Transport{
                        MaxIdleConnsPerHost: 100,
                    },
                }
            },
            func(x any) {
                if client, ok := x.(*http.Client); ok {
                    client.CloseIdleConnections()
                }
            },
            msync.WithMaxAge(10*time.Minute),
        ),
    }
}

func (p *HTTPClientPool) Get(url string) (*http.Response, error) {
    client := p.pool.Get().(*http.Client)
    defer p.pool.Put(client)
    return client.Get(url)
}
```

### API 参考

```go
// NewPool 创建新对象池
func NewPool(
    limit int,                // 最大对象数
    create func() any,        // 创建函数
    destroy func(any),        // 销毁函数
    opts ...PoolOption,       // 可选配置
) *Pool

// WithMaxAge 设置最大空闲时间
func WithMaxAge(d time.Duration) PoolOption

// Get 获取对象（可能阻塞）
func (p *Pool) Get() any

// Put 归还对象
func (p *Pool) Put(x any)

// Size 返回当前对象总数
func (p *Pool) Size() int

// Available 返回空闲对象数
func (p *Pool) Available() int

// Clear 清空所有空闲对象
func (p *Pool) Clear()
```

### 配置最佳实践

#### 1. 合理设置容量

```go
// ❌ 容量设置过小
pool := msync.NewPool(10, create, destroy)
// 高并发时，大量协程阻塞等待

// ❌ 容量设置过大
pool := msync.NewPool(10000, create, destroy)
// 内存占用过高，对象利用率低

// ✅ 根据实际负载设置
// 公式：容量 = 并发请求数 × 平均处理时间 / 单次操作时间
// 例如：100 QPS，平均处理 0.1 秒，则需要 100 × 0.1 = 10 个对象
pool := msync.NewPool(20, create, destroy) // 留 20% 余量
```

#### 2. 设置合理的过期时间

```go
// 数据库连接：5-10 分钟
dbPool := msync.NewPool(50, createConn, closeConn,
    msync.WithMaxAge(5*time.Minute))

// HTTP 客户端：10-30 分钟
httpPool := msync.NewPool(100, createClient, closeClient,
    msync.WithMaxAge(10*time.Minute))

// 临时对象：1-2 分钟
tempPool := msync.NewPool(1000, create, destroy,
    msync.WithMaxAge(1*time.Minute))
```

#### 3. 使用 defer 确保归还

```go
// ✅ 推荐模式
func useResource() error {
    resource := pool.Get()
    defer pool.Put(resource)
    return doWork(resource)
}

// ❌ 容易忘记归还
func useResource() error {
    resource := pool.Get()
    err := doWork(resource)
    pool.Put(resource) // 如果 doWork panic，不会执行
    return err
}
```

### 性能对比

```
测试：1000 次创建 1MB 缓冲区

不使用对象池：
- 内存分配：1000 × 1MB = 1GB
- GC 次数：~50 次
- 总耗时：~500ms

使用 msync.Pool（容量 100）：
- 内存分配：100 × 1MB = 100MB
- GC 次数：~5 次
- 总耗时：~50ms
- 性能提升：10 倍，内存占用降低 90% ✅
```

### 注意事项

- ✅ **线程安全**：所有方法都是线程安全的
- ✅ **自动管理**：自动创建、销毁和过期检查
- ❌ **类型断言**：Get 返回 `any`，需要类型断言
- ⚠️ **Put nil**：Put(nil) 会被忽略
- ⚠️ **阻塞行为**：池满时 Get 会阻塞

---

## 最佳实践

### 1. 选择合适的组件

| 场景 | 推荐组件 | 原因 |
|------|---------|------|
| 查询缓存 | SingleFlight | 避免重复查询 |
| 更新账户 | LockedCalls | 保证顺序，独立结果 |
| 批量请求 | Limit | 控制并发数 |
| 连接管理 | Pool | 复用连接，限制总数 |

### 2. 组合使用

不同组件可以组合使用，发挥更大作用：

```go
type UserService struct {
    sf    *msync.SingleFlight  // 防止缓存击穿
    lc    *msync.LockedCalls   // 写操作串行化
    limit *msync.Limit         // 限制并发
    pool  *msync.Pool          // 连接池
}

// 查询用户（读操作）
func (s *UserService) GetUser(ctx context.Context, userID string) (*User, error) {
    // 使用 SingleFlight 防止缓存击穿
    val, err := s.sf.Do(userID, func() (any, error) {
        // 使用 Limit 控制数据库查询并发
        s.limit.Borrow()
        defer s.limit.Return()

        // 使用 Pool 获取数据库连接
        conn := s.pool.Get().(*sql.DB)
        defer s.pool.Put(conn)

        return conn.QueryUser(ctx, userID)
    })

    return val.(*User), err
}

// 更新余额（写操作）
func (s *UserService) UpdateBalance(ctx context.Context, userID string, amount int64) error {
    // 使用 LockedCalls 确保同一用户的操作串行
    _, err := s.lc.Do(userID, func() (any, error) {
        conn := s.pool.Get().(*sql.DB)
        defer s.pool.Put(conn)

        return nil, conn.UpdateBalance(ctx, userID, amount)
    })

    return err
}
```

### 3. 错误处理

```go
// ✅ 正确处理错误
val, err := sf.Do(key, func() (any, error) {
    data, err := queryDB(key)
    if err != nil {
        // 记录日志
        log.Printf("查询失败: %v", err)
        return nil, err
    }
    return data, nil
})

if err != nil {
    // 处理错误
    return nil, fmt.Errorf("获取数据失败: %w", err)
}
```

### 4. 监控和可观测性

```go
type MonitoredSingleFlight struct {
    sf        *msync.SingleFlight
    hitCount  *prometheus.CounterVec   // 命中次数
    missCount *prometheus.CounterVec   // 未命中次数
}

func (m *MonitoredSingleFlight) Do(key string, fn func() (any, error)) (any, error) {
    val, fresh, err := m.sf.DoEx(key, fn)

    if fresh {
        m.missCount.WithLabelValues(key).Inc()
    } else {
        m.hitCount.WithLabelValues(key).Inc()
    }

    return val, err
}
```

---

## 常见问题

### Q1: SingleFlight 和 LockedCalls 有什么区别？

**A:** 核心区别在于结果是否共享：

- **SingleFlight**：多个请求共享一次执行的结果，适合读操作
- **LockedCalls**：每个请求独立执行并返回各自结果，适合写操作

### Q2: Limit 和 rate.Limiter 有什么区别？

**A:**

- **Limit**：控制并发数量（同时执行的任务数）
- **rate.Limiter**：控制请求速率（每秒多少个请求）
- 可以组合使用以实现更精细的控制

### Q3: Pool 什么时候会阻塞？

**A:** 当池中没有空闲对象且已达到容量上限时，Get() 方法会阻塞，直到有对象被 Put 回来。

### Q4: 如何选择 Pool 的容量？

**A:** 使用公式：`容量 = 并发请求数 × 平均处理时间 / 单次操作时间`

例如：
- 100 QPS
- 平均处理时间 0.1 秒
- 容量 = 100 × 0.1 = 10 个对象（建议增加 20% 余量 = 12 个）

### Q5: 过期的对象什么时候被销毁？

**A:** Pool 中过期的对象在下次 Get() 时被检查并销毁，不是定时清理。

### Q6: 可以在 HTTP Handler 中使用这些组件吗？

**A:** 可以，但需要注意：

- **SingleFlight**：适合，可防止相同请求的重复处理
- **LockedCalls**：谨慎使用，可能导致请求阻塞时间过长
- **Limit**：推荐使用 TryBorrow() 非阻塞模式
- **Pool**：适合，用于连接池等资源管理

---

## 相关链接

- [Maltose 文档](https://graingo.github.io/maltose-docs/)
- [GitHub 仓库](https://github.com/graingo/maltose)
- [示例代码](https://github.com/graingo/maltose/tree/master/util/msync)

---

**返回 [组件总览](/components/)**
