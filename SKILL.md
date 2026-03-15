# C++ 开发技能指南

> 本文档从 C++ 中文周刊（第1期~第196期）中提炼的编码规范、设计模式、性能优化和避坑指南。
> 适用于日常 C++ 开发参考。

---

## 一、现代 C++ 编码规范

### 1.1 优先使用 range-based for 和 Ranges 库

传统 for 循环"过于灵活"，容易引入 off-by-one、修改错误变量等 bug。编译器无法防止这些问题。

```cpp
// ❌ 经典错误
for (auto i = 0; i <= vec.size(); ++i)   // 应该是 <
  use(vec[i]);

for (auto i = vec.size() - 1; i >= 0; --i)  // 无符号数永远 >= 0，死循环！
  use(vec[i]);

// ✅ 现代写法
for (auto const& rec : records)
  use(rec);

// 反向迭代（C++20）
for (auto const& rec : std::views::reverse(records))
  use(rec);

// 带索引迭代（C++23）
for (auto [i, rec] : std::views::enumerate(records))
  use(i, rec);

// 多序列同时迭代（C++23）
for (auto [name, rec] : std::views::zip(names, records))
  use(name, rec);
```

*来源：第190期*

### 1.2 用 `std::source_location` 替代 `__FILE__` / `__LINE__` 宏

```cpp
// ❌ 传统宏方法
#define ASSERT(cond, msg) Assert(cond, msg, __FUNCTION__, __LINE__)

// ✅ C++20
void Assert(bool condition, std::string_view msg,
            std::source_location loc = std::source_location::current()) {
  if (!condition) {
    std::clog << loc.function_name() << ':' << loc.line() << ": " << msg << '\n';
  }
}
// 调用时不需要宏：
Assert(1 != 2, "Not met");
```

关键：`std::source_location::current()` 作为默认参数，在调用侧求值。

*来源：第190期*

### 1.3 `constexpr` + `consteval` 双路径设计

```cpp
consteval size_t strlen_ct(const char* s) {  // 纯编译期
    size_t n = 0;
    for (; s[n] != '\0'; ++n);
    return n;
}

size_t strlen(const char* s);  // 纯运行期

constexpr size_t strlen_dual(const char* s) {  // 双路径
    if consteval {
        return strlen_ct(s);  // 编译期路径
    } else {
        return strlen(s);     // 运行期路径
    }
}
```

`constexpr` 函数最好两种分支都实现，避免意外问题。

*来源：第150期*

### 1.4 用 `std::expected` 替代异常做错误处理（C++23）

```cpp
std::expected<int, std::string> convertToInt(const std::string& input) {
    int value{};
    auto [ptr, ec] = std::from_chars(input.data(), input.data() + input.size(), value);
    if (ec == std::errc())
        return value;
    if (ec == std::errc::invalid_argument)
        return std::unexpected("Invalid number format");
    if (ec == std::errc::result_out_of_range)
        return std::unexpected("Number out of range");
    return std::unexpected("Unknown conversion error");
}
```

*来源：第150期*

### 1.5 Concepts 和 `requires` 的正确用法

```cpp
// 基本 requires
template <typename T>
    requires std::integral<T>
auto debug_output(const T& t);

// requires requires（检测成员函数）
template <typename T>
    requires requires(const T& t) { t.debug_output(); }
auto debug_output(const T& t);

// if constexpr + requires（编译期检测能力）
template <typename Cont, typename Rng>
void cont_assign(Cont& cont, Rng&& rng) {
    cont.clear();
    if constexpr (requires { cont.reserve(std::ranges::size(rng)); }) {
        cont.reserve(std::ranges::size(rng));
    }
    for (auto&& elem : std::forward<Rng>(rng)) {
        cont.push_back(std::forward<decltype(elem)>(elem));
    }
}
```

*来源：第170期*

### 1.6 `deducing this` 消除成员函数重复（C++23）

```cpp
// ❌ 传统写法：4个重载
struct Foo {
    void bar() &;
    void bar() &&;
    void bar() const &;
    void bar() const &&;
};

// ✅ C++23
template <typename T>
class Optional {
    template <typename Self>
    constexpr auto operator->(this Self&& self) {
        return addressof(self.m_value);
    }
};
```

*来源：第50期*

### 1.7 inline namespace 做版本控制

```cpp
namespace gem {
    inline namespace v1 {
        struct Point { int x; int y; };
    }
    namespace v2 {
        struct Point { int y; int x; };  // v2 改了布局
    }
}
// 默认用 v1，需要时显式 gem::v2::Point
```

*来源：第160期*

### 1.8 小对象直接传值，不要 const T&

`string_view`、`span`、`int`、`chrono::duration` 等小对象，直接传值比传引用更高效。

*来源：第50期*

---

## 二、性能优化指南

### 2.1 火焰图驱动优化

RocksDB 优化案例（180s → 7.8s，23倍加速），每步用火焰图验证：

1. **Transaction Put → SST Writer**（180s → 19.5s）：消除锁和排序开销
2. **关掉导入阶段不需要的过滤器和压缩**（19.5s → 14.3s）
3. **fast_float 替换 sscanf**（14.3s → 12s，16%提速）
4. **std::string → vector\<char\>**（12s → 10.6s）：消除 null terminator 维护开销
5. **去掉热路径的运行期检查**（10.6s → 8.7s）
6. **消除 key 的隐藏拷贝**（8.7s → 7.8s）

**Key takeaways：**
- 避免热路径中的虚函数
- 别不必要地拷贝字符串
- 运行期检查能改 assert 就改 assert

*来源：第196期*

### 2.2 编译器比你聪明，不要手动"优化"

编译器将代码转换为 IR，相同操作的不同实现会被转换为规范形式。多种计算加法的方式（循环、递归、复杂逻辑）都会编译为单个 ARM 指令 `add w0, w1, w0`。

常量乘法也一样：手动优化 `522` 为 `(x << 9) + (x << 3) + (x << 1)`，编译器仍然会恢复为 `imul`。

**优先考虑代码清晰性而不牺牲性能。**

*来源：第190期*

### 2.3 `__builtin_unreachable()` 消除分支

```cpp
uint8_t sum_with_constraints(const uint8_t *data, size_t len) {
    if (len % 32 != 0) __builtin_unreachable();  // len 一定是32的倍数
    if (len == 0) __builtin_unreachable();         // len 一定非零
    return std::accumulate(data, data + len, uint8_t(0));
}
```

注意：把 `data*` 换成 `vector`，gcc 下可能不能优化。

*来源：第180期*

### 2.4 TLS 性能优化清单

thread_local 对象在有类构造函数 + `-fPIC` 共享库时需要额外调用 `__tls_get_addr`，成为性能瓶颈。

优化指南：
- TLS 对象尽可能合并
- 不要为 TLS 写构造函数（用 trivial 类型）
- 频繁访问的对象用 `__attribute__((visibility("hidden")))`
- 关键变量用 `__attribute__((tls_model("initial-exec")))`
- 非共享库不要用 `-fPIC`
- 考虑 `-mtls-dialect=gnu2`

*来源：第180期*

### 2.5 `-O3 -flto` 是免费午餐

Redis 测试：`-O3 -flto` 性能至少提升 5%。PGO（Profile-Guided Optimization）值得进一步研究。

*来源：第100期*

### 2.6 低延迟编程：减少分支和跳转

- 勤用 `&&` `||` 利用短路特性
- 关注能生成 `cmov` 的写法（三元表达式、简单 if 赋值）
- 减少虚函数使用（但 `variant` + `visit` 某些场景比虚函数好）
- 善用 `[[gnu::always_inline]]` / `__builtin_expect`
- 字符串比较的 if-else 链改 switch

*来源：第150期*

### 2.7 查表法替代除法/取模

除法指令很慢。整数转字符串（itoa）用查表法替代循环除 10：

```cpp
static constexpr char radix_100_table[] = {
    '0', '0', '0', '1', '0', '2', /* ... */
};
// 每次除100，查表取两位数字，速度翻倍
```

*来源：第50期*

### 2.8 SIMD 更节能

只要你的代码足够快，即使是 SIMD 这种费电的指令，整体能耗反而更少（因为执行时间短得多）。

*来源：第150期*

### 2.9 缓存友好的内存布局（SOA vs AOS）

AOS（Array of Structures）→ SOA（Structure of Arrays）转换可以显著提升缓存命中率，特别是在只访问部分字段时。

*来源：第180期*

### 2.10 循环优化：fission + interleave

- **Loop fission**：拆分包含不同数据依赖的循环，降低数据 buffer 大小使其小于 L1 cacheline 
- **Interleave**：将不同任务交错分发，隐藏指令依赖链的延迟
- 用 [likwid](https://github.com/RRZE-HPC/likwid) 定位内存子系统瓶颈

*来源：第150期*

---

## 三、安全编码与 UB 避免

### 3.1 UB 的 43 条错觉（精选）

编译器的保证列表是空的。一旦有 UB，所有行为都是合规的：

- UB **不只**在 `-O2/-O3` 才触发
- UB 的影响**不局限于** UB 之后的代码 — UB 可以"时间旅行"
- UB **不保证**只是崩溃或死循环
- 相同二进制 + 相同输入重复跑，行为**不一定**一样
- 编译没报错**不代表**没有 UB
- ODR 违规是编译期/链接期 UB

*来源：第196期*

### 3.2 有符号位移陷阱

```cpp
// 64位机器上：
unsigned long set_bit_a(int bit) { return 1 << bit; }   // 1 << 31 = 0xffffffff80000000 !!!
unsigned long set_bit_b(int bit) { return 1U << bit; }   // 1U << 31 = 0x80000000 ✅
```

`1 << 31` 是有符号溢出（UB），符号扩展到 64 位时结果出乎意料。始终用 `1U` 或 `1ULL`。

*来源：第150期*

### 3.3 死循环也是 UB

```cpp
int main() {
    while(1) ;  // 无副作用的死循环是 UB
}
void unreachable() {
    std::cout << "hello world\n";  // clang 会打印这个！
}
```

编译器把无副作用的死循环优化掉，没有 ret，直接跳到下一个函数。

*来源：第100期*

### 3.4 整数溢出没有银弹

C++ 没有内建的溢出检查。现有方案：
- 自定义类型加边界检查
- Rust 风格的 `overflowing_add` / `overflowing_mul`
- Chromium 的 [checked math](https://github.com/chromium/subspace)
- `-ftrapv` 编译选项（性能损失大）

*来源：第140期*

### 3.5 浮点数比较

```cpp
bool cmpEq(double a, double b,
  double epsilon = 1e-7, double abstol = 1e-12) {
  if (a == b) return true;  // 处理 inf
  double diff = std::fabs(a - b);
  double reltol = std::max(std::fabs(a), std::fabs(b)) * epsilon;
  return diff < reltol || diff < abstol;
}
```

或直接用 Boost.Test 的浮点比较实现。

*来源：第100期*

### 3.6 用 `constexpr` 在编译期捕获 UB

编译器在 constexpr 求值时必须拒绝 UB。可以利用这一点写编译期测试来捕获 UB。

*来源：第150期*

### 3.7 `std::uintptr_t` 处理地址

涉及地址转换时用 `std::uintptr_t` 而不是 `uint32_t`/`uint64_t`，避免 `reinterpret_cast` 的 `-fpermissive` 报错和平台兼容性问题。

*来源：第150期*

---

## 四、设计模式与惯用法

### 4.1 CRTP 表达式模板（延迟求值）

用于 Eigen 风格的数学库，避免中间临时对象：

```cpp
template <typename E>
class VecExpression {
public:
    double operator[](size_t i) const {
        return static_cast<E const&>(*this)[i];
    }
};

template <typename E1, typename E2>
class VecSum : public VecExpression<VecSum<E1, E2>> {
    const E1& _u; const E2& _v;
public:
    double operator[](size_t i) const { return _u[i] + _v[i]; }
};

// a + b + c 的类型是 VecSum<VecSum<Vec, Vec>, Vec>
// 赋值时才实际计算：elems[i] = a[i] + b[i] + c[i]
```

*来源：第170期*

### 4.2 防止对象切片

```cpp
// C++20 方案：CRTP + concepts
template <typename T>
struct DontSlice {
    DontSlice() = default;
    DontSlice(const std::derived_from<T> auto&) = delete;
    DontSlice& operator=(const std::derived_from<T> auto&) = delete;
    DontSlice(std::derived_from<T> auto&&) = delete;
    DontSlice& operator=(std::derived_from<T> auto&&) = delete;
};

struct Base : DontSlice<Base> {
    int x_;
    Base(int x) : x_(x) {}
    using DontSlice<Base>::DontSlice;
};
```

*来源：第190期*

### 4.3 RAII scope_exit

```cpp
template<class L>
class AtScopeExit {
    L& m_lambda;
public:
    AtScopeExit(L& action) : m_lambda(action) {}
    ~AtScopeExit() noexcept(false) { m_lambda(); }
};

// 使用宏简化
#define Auto(...) Auto_INTERNAL2(__COUNTER__, __VA_ARGS__)

// 用法
bool Mutate(State *state) {
    state->DisableLogging();
    Auto(state->EnableLogging());
    if (!state->AttemptOperation1()) return false;
    return true;
}
```

*来源：第150期*

### 4.4 `std::variant` 状态机

```cpp
using State = std::variant<Idle, Running, Error>;

// 状态转换用 std::visit
State transition(State current, Event event) {
    return std::visit(overloaded{
        [](Idle, StartEvent) -> State { return Running{}; },
        [](Running, ErrorEvent e) -> State { return Error{e.msg}; },
        [](auto s, auto) -> State { return s; },  // 默认：保持不变
    }, current, event);
}
```

*来源：第120期*

### 4.5 类型安全的字典（Tag Dispatch）

```cpp
using dict = std::map<std::type_index, std::any>;

template <class Name, class T>
struct key final { explicit key() = default; };

template <class Name, class T>
auto get(const dict& d, key<Name, T> k) -> std::optional<T> {
    if (auto pos = d.find(typeid(k)); pos != d.end())
        return std::any_cast<T>(pos->second);
    return std::nullopt;
}

// 声明 key（类只需声明不需定义）
using age_k = key<struct _age_, int>;
using name_k = key<struct _name_, std::string>;
constexpr inline auto age = age_k{};
constexpr inline auto name = name_k{};
```

注意：`typeindex` 计算较慢，大规模使用考虑字符串 hash 替代。

*来源：第140期*

### 4.6 transform_iterator 延迟计算

```cpp
template <typename Iter, typename Func>
class transform_iterator {
    Iter it; Func func;
public:
    using value_type = std::invoke_result_t<Func,
        typename std::iterator_traits<Iter>::value_type>;
    transform_iterator& operator++() { ++it; return *this; }
    value_type operator*() const { return func(*it); }
    bool operator!=(const transform_iterator& o) const { return it != o.it; }
};
// 类似 range，延迟计算。C++20 有 views::transform 更好用
```

*来源：第180期*

---

## 五、并发与异步

### 5.1 C++20 协程最小实现

协程三要素：
- **Promise**：存储异步状态和回调
- **Awaiter**：实现 `await_ready` / `await_suspend` / `await_resume`
- **promise_type**：通过 `coroutine_traits` 特化挂载协程语义

```cpp
class Awaiter {
    Promise& m_promise;
public:
    bool await_ready() { return m_promise.IsReady(); }
    void await_suspend(std::coroutine_handle<> handle) {
        m_promise.AddCallback([handle]() { handle.resume(); });
    }
    void await_resume() {}
};
```

实际项目推荐用 Boost.Asio 或 cppcoro，不要自己造轮子。

*来源：第196期*

### 5.2 线程安全的编译期保证

用零开销 Token 类型在编译期保证只在主线程调用：

```rust
pub struct MainThreadToken { _marker: PhantomData<*mut ()> }
// 需要 token 的函数签名
pub fn drain(&self, _token: MainThreadToken) { ... }
```

C++ 端用标记宏区分线程安全属性：

```cpp
#define SYNC    /* 线程安全的 const 方法 */
#define UNSYNC  /* 线程不安全的 const 方法 */
```

*来源：第195期*

### 5.3 TLS 对象的析构顺序

- `thread_local` 对象析构顺序不确定
- 析构中访问已销毁的 TLS 对象是 UB
- 非 trivial 的 TLS 对象在 `-fPIC` 下有额外性能开销

*来源：第180期*

### 5.4 锁内析构注意死锁

持有锁时销毁对象，如果对象的析构函数也需要加锁，就会死锁。特别注意 `shared_ptr` 的引用计数归零时机。

### 5.5 `std::move` 不保证移动

`std::move` 只是强制转换为右值引用：
- 如果接收方没有移动构造函数，仍然会拷贝
- `const T&&` 不会触发移动
- 能返回值优化（RVO/NRVO）时**不要** `std::move`

*来源：第140期*

---

## 六、编译器与工具链

### 6.1 编译时间分析

- Clang：`-ftime-trace` 生成火焰图
- GCC：配合 [ClangBuildAnalyzer](https://github.com/aras-p/ClangBuildAnalyzer)
- Visual Studio 17.9+：内置编译时间分析、字段内存布局分析、include 分析
- xmake：参考 xmake 的编译分析功能

*来源：第150期*

### 6.2 `constinit` 解决静态初始化顺序问题

```cpp
constinit int global_value = 42;  // 保证编译期初始化
```

避免 Static Initialization Order Fiasco。能用就用。

*来源：第120期*

### 6.3 Sanitizer 使用指南

| Sanitizer | 编译选项 | 用途 |
|-----------|---------|------|
| ASan | `-fsanitize=address` | 内存越界、use-after-free |
| UBSan | `-fsanitize=undefined` | 未定义行为 |
| TSan | `-fsanitize=thread` | 数据竞争 |
| MSan | `-fsanitize=memory` | 未初始化内存 |

VS 的 ASan 支持 `continue_on_error` 模式。Debug 下 Sanitizer 可能很慢。

*来源：第100期、第120期、第180期*

### 6.4 编译期越界检查

```cpp
[[gnu::error("out-of-bounds access detected")]]
void static_bounds_check_failed();

template <typename Index>
void bounds_check(Index idx, Index limit) {
    if (__builtin_constant_p(idx) && __builtin_constant_p(limit)) {
        if (idx < Index{0} || idx >= limit)
            static_bounds_check_failed();  // 编译错误
    }
}
```

注意 `__builtin_constant_p` 不是 100% 可靠。

*来源：第140期*

### 6.5 C++20 模块

三大标准库实现（libstdc++、libc++、STL）都支持在 C++20 模式使用 `std` 模块，不需要 C++23。C++23 提供的 `std` 模块体验更好。

*来源：第190期*

---

## 七、常见陷阱与避坑

### 7.1 `std::accumulate` 的初始值类型

```cpp
std::vector<double> v = {1.5, 2.5, 3.5};
auto sum = std::accumulate(v.begin(), v.end(), 0);    // ❌ 结果是 int！得到 6
auto sum = std::accumulate(v.begin(), v.end(), 0.0);  // ✅ 得到 7.5
```

### 7.2 头文件中不要 `using namespace`

放在 `.cpp` 文件或函数作用域内。头文件中的 `using namespace` 会污染所有包含者。

*来源：第160期*

### 7.3 `fseek` 内部可能有 `mmap`

某些 glibc 版本中 `fseek` 内部使用 `mmap` 分配 buffer，在高并发场景下 `mmap_sem` 互斥锁冲突成为瓶颈。新版本 glibc 已修复。

*来源：第140期*

### 7.4 WebGL 缓存失效

循环中交替更新顶点/索引数据会触发浏览器缓存反复失效重建。解决方案：批处理合并绘制调用，或把所有 buffer 更新放在所有绘制调用之前。

*来源：第195期*

### 7.5 GPU 基准测试必须固定时钟频率

GPU 动态频率调整可导致基准测试结果 5-6 倍的波动。用 `SetStablePowerState` 或 RAII 封装固定频率。

*来源：第195期*

### 7.6 `std::string` vs `vector<char>` 在热路径

`std::string` 每次 `append` 维护 null terminator 有额外开销。热路径中单字节追加场景用 `vector<char>` 可提速 12%。

*来源：第196期*

### 7.7 整数加法近似浮点乘法

浮点数的指数-尾数结构使得整数加法可以近似浮点乘法，误差约 7%：

```cpp
float rough_float_multiply(float a, float b) {
    constexpr uint32_t bias = 0x3f76d000;
    uint32_t ai = bit_cast<uint32_t>(a), bi = bit_cast<uint32_t>(b);
    return ai & bi ? bit_cast<float>(ai + bi - bias) : 0.0f;
}
```

仅用于对精度要求不高的快速计算场景。

*来源：第180期*

### 7.8 Windows 函数开头的 `MOV EDI, EDI`

这是 2 字节 NOP，用于在线热补丁：可以把这行替换成 `JMP` 到补丁代码。

*来源：第160期*

---

## 八、推荐资源

### 博客
- [johnnysswlab.com](https://johnnysswlab.com/) — 性能调优专家
- [lemire.me](https://lemire.me/blog/) — SIMD / 数据处理性能
- [devblogs.microsoft.com/oldnewthing](https://devblogs.microsoft.com/oldnewthing/) — Raymond Chen
- [quuxplusone.github.io](https://quuxplusone.github.io/blog/) — 语言律师级 C++ 分析
- [sandordargo.com](https://www.sandordargo.com/blog/) — 现代 C++ 特性系列
- [andreasfertig.com](https://andreasfertig.com/blog/) — C++ Insights 作者
- [biowpn.github.io](https://biowpn.github.io/) — 现代 C++ 实践

### 安全规范
- [360 安全规则集合](https://github.com/Qihoo360/safe-rules/) — UB 和安全编码规范
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/) — 官方指南

### 工具
- [Compiler Explorer](https://godbolt.org/) — 在线查看汇编
- [quick-bench.com](https://quick-bench.com/) — 在线基准测试
- [rr-debugger](https://github.com/rr-debugger/rr) — 录制回放调试
- [Clang-Tidy](https://clang.llvm.org/extra/clang-tidy/) — 静态分析
- [PVS-Studio](https://pvs-studio.com/) — 静态分析
- [likwid](https://github.com/RRZE-HPC/likwid) — 性能计数器分析

### 常用开源库
- [fast_float](https://github.com/fastfloat/fast_float) — 快速浮点数解析
- [fmt](https://github.com/fmtlib/fmt) — 现代格式化库
- [Boost.Asio](https://www.boost.org/doc/libs/release/doc/html/boost_asio.html) — 异步 I/O
- [libfork](https://github.com/ConorWilliams/libfork) — 基于协程的 fork-join 并行
- [asteria](https://github.com/lhmouse/asteria) — 可嵌入脚本语言
