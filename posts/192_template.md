---
layout: post
title:  第192期
---
# C++ 中文周刊 2025-12-06 第192期

`TODO add README then remove this line`

[周刊项目地址](https://github.com/wanghenshui/cppweeklynews)

公众号

<img src="https://wanghenshui.github.io/cppweeklynews/assets/code.png" alt=""  width="30%">

点击「查看原文」跳转到 GitHub 上对应文件，链接就可以点击了

qq群 753792291 答疑在这里

[RSS](https://github.com/wanghenshui/cppweeklynews/releases.atom)

欢迎投稿，推荐或自荐文章/软件/资源等，评论区留言

本期文章由 赞助老爷 赞助 在此表示感谢

`TODO update sponsor`

---

## 资讯

标准委员会动态/ide/编译器信息放在这里

[编译器信息最新动态推荐关注hellogcc公众号 本周更新 2025-01-08 第288期](https://mp.weixin.qq.com/s/jMaR7QyCD40uCAKJSyLw6A)

[性能周刊](https://mp.weixin.qq.com/s/rkoBXmzhrbhvN4AEmBHS7w)


## 文章

### [C++前向声明：好与坏](https://andreasfertig.com/blog/2025/10/forward-declaring-a-type-in-cpp-the-good-and-the-bad/)

**基础前向声明：**

```cpp
class Cat;

class Dog {
  Cat* garfield{};
};
```

**危险的delete模式：**

```cpp
struct Cat;

void Fun(Cat* garfield) {
  delete garfield;  // 未定义行为!
}

struct Cat {
  ~Cat() { puts("Cats have seven lives!"); }
};
```

问题：删除不完整类型时，"析构函数和类特定的operator delete都不会被调用"，导致未定义行为。编译器对不完整类型假设析构函数是平凡的。

**安全删除用static_assert：**

```cpp
void Fun(Cat* garfield) {
  static_assert(sizeof(Cat) >= 0, "Cannot delete an incomplete type");
  delete garfield;
}
```

**好处：**
- 减少编译时间，避免包含头文件
- 可以只用指针/引用而不需要完整类型定义
- 大型代码库很有用

**安全措施：**
- 用`sizeof()`配合`static_assert`强制完整类型
- STL容器如`std::unique_ptr`已经验证完整性
- C++26会把这种场景从运行时UB改成编译时错误

前向声明省编译时间，但得小心delete。用static_assert保平安。

### [找到VS Code内存泄漏](https://randomascii.wordpress.com/2025/10/09/finding-a-vs-code-memory-leak/)

Bruce Dawson通过一个不寻常的观察发现泄漏：同事系统上的进程ID有七位数。因为Windows PID是4的倍数且快速复用，"四百万左右的PID意味着一百万个进程"，说明是进程句柄泄漏而不是真的进程泄漏。

**根本原因：**

vscode-windows-process-tree的buggy代码调用`OpenProcess()`但没对应的`CloseHandle()`。每个未关闭的句柄泄漏大约64 KB，最终消耗"大约64 GB"内存，没有上限。

**调查技术：**
1. **任务管理器分析**：句柄列显示哪个进程在泄漏
2. **ETW跟踪**：Windows事件跟踪提供调用栈，定位确切的泄漏代码位置
3. **模式识别**：高PID值标志句柄保留问题

**修复：**

加一行解决：`CloseHandle(hProcess);`

**关键洞察：**

Dawson主张用RAII模式防止这类泄漏，建议自动资源限制能在测试阶段而不是生产环境抓到这些bug。


### [C++26: std::optional的range支持](https://www.sandordargo.com/blog/2025/10/08/cpp26-range-support-for-std-optional)

**基础range迭代：**

迭代optional，执行零次或一次：

```cpp
void doSomething(std::string const& data, std::optional<Logger&> logger = {}) {
    for (auto l : logger) {
        l.log(data);
    }
    return;
}
```

**实际用例：与range流水线链式：**

```cpp
std::unordered_set<int> s{1, 3, 7, 9};
const auto flt = [&](int i) -> std::optional<int> {
    if (s.contains(i)) {
        return i;
    } else {
        return {};
    }
};

for (auto i : std::views::iota(1, 10) | std::views::transform(flt)) {
    for (auto j : i) {
        for (auto k : std::views::iota(0, j)) {
            std::ignore = k;
        }
    }
}
```

**关键设计决策：**

`std::optional<T>`现在简单地特化`ranges::enable_view`而不是继承`view_interface`，保持简单性的同时获得range能力。

optional能直接用在range pipeline里，挺方便。

### [std::ranges性能可能不如预期](https://lemire.me/blog/2025/10/05/stdranges-may-not-deliver-the-performance-that-you-expect/)

**std::ranges方式（函数式）：**

```cpp
auto even_numbers = numbers
    | std::views::filter([](int n) { return n % 2 == 0; })
    | std::ranges::to<std::vector>();
```

**字符串trim用std::ranges：**

```cpp
s | std::views::drop_while(is_space)
  | std::views::reverse
  | std::views::drop_while(is_space)
  | std::views::reverse;
```

**传统方式（命令式）：**

```cpp
while (!input.empty() && is_space(input.front())) {
    input.remove_prefix(1);
}
while (!input.empty() && is_space(input.back())) {
    input.remove_suffix(1);
}
```

**性能基准测试结果：**

随机无空格字符串，每字符串处理的指令数：

| 实现方式 | LLVM 17/Apple M4 | GCC 15/Intel IceLake |
|---|---|---|
| std::ranges | 24条指令 | 70条指令 |
| 传统方式 | 18条指令 | 16条指令 |

**关键发现：**传统方式在两种编译器和处理器组合上都生成更少的指令，说明函数式抽象不自动保证最优性能。

ranges写着优雅，跑着不一定快。别盲目信抽象。

### [延迟参数求值](https://bannalia.blogspot.com/2022/10/deferred-argument-evaluation.html)

**核心解决方案：`deferred_call`工具：**

```cpp
template<typename F>
struct deferred_call
{
  using result_type=decltype(std::declval<const F>()());
  operator result_type() const { return f(); }
  F f;
};
```

**工作原理：**`deferred_call`对象传给接受泛型、无约束参数的函数/构造函数模板，转换只在实际需要值时触发。

**应用示例：**

```cpp
object* retrieve_or_create(int id)
{
  static std::unordered_map<int, std::unique_ptr<object>> m;
  auto [it,b] = m.try_emplace(
    id,
    deferred_call([&]{ return std::make_unique<object>(id); }));
  return it->second.get();
}
```

这延迟对象构造，直到`try_emplace`确认没有等价条目存在。

**关键要求：**

技术要求恰好一个用户定义转换点，否则链式转换失败：

```cpp
void f(std::string);
// 错误：需要 deferred_call → const char* → std::string
f(deferred_call([]{ return "hello"; }));
```

延迟求值省开销，但转换链要小心。

### [提升std::unordered_map实现的技术水平](https://bannalia.blogspot.com/2022/06/advancing-state-of-art-for.html)

**Boost.Unordered 1.80三大优化：**

1. **减少内存占用**："显著减少的内存占用改善cache利用率"
2. **快速模数实现**：用计算代替昂贵的表跳转，消除模数操作
3. **更少指针间接**：比libstdc++-v3和libc++少一次指针解引用

**内存开销对比（64位）：**

| 实现 | 开销公式 |
|---|---|
| libstdc++-v3 | 16N + 8B（带hash缓存） |
| libc++ | 16N + 8B |
| Visual Studio | 16N + 16B |
| **Boost.Unordered** | **8N + 8.5B** |

*N = 元素数量，B = 桶数量*

**架构创新：**

Boost.Unordered采用**桶组**——32/64位占用掩码配合链接的组指针。这个设计实现常数时间迭代，同时保持教科书闭地址布局，每个桶只用4位开销。

内存省一半，性能还更好。

### [boost::unordered_flat_map内部机制](https://bannalia.blogspot.com/2022/11/inside-boostunorderedflatmap.html)

**核心架构：**

`boost::unordered_flat_map`用**开放寻址**配合基于组的组织，而不是单独桶映射。容器把桶数组分成15个桶的组，配套元数据数组存储减少的hash值和状态信息。

**元数据组织：**
- 每个元数据字节跟踪桶状态：0为空，1为哨兵，2-255为减少的hash值
- "溢出字节"用8位标志组满了，消除tombstone需求
- 没SIMD支持的架构上，元数据在64位字上用位交错

**Hash映射：**

组通过`hash_value / 2^(W-n)`选择而不是单独桶映射，W表示架构宽度（64或32位）。

**性能优化：**

**SIMD加速：**利用SSE2/Neon同时比较多个桶的减少hash值。"这个技术实际上在常数时间检查适度数量的桶"，实现快速过滤不匹配位置。

**Hash后混合：**因为容器接受用户提供的质量不定的hash函数，它应用自动位混合。64位架构用`xmx`函数；32位用Hash Function Prospector生成的混合器。

**反漂移机制：**重新hash不仅在负载因子阈值触发，在删除带溢出位设置的元素时也触发，防止重复插入/删除循环的性能退化。

**与absl::flat_hash_map对比基准：**
- 不成功查找性能优越（高负载下快3.2倍）
- 成功查找速度相当
- 迭代稍慢，因为SIMD对齐约束

开放寻址玩出花了，hash表也能这么卷。

### [C++23用户定义类限定符](https://bannalia.blogspot.com/2023/08/user-defined-class-qualifiers-in-c23.html)

**示例1：基础`mut`限定符：**

```cpp
template<typename T>
struct mut: T
{
  using T::T;
};

template<typename T>
T& as_const(T& x) { return x;}

template<typename T>
T& as_const(mut<T>& x) { return x;}

struct X
{
  void foo() {}
  void bar(this mut<X>&) {}
};

int main()
{
  mut<X> x;
  x.foo();
  x.bar();

  auto& y = as_const(x);
  y.foo();
  y.bar(); // 错误：不能从'X'转换到'mut<X> &'

  X& z = x;
  z.foo();
  z.bar(); // 错误：不能从'X'转换到'mut<X> &'
}
```

**示例2：通用多限定符系统：**

```cpp
template<typename T,typename... Qualifiers>
struct access: T
{
  using qualifier_list=boost::mp11::mp_list<Qualifiers...>;
  using T::T;
};

template<typename T, typename... Qualifiers>
concept qualified =
  (boost::mp11::mp_contains<
    typename std::remove_cvref_t<T>::qualifier_list,
    Qualifiers>::value && ...);

struct mut;
struct synchronized;

template<typename T>
concept is_mut = qualified<T, mut>;

template<typename T>
concept is_synchronized = qualified<T, synchronized>;

struct X
{
  void foo() {}
  template<is_mut Self>
  void bar(this Self&&) {}
  template<is_synchronized Self>
  void baz(this Self&&) {}
  template<typename Self>
  void qux(this Self&&)
  requires qualified<Self, mut, synchronized> {}
};

int main()
{
  access<X, mut> x;
  x.foo();
  x.bar();
  x.baz(); // 错误

  access<X, mut, synchronized> z;
  z.bar();
  z.baz();
  z.qux();
}
```

这些示例演示用C++23显式对象参数实现"语法限定符子类型化"，但注意语义强制（如自动互斥锁）仍未实现。

用继承模拟限定符，脑洞真大。

### [高效分割长字符串为行](https://lemire.me/blog/2025/09/07/splitting-a-long-string-in-lines-efficiently/)

**简单逐字符方式：**

```c
void insert_line_feed(const char *buffer, size_t length,
        int K, char *output) {
  if (K == 0) {
    memcpy(output, buffer, length);
    return;
  }
  size_t input_pos = 0;
  size_t next_line_feed = K;
  while (input_pos < length) {
    output[0] = buffer[input_pos];
    output++;
    input_pos++;
    next_line_feed--;
    if (next_line_feed == 0) {
      output[0] = '\n';
      output++;
      next_line_feed = K;
    }
  }
}
```

**优化memcpy版本：**

```c
void insert_line_feed_memcpy(const char *buffer, size_t length, int K,
                             char *output) {
  if (K == 0) {
    memcpy(output, buffer, length);
    return;
  }
  size_t input_pos = 0;
  while (input_pos + K < length) {
    std::memcpy(output, buffer + input_pos, K);
    output += K;
    input_pos += K;
    output[0] = '\n';
    output++;
  }
  std::memcpy(output, buffer + input_pos, length - input_pos);
}
```

**性能基准测试：**

Intel Ice Lake上GCC 12测试（GB/s和每字节指令数）：

| 方法 | 吞吐量 | 指令数/字节 |
|--------|-----------|-------------------|
| 逐字符 | 1.0 GB/s | 8.0 |
| memcpy | 11 GB/s | 0.46 |
| AVX2 | 16 GB/s | 0.52 |

手写AVX2实现比memcpy方式快约45%，尽管每字节用的指令稍多，提供更优的内存写入效率。

AVX2版本用向量指令处理32字节寄存器，通过shuffle mask和blend操作嵌入换行符插入。

memcpy快10倍，SIMD再快50%。

### [C++模板：遍历std::tuple用std::apply](https://www.cppstories.com/2022/tuple-iteration-apply/)

**基础std::apply用法：**

```cpp
#include <iostream>
#include <tuple>

int sum(int a, int b, int c) {
    return a + b + c;
}

void print(std::string_view a, std::string_view b) {
    std::cout << "(" << a << ", " << b << ")\n";
}

int main() {
    std::tuple numbers {1, 2, 3};
    std::cout << std::apply(sum, numbers) << '\n';

    std::tuple strs {"Hello", "World"};
    std::apply(print, strs);
}
```

**基于Lambda的tuple打印：**

```cpp
template <typename TupleT>
void printTupleApply(const TupleT& tp) {
    std::cout << "(";
    std::apply([](const auto& first, const auto&... restArgs) {
        auto printElem = [](const auto& x) {
            std::cout << ", " << x;
        };
        std::cout << first;
        (printElem(restArgs), ...);
    }, tp);
    std::cout << ")";
}
```

**通用for_each实现：**

```cpp
template <typename TupleT, typename Fn>
void for_each_tuple2(TupleT&& tp, Fn&& fn) {
    std::apply([&fn]<typename ...T>(T&& ...args) {
        (fn(std::forward<T>(args)), ...);
    }, std::forward<TupleT>(tp));
}
```

**变换操作：**

```cpp
template <typename TupleT, typename Fn>
[[nodiscard]] auto transform_tuple(TupleT&& tp, Fn&& fn) {
    return std::apply([&fn]<typename ...T>(T&& ...args) {
        return std::make_tuple(fn(std::forward<T>(args))...);
    }, std::forward<TupleT>(tp));
}
```

apply配合fold expression，tuple遍历很方便。

### [代码注释应该应用于注释"执行"时的系统状态](https://devblogs.microsoft.com/oldnewthing/20251006-00/?p=111655)

**问题示例：**

注释在条件逻辑前，造成混乱：

> "Widget已经在振动，所以我们原地更新波形。否则波形参数将在开始振动时设置。"

这个注释在`if`语句前，让读者不确定振动状态是否已经确认。

**解决方案1 - 注释放在块内：**

```csharp
if (waveformParameters != null) {
    // Widget已经在振动，所以原地更新
    waveformParameters.Shape = WaveformShape.Square;
    widget.UpdateWaveformParameters(waveformParameters);
} else {
    // 现在不更新；参数在振动开始时设置
}
```

**解决方案2 - 条件语言在前：**

如果注释必须在条件前，重构成匹配预检查状态的条件语句：

> "如果widget已经在振动，那么原地更新波形。否则参数将在开始振动时设置。"

注释对齐执行流，消除读者对程序状态假设的混乱。

注释位置要对，别让人猜。

### [学习读C++编译器错误：不是合法的基类](https://devblogs.microsoft.com/oldnewthing/20250919-00/?p=111612)

**问题代码：**

```cpp
Microsoft::WRL::Callback<ABI::ITypedEventHandler<
    ABI::InputPane*,
    ABI::InputPaneVisibilityEventArgs*>>(
    &MyClass::OnInputPaneShowing).Get());
```

问题：`&MyClass::OnInputPaneShowing`创建一个指向成员函数的指针，WRL模板试图用它作为基类——C++里无效操作。

错误信息：

> "is not a legal base class"

**解决方案1：用Lambda：**

```cpp
m_showingToken = inputPane->put_Showing(
    Microsoft::WRL::Callback<ABI::ITypedEventHandler<
        ABI::InputPane*,
        ABI::InputPaneVisibilityEventArgs*>>(
        [this](auto&&... args) {
            return OnInputPaneShowing(args...);
        }).Get());
```

**解决方案2：成员函数重载：**

```cpp
m_showingToken = inputPane->put_Showing(
    Microsoft::WRL::Callback<ABI::ITypedEventHandler<
        ABI::InputPane*,
        ABI::InputPaneVisibilityEventArgs*>>(
        this, &MyClass::OnInputPaneShowing).Get());
```

修正后用lambda（是个有`operator()`的类类型）或WRL内置的成员函数回调支持。

成员函数指针不能当基类，得包一层。

### [std::apply为什么搞不清我要用哪个重载？只有一个能work！](https://devblogs.microsoft.com/oldnewthing/20250911-00/?p=111586)

**问题示例1：**

```cpp
void f(int, int);
void f(char*, char*);

void test(std::tuple<int, int> t)
{
    std::apply(f, t); // 错误
}
```

编译器不能推导用哪个重载，因为缺少`std::apply`如何调用函数的信息。

**问题示例2：**

```cpp
void f(int, int);
void f(char*, int);

auto test(int v)
{
    return std::bind(f, std::placeholders::_1, v);
}
```

绑定点编译器不能确定应用哪个重载，因为调用类型未知。

**变通方案1（通用）：**

```cpp
void test(std::tuple<int, int> t)
{
    std::apply([](auto&&... args) {
        f(std::forward<decltype(args)>(args)...);
    }, t);
}
```

lambda的模板实例化提供足够类型信息做正确的重载选择。

**变通方案2（具体类型）：**

```cpp
void test(std::tuple<int, int> t)
{
    std::apply([](int a, int b) {
        f(a, b);
    }, t);
}
```

显式指定参数类型完全绕过重载解析问题。

apply不解析重载，包个lambda。

### [null指针崩溃，尽管检查了null](https://devblogs.microsoft.com/oldnewthing/20250905-00/?p=111560)

**问题代码：**

```cpp
winrt::IAsyncAction Widget::InitializeNodesAsync()
{
    auto lifetime = get_strong();
    std::optional<winrt::IVectorView<int32_t>> numbers;
    co_await winrt::resume_background();
    CallWithRetry([&] {
        numbers = GetMagicNumbers();
    });

    if (numbers == nullptr)  // ← 错误检查
    {
        co_return;
    }

    co_await winrt::resume_foreground(m_uithread);

    std::vector<winrt::Node> nodes;
    nodes.reserve((*numbers).Size()); // ← 这里崩溃
}
```

**问题：**

"比较`std::optional`与`nullptr`检查optional是否包含等于`nullptr`的值，而不是是否为空。"

**解决方案：**

```cpp
winrt::IAsyncAction Widget::InitializeNodesAsync()
{
    auto lifetime = get_strong();
    winrt::IVectorView<int32_t> numbers; // 去掉std::optional
    co_await winrt::resume_background();
    CallWithRetry([&] {
        numbers = GetMagicNumbers();
    });

    if (numbers == nullptr)  // ← 现在正确
    {
        co_return;
    }

    co_await winrt::resume_foreground(m_uithread);

    std::vector<winrt::Node> nodes;
    nodes.reserve(numbers.Size()); // 去掉解引用操作符
}
```

optional比nullptr不是检查空，是检查值。别搞混了。

### [C++指针标记：把位塞进指针的艺术](https://vectrx.substack.com/p/pointer-tagging-in-c-the-art-of-packing)

**核心概念：**

现代64位指针浪费大量地址空间。x64系统48位虚拟寻址上，高16位未用。另外，malloc对齐分配（通常16字节边界）让低4位为零。总共约20位可用，直接在指针值内存储元数据。

**基础实现结构：**

```cpp
template <typename T>
struct tagged_ptr {
  T *Ptr;
};
```

**关键操作：**

**打包数据：**

元数据左移48位，mask指针顶部位，然后用位或组合：

```cpp
static constexpr u64 CanonicalAddressSize = 48;
static constexpr u64 PtrMask = 0x0000FFFFFFFFFFFF;

void PackData(u16 Data) {
  u64 PackedData = (u64)Data << CanonicalAddressSize;
  u64 MaskedPtr = (u64)this->Ptr & PtrMask;
  u64 Result = PackedData | MaskedPtr;
  this->Ptr = (T *)Result;
}
```

**提取数据：**

指针右移48位恢复元数据。

**检索有效地址：**

清除打包位，必要时从第47位应用x64符号扩展。

**实际应用：**
- **V8引擎**：区分原始整数和堆引用
- **Linux红黑树**：在父指针中编码节点颜色
- **PBRT**：替换每对象v-table实现多态
- **Objective-C**：直接在tagged pointer中存储小对象

20位白送，不用白不用。

### [Boost.Bloom批量操作](https://bannalia.blogspot.com/2025/10/bulk-operations-in-boostbloom.html)

从Boost 1.90开始，Boost.Bloom提供批量操作，"总的来说，可以大幅加速插入和查找"。

**核心优化原理：**

将hash位置计算与实际内存访问分离，让CPU预取隐藏延迟。

**常规插入（k=1）：**

```cpp
void insert(const value_type& x) {
  auto h = hash(x);
  auto p = position(h);
  set(position, 1);
}
```

**批量插入：**

```cpp
void insert(const std::array<value_type, N>& x) {
  std::size_t positions[N];

  for(std::size_t i = 0; i < N; ++i) {
    auto h = hash(x[i]);
    positions[i] = position(h);
    prefetch(positions[i]);
  }

  for(std::size_t i = 0; i < N; ++i) {
    set(positions[i], 1);
  }
}
```

**优化的批量查找（k>1）：**

用bitmask迭代减少：

```cpp
std::uint64_t results = 0;

for(int j = 0; j < k; ++i) {
  auto mask = results;
  if(!mask) break;
  do {
    auto i = std::countr_zero(mask);
    auto b = check(positions[i]);
    results &= ~(std::uint64_t(!b) << i);
    mask &= mask - 1;
  } while(mask);
}
```

用`std::countr_zero()`常数时间跳过已终止列，减少不必要迭代从nk到大约n个额外分支。

**性能指标：**

boost::bloom::filter<int, K>（1000万元素，GCC 64位）：
- 数组大小8M，K=6：0.78x–2.11x改进
- 数组大小20M，K=14：2.24x–2.57x改进

预取是关键，能提速2倍多。

### [Maps on chains](https://bannalia.blogspot.com/2025/07/maps-on-chains.html)

用C++ `std::map`配合不相交整数区间作为key。

**基础区间结构：**

```cpp
struct interval {
  int min, max;
};
std::map<interval, std::string> m;
```

**初始方法（有缺陷）：**

```cpp
bool operator<(const interval& x, const interval& y) {
  return x.max < y.min;
}
```

插入重叠区间会导致未定义行为，因为"区间顺序不是严格弱序"。

**数学问题：**

比较两个区间时，三种情况：
- 不重叠区间保持正确顺序
- 重叠或相同区间变成不可比较

违反关联容器依赖的严格弱序要求。

**可行解决方案：**

提供异常抛出的比较操作符，确保只插入链式有序的元素：

```cpp
struct interval_overlap: std::runtime_error {
  interval_overlap(): std::runtime_error("interval overlap"){}
};

bool operator<(const interval& x, const interval& y) {
  if(x.min == y.min) {
    if(x.max != y.max) throw interval_overlap();
    return false;
  }
  // ... 额外比较配合重叠检测
}
```

**额外：异构查找：**

透明比较器支持在区间内搜索整数：

```cpp
struct less_interval {
  using is_transparent = void;
  // 区间对区间和整数对区间比较的重载操作符
};
```

区间当key，得保证不重叠。

### [有序容器的API人机工程学](https://bannalia.blogspot.com/2024/04/a-case-in-api-ergonomics-for-ordered.html)

**标准库方式：**

用`std::set`配合`lower_bound`和`upper_bound`：

```cpp
std::set<int> x = ...;
auto first = x.lower_bound(a);
auto last = x.upper_bound(b);
while(first != last) std::cout << *first++ << " ";
```

不同区间边界需要不同组合：

```cpp
// [a,b)
auto first = x.lower_bound(a);
auto last = x.lower_bound(b);

// (a,b]
auto first = x.upper_bound(a);
auto last = x.upper_bound(b);
```

**Boost.MultiIndex替代方案：**

提供更直观的`range()`操作，用谓词：

```cpp
boost::multi_index_container<int> x = ...;
using namespace boost::lambda2;

// [a,b]
auto [first, last] = x.range(_1 >= a, _1 <= b);

// [a,b)
auto [first, last] = x.range(_1 >= a, _1 < b);
```

**关键优势：**

当端点反转（a > b）时，`range`"优雅处理情况"，返回空range而不是未定义行为——更好的API设计，"减少编程错误"。

Boost.MultiIndex的range比标准库的lower_bound/upper_bound组合好用。

### [boost::concurrent_flat_map内部机制](https://bannalia.blogspot.com/2023/07/inside-boostconcurrentflatmap.html)

**核心架构：**

开放寻址配合15个slot的组，每组配16字节元数据字，用于"基于SIMD的减少hash匹配和插入溢出控制"。

**同步层级：**

1. **容器级别**：读写互斥锁实现为跨cache line的spinlock数组，线程局部构造时round-robin分配
2. **组级别**：每个组有专用读写spinlock加原子插入计数器

**查找过程：**
- 无锁步骤：hash计算、探测、SIMD匹配
- 加锁阶段："占用双重检查是必要的，正因为SIMD匹配是无锁的"
- 组锁只在最终元素比较时获取

**插入策略：**

用事务性乐观插入：
- 开始时保存插入计数器值
- 无锁进行slot搜索
- 找到可用slot后，递增计数器
- 计数器未变则提交；否则回滚整个操作
- 测量显示"重新开始与成功插入的比率在百万分之几"

**API设计哲学：**

容器故意省略迭代器避免死锁风险："如果非阻塞，它们不安全，如果阻塞会增加竞争...很容易导致死锁"

**访问API替代迭代：**
- `visit()`、`cvisit()`用于元素查找/访问
- `visit_all()`、`cvisit_all()`用于遍历
- `emplace_or_visit()`、`insert_or_visit()`用于组合操作
- 并行版本支持`std::execution::par`

容器维护兼容性：它"在所有`boost::unordered_flat_map`适用的实际场景都必须是有效实例化"，对key类型无特殊限制。

并发flat_map不给迭代器，用visit代替。乐观插入冲突率百万分之几，够低。

### [boost::concurrent_flat_map批量访问](https://bannalia.blogspot.com/2023/10/bulk-visitation-in-boostconcurrentflatm.html)

**单次访问示例：**

```cpp
boost::concurrent_flat_map<int, int> m;
...
// 找key为k的元素并递增关联值
m.visit(k, [](auto& x) {
  ++x.second;
});
```

**基于循环方式（批量访问之前）：**

```cpp
std::array<int, N> keys;
...
for(const auto& key: keys) {
  m.visit(key, [](auto& x) { ++x.second; });
}
```

**批量访问API：**

```cpp
m.visit(keys.begin(), keys.end(), [](auto& x) { ++x.second; });
```

更简洁的语法替代上面的循环模式。批量版本通过内部流水线更高效处理多个key，预取连续操作的内存，消除cache miss停顿。

批量访问用流水线，cache miss少很多。

### [Windows为什么还在折腾临界区](https://devblogs.microsoft.com/oldnewthing/20250924-00/?p=111624)

Raymond Chen解释Windows继续优化临界区的三个主要原因：

1. **性能问题**：几十年后bug可能罕见，但性能问题持续存在。Chen指出"小的性能问题累积成大问题"，因为临界区用得太多了。

2. **非分页池压力**：优化临界区减少内存占用成本。Chen解释，"即使非分页池的小成本乘以大量临界区，也会导致非分页池压力过大。"

3. **优先级反转缓解**：最近变化解决优先级反转问题，Windows 11 24H2"把更多工作移到用户模式，避免之前需要内核模式转换的一些情况。"

Chen总结，尽管是"老狗"，临界区继续演化处理比三十年前"更大、更快、更并发"的现代计算需求。

临界区用了几十年，还在优化。性能问题永远存在。

### [为什么好的PR总结很重要](https://shafik.github.io/software%20development/2025/09/22/why-summaries-are-important-for-prs.html)

**核心目的：**

好的PR总结最小化审查者时间和上下文切换。作者指出，"好的总结应该减少审查者去编辑器检查更大周围代码的需要。"

**What、Why、How框架：**

有效总结应该解决三个要素：
- **What**：做了哪些具体改变
- **Why**：改变背后的动机
- **How**：使用的设计选择和技术方法

**对审查者的好处：**

总结是代码审查的入口点。通过预先提供关键上下文，作者使审查者能开始评估而不立即离开PR，保持专注和生产力。

**不同PR类型的特殊考虑：**

*Bug修复*需要关于底层问题的上下文以及解决方案如何解决它，加上相关技术参考。

*功能*应该引用提案、RFC和文档，解释功能如何与现有代码集成。

**橡皮鸭效应：**

写总结强迫作者清楚地阐述他们的解决方案。这个过程经常揭示理解中的缺陷或空白，促使审查前改进——节省所有人时间。

**下游影响：**

在大型开源项目中，详细总结帮助下游消费者快速识别集成期间哪个上游提交导致问题。

PR不写清楚，审查者累死。写总结能逼自己想清楚。

### [GSoC 2025 - LLVM IR的字节类型](https://blog.llvm.org/posts/2025-08-29-gsoc-byte-type/)

**核心概念：**

字节类型是LLVM IR中新的一等类型，设计用来表示原始内存值。文章指出，"字节类型是一等单值类型，与等效大小的整数类型有相同的大小和对齐。"

**关键技术特性：**

**来源跟踪**：不像整数，字节类型保留指针来源信息，支持通过内存准确拷贝指针而不丢失别名信息。

**位级别poison表示**：字节类型可以表示单独的poison位而不是污染整个值，不像整数类型要么完全poisoned要么完全定义。

**新指令：**

**bytecast**：转换字节值到其他原始类型，两个变体：
- 标准版本允许类型双关（pointer↔non-pointer转换）
- Exact flag版本如果类型不匹配返回poison，防止不安全转换

**bitcast**：支持原始类型与等效大小字节类型间的转换

**支持的操作**：trunc和lshr（shift量只能是8的倍数）

**代码示例：安全的memcpy：**

```llvm
define ptr @my_memcpy(ptr %dst, ptr %src, i64 %n) {
  %byte = load b8, ptr %arrayidx
  store b8 %byte, ptr %arrayidx1
  ret ptr %dst
}
```

**实际影响：**

字节类型修复InstCombine和SROA中之前将memcpy/memmove降低为整数load/store对的不健全优化，在20个应用上基准测试显示最小性能开销。

LLVM加了字节类型，memcpy更安全了。

### [静态链接能用weak函数吗？Visual C++：家里有](https://devblogs.microsoft.com/oldnewthing/20251003-00/?p=111650)

**Visual C++方法：**

Visual C++没有像ELF对象那样的原生"weak函数"支持，但通过经典链接模型实现等效功能。Raymond Chen解释，**"你可以用OBJ或另一个LIB覆盖LIB"**。

**实现方法：**

1. **库放置**：在库文件（.LIB）中定义fallback函数
2. **链接器解析顺序**：链接器先搜索对象文件，然后依次搜索库文件
3. **覆盖机制**：应用程序在OBJ文件中提供的定义优先于库定义

**实际应用：**

这个方法用于**"为单元测试创建扩展点来覆盖功能"**，允许测试代码替换实现，同时保持库的默认行为。

**重要区别：**

文章澄清静态链接的weak函数**不同于动态链接**。Windows不支持DLL的weak符号；动态场景可以用延迟加载作为变通。

**工作原理：**

链接器遵循这个优先级：OBJ文件 → LIB文件（按顺序）。如果符号在OBJ中未解析，链接器遍历库直到找到匹配，使库定义充当fallback。

链接器顺序就是优先级，OBJ覆盖LIB。变相实现weak函数。

### [buffalo::buffalo::buffalo...](https://blog.ganets.ky/Buffalo/)

**现象：**

博客探索C++的注入类名（injected-class-name）机制如何支持写出语法正确的句子作为有效代码。著名示例：

```cpp
struct buffalo {
    buffalo();
};
buffalo::buffalo::buffalo::buffalo::buffalo::buffalo::buffalo::buffalo() {
    // ...
}
```

这能编译成功，镜像语言学句子"Buffalo buffalo Buffalo buffalo buffalo buffalo Buffalo buffalo."

**关键机制：注入类名**

在类作用域内，"当前类的类名或当前类模板的模板名被视为好像是公共成员名"。

这意味着`buffalo::buffalo`实际上无限引用自己。作者演示这个模式无论链接多少次命名空间限定符都产生相同的AST。

**实际应用：**

注入类名支持几种构造：
- 带重复类名的外部构造函数定义
- 用链式语法的变量声明：`struct buffalo::buffalo::buffalo b{};`
- 嵌套模板的正确析构函数命名（至少需要一次注入类名出现）

**第二个例子：**

文章用另一个有效句子实现"James while John had had had had had..."：

```cpp
namespace james_while_john {
    struct had {
        void a_better_effect_on_the_teacher();
    };
};
void james_while_john::had::had::had::had::had::had::had::had::had::had::had::a_better_effect_on_the_teacher() {
}
```

这演示注入类名机制如何支持编写镜像语法复杂英文句子的代码。重复的`::had::`限定符能work，因为类名在自己作用域内作为成员可用，支持这种不寻常但有效的语法模式。

C++语法能玩成绕口令，注入类名功劳。

### [超越论文：AI时代重新思考科学](https://lemire.me/blog/2025/10/03/beyond-papers-rethinking-science-in-the-era-of-artificial-intelligence/)

**同行评审的问题：**

Lemire主张用同行评审出版物定义科学是最近的循环惯例。"科学家是能写论文并让两到四个其他科学家评审后得出工作可信结论的人"，更像社交俱乐部而不是严格方法论。同行评审在1970年代才占主导，恰好科学停滞时期。

**AI威胁当前模型：**

大语言模型现在能产生与人类写的研究无法区分的论文，让同行评审——Lemire称之为"比图灵测试更容易通过的测试"——作为质量指标实际上过时了。

**前进之路：**

不应该用出版产出衡量科学家，焦点应该转向实际科学进步。Lemire指出，像Google DeepMind和OpenAI这样的组织证明有意义的进展发生在传统同行评审结构之外，暗示科学家应该优先考虑问题解决和实际影响而不是论文。

**核心问题：**

为什么研究者要花精力生产ChatGPT几秒钟就能生成的论文？答案在于重新定义什么构成合法的科学贡献。

AI能生成论文了，同行评审还有啥意义？该看实际贡献了。

## 开源项目介绍

- [asteria](https://github.com/lhmouse/asteria) 一个脚本语言，可嵌入，长期找人，希望胖友们帮帮忙，也可以加群753302367和作者对线


---

[上一期](https://wanghenshui.github.io/cppweeklynews/posts/191.html)

[本期](https://wanghenshui.github.io/cppweeklynews/posts/192.html)

[下一期](https://wanghenshui.github.io/cppweeklynews/posts/193.html)
