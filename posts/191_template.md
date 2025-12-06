---
layout: post
title:  第191期
---
# C++ 中文周刊 2025-12-06 第191期


[周刊项目地址](https://github.com/wanghenshui/cppweeklynews)

公众号

<img src="https://wanghenshui.github.io/cppweeklynews/assets/code.png" alt=""  width="30%">

点击「查看原文」跳转到 GitHub 上对应文件，链接就可以点击了

qq群 753792291 答疑在这里

[RSS](https://github.com/wanghenshui/cppweeklynews/releases.atom)

欢迎投稿，推荐或自荐文章/软件/资源等，评论区留言

本期文章由 赞助老爷 赞助 在此表示感谢



`TODO https://www.meetingcpp.com/blog/blogroll/`
---

## 资讯

标准委员会动态/ide/编译器信息放在这里

[编译器信息最新动态推荐关注hellogcc公众号 本周更新 2025-01-08 第288期](https://mp.weixin.qq.com/s/jMaR7QyCD40uCAKJSyLw6A)

[性能周刊](https://mp.weixin.qq.com/s/rkoBXmzhrbhvN4AEmBHS7w)


## 文章

### [为什么不能分发 C++ 二进制模块接口](https://mysteriouspreserve.com/blog/2025/11/16/Why-Cannot-Distribute-Cpp-Module-BMI/)

YexuanXiao 投稿

这篇文章从AST（抽象语法树）不一致的角度解释了为什么C++的BMI（二进制模块接口）文件没法跨编译器分发。

作者列了六个导致AST不一致的原因：

1. **编译器特定的宏**：不同编译器定义不同的预处理符号，比如`__clang__`或者`_MSC_VER`
2. **用户可配置的宏**：像`NDEBUG`、`_UNICODE`这些宏会影响库的功能
3. **C++标准版本差异**：不同的语言标准会导致标准库和第三方库暴露不同的特性
4. **实现定义的行为**：编译器参数控制的行为，比如字符编码(`-fexecution-charset`)和类型符号性(`-funsigned-char`)
5. **编译器实现细节**：不同的内建函数支持和内部类型表示
6. **扩展差异**：编译器支持的扩展不同，比如`__int128_t`在GCC/Clang有但MSVC没有

关键点在于，**所有导致AST不同的行为都会违反ODR规则**。这不是模块特有的问题，头文件也有同样的问题。但模块会把编译器特定的构造保存在AST里，导致BMI文件没法跨工具链兼容。

笔者：说白了就是想法很美好，现实很骨感。模块本来想解决头文件的问题，结果发现跨编译器分发BMI这事儿根本不靠谱，因为每个编译器都有自己的小九九。还是老老实实分发源码吧。

### [可预测的内存访问快得多](https://lemire.me/blog/2025/08/15/predictable-memory-accesses-are-much-faster/)

Daniel Lemire测试了64 MiB数组上五种不同的访问模式，用来说明现代处理器的硬件预取有多智能。

五种访问模式：
1. **顺序访问** - 按顺序每隔8个整数读一个
2. **随机访问** - 随机顺序读每隔8个整数
3. **反向访问** - 从末尾开始顺序读
4. **交错访问** - 在数组的前半部分和后半部分之间交替
5. **跳跃访问** - 从开始和末尾位置交替读取

测试结果：除了纯随机访问，其他所有模式都快得多。随机访问性能差是因为硬件预取器没法预测不可预测的内存位置。

笔者：这个结果其实不意外，顺序访问对cache友好是常识。但有意思的是，即使是反向访问、交错访问这种看起来不太规则的模式，CPU的预取器也能识别出规律来优化。现代处理器是真的聪明，别瞎写代码糟蹋它。

### [使用concepts时要配合std::remove_cvref_t](https://www.sandordargo.com/blog/2025/08/13/use-concepts-with-remove_cvref)

当你用转发引用和concept的时候，引用限定的类型会导致问题：

```cpp
template<Quantity Q> void foo(Q&& q);
```

当你传一个`MyQuantity`左值时，模板参数`Q`会推导成`MyQuantity&`而不是`MyQuantity`。还可能是`const MyQuantity&`、`MyQuantity&&`或者`volatile MyQuantity`。

concept必须接受所有这些形式，但如果你的concept假设是纯值类型，编译就会失败。

**问题示例：**

```cpp
template<typename T>
concept Quantity = requires(T t) {
    typename T::unit;
};

struct Gram { using unit = int; };

template<Quantity Q> void foo(Q&& q) { }

int main() {
    Gram g;
    foo(g); // 错误：Q推导成Gram&，失败
}
```

问题在于：通过引用限定的类型访问`T::unit`会导致concept检查失败。

**解决方案：**

在应用concept之前先剥掉引用和const/volatile限定符：

```cpp
template<typename Q>
requires Quantity<std::remove_cvref_t<Q>>
void foo(Q&& q);
```

`std::remove_cvref_t`会在concept检查前移除`Q`的所有引用和cv限定符，确保concept验证的是实际的值类型而不是限定后的推导类型。

**权衡：**

这种方法牺牲了可读性，但能保证正确性。文章提到"C++26会带来解决方案"来解决这个冗长问题。

笔者：这是个经典的坑。用转发引用的时候很容易忘记`Q`其实是个引用类型。`std::remove_cvref_t`是个好东西，用concept的时候基本上都得配合它用。不过写起来确实啰嗦，期待C++26能简化一下。

### [未定义引用错误：模板特化缺失](https://marcofoco.com/blog/2025/08/21/undefined-reference/)

当你定义一个模板函数但只有特化没有基础实现时，未特化的模板类型会产生链接时错误：

```cpp
template<typename T> T get();

template<>
int get<int>() {
    return 1;
}
```

尝试调用`get<short>()`会导致"undefined reference"错误（gcc/clang）或者"unresolved external symbol"（MSVC）。这些错误在构建过程后期出现，没有行号，在大型代码库里调试很困难。

**解决方案：**

"直接**delete掉基础情况**"，文章这么说的。把未定义的基础模板替换成：

```cpp
template<typename T> T get() = delete;

template<>
int get<int>() {
    return 1;
}
```

现在尝试`get<short>()`会产生**编译时错误**，带着具体的行号，立即定位到问题发生的地方。

**为什么有用：**

使用`= delete`（C++11通过缺陷报告DR 941引入的特性）把链接时失败转换成编译时失败，让开发者能直接在源码处捕获特化缺口，而不是在链接时才发现。

笔者：这个技巧简单但实用。链接错误真的烦，尤其是大项目里，找半天都不知道哪里调用了未特化的模板。直接delete掉，编译器马上告诉你哪里有问题，省事儿。

### Raymond Chen tracking pointer系列

Raymond Chen写了16篇系列文章，讲如何实现一个tracking pointer（跟踪指针），这种智能指针能跟随对象在内存中的移动。

- [Part 1: 概念设计](https://devblogs.microsoft.com/oldnewthing/20250811-00/?p=111451)
- [Part 2: std::list实现](https://devblogs.microsoft.com/oldnewthing/20250812-00/?p=111454)
- [Part 3: std::vector实现](https://devblogs.microsoft.com/oldnewthing/20250813-00/?p=111459)
- [Part 4: 循环双向链表](https://devblogs.microsoft.com/oldnewthing/20250814-00/?p=111482)
- [Part 5: 拷贝tracking pointer](https://devblogs.microsoft.com/oldnewthing/20250815-00/?p=111484)
- [Part 6: 非修改trackers](https://devblogs.microsoft.com/oldnewthing/20250818-00/?p=111486)
- [Part 7: 非修改trackers再尝试](https://devblogs.microsoft.com/oldnewthing/20250819-00/?p=111488)
- [Part 8: 跟踪const对象](https://devblogs.microsoft.com/oldnewthing/20250820-00/?p=111490)
- [Part 9: 转换](https://devblogs.microsoft.com/oldnewthing/20250821-00/?p=111492)
- [Part 10: 正确的转换](https://devblogs.microsoft.com/oldnewthing/20250822-00/?p=111494)
- [Part 11: 修复赋值](https://devblogs.microsoft.com/oldnewthing/20250825-00/?p=111497)
- [Part 12: shared tracking pointer](https://devblogs.microsoft.com/oldnewthing/20250826-00/?p=111506)
- [Part 13: 恢复强异常保证](https://devblogs.microsoft.com/oldnewthing/20250827-00/?p=111518)
- [Part 14: 非抛异常移动](https://devblogs.microsoft.com/oldnewthing/20250828-00/?p=111524)
- [Part 15: 自定义shared pointer](https://devblogs.microsoft.com/oldnewthing/20250829-00/?p=111526)
- [Part 16: 再次尝试list](https://devblogs.microsoft.com/oldnewthing/20250901-00/?p=111537)

#### 核心概念

tracking pointer的关键思想是：**跟踪对象的内容而不是内存地址**。当你移动构造一个对象时，现有的tracking pointer会自动更新到新位置。

设计规则：
- 对象从头构造时，没有初始的tracking pointer指向它
- 拷贝构造不转移pointer tracking，只有移动构造才转移
- 移动构造期间，任何指向源对象的tracking pointer现在跟踪新对象
- 移动赋值把pointer tracking转移到目标对象
- 被覆盖对象的现有指针会过期

关键限制：**这本质上是个单线程概念**。没有机制防止对象重定位期间的并发访问。

#### 实现方案1：std::list

最简单的想法是用`std::list`存储指针，但有个问题：

```cpp
trackable_object& operator=(trackable_object&& other) {
    m_trackers.clear();  // 让现有的tracking pointer都失效
    m_trackers = std::move(other.m_trackers);  // 可能抛异常！
    update_all_pointers();
    return *this;
}
```

这个实现的问题是移动赋值可能抛异常，破坏了强异常保证。

#### 实现方案2：std::vector

换成`std::vector`也有类似问题，而且vector在增长时需要重新分配内存，性能不好。

#### 实现方案3：循环双向链表（最佳方案）

核心思想：**tracking pointer本身就是链表的节点**。

```cpp
struct tracking_node {
    tracking_node* next;
    tracking_node* prev;
};
```

三种构造模式：
- **Solo**：节点形成自己的独立循环链表
- **Join**：节点连接到现有的循环链表
- **Displace**：节点加入链表的同时移除另一个节点

关键方法：
- `unlink()`：通过更新邻居指针从链表中移除节点
- `relink()`：更新邻居让它们指回当前节点
- `reset()`：返回到solo状态（自引用）
- `disconnect()`：结合unlink和reset
- `join()`：连接到另一个节点的链表
- `displace()`：替换链表中的另一个节点

```cpp
template<typename T>
struct tracking_ptr : tracking_ptr_base<std::remove_cv_t<T>>
{
private:
    using base = tracking_ptr_base<std::remove_cv_t<T>>;
    using MP = tracking_ptr<std::remove_cv_t<T>>;

public:
    T* get() const { return this->tracked; }

    using base::base;
    tracking_ptr(MP const& other) : base(other) {}
    tracking_ptr(MP&& other) : base(std::move(other)) {}
};
```

**关键优势：所有tracking pointer操作都是noexcept，因为它们从不分配内存。**

#### 实现方案4：shared_ptr间接

另一种思路是用`shared_ptr<T*>`实现O(1)的对象移动复杂度：

```cpp
template<typename T>
struct tracking_ptr_base
{
    tracking_ptr_base() noexcept = default;
private:
    friend struct trackable_object<T>;
    tracking_ptr_base(std::shared_ptr<T*> const& ptr) noexcept :
        m_ptr(ptr) { }
protected:
    std::shared_ptr<T*> m_ptr;
};
```

这个方案用了间接层：每个trackable object维护一个指向指针的shared pointer。所有tracking pointer引用同一个shared pointer，实现单点更新语义。

权衡：构造函数因为需要分配内存变成了可能抛异常的。

为了恢复强异常保证，移动赋值需要小心处理：

```cpp
trackable_object& operator=(trackable_object&& other) {
    *std::exchange(m_tracker, other.transfer_out()) = nullptr;
    set_target(owner());
    return *this;
}
```

关键原则：**在最后一个可能抛异常的点之前，不能做任何不可逆的改变。**

#### 实现方案5：自定义引用计数

为了避免`shared_ptr`的开销，可以自己实现一个简单的引用计数：

```cpp
struct data
{
    data(T* tracked) noexcept : m_tracked(tracked) {}
    unsigned int m_refs = 1;
    T* m_tracked;
};

struct deleter
{
    void operator()(data* p)
    {
        if (--p->m_refs == 0)
        {
            delete p;
        }
    }
};
```

用`std::unique_ptr`配合自定义deleter来管理清理，减少模板代码量。这个实现是非线程安全的，针对单线程使用优化。

笔者：循环链表方案最优雅，noexcept是关键。实际用的少，但能学到移动语义和异常安全。

### [为什么我们需要SIMD指令？](https://lemire.me/blog/2025/08/09/why-do-we-even-need-simd-instructions/)

Daniel Lemire用字符搜索的例子说明了SIMD的必要性。

**朴素实现：**

```cpp
const char* naive_find(const char* start, const char* end, char character) {
    while (start != end) {
        if (*start == character) {
            return start;
        }
        ++start;
    }
    return end;
}
```

这个函数逐字符迭代，每次检查当前字符是否匹配目标字符。

**性能对比（Apple M4处理器）：**

| 实现方式 | 性能 |
|---|---|
| 朴素搜索 | 4 GB/s |
| simdutf::find (SIMD) | 110 GB/s |

**SIMD版本快了20倍以上**，因为它大幅减少了所需的指令数量。

性能细节：
- 朴素实现每个字符需要大约6条CPU指令
- SIMD方法每16字节块使用大约4条指令
- 结果：**每个输入字符的指令数减少了20倍以上**

作者指出，如果没有SIMD优化，字符串搜索吞吐量（~4 GB/s）会低于典型的磁盘带宽（5-15 GB/s），这让SIMD在实际应用中几乎是必需的。

笔者：这个例子很直观。4 GB/s vs 110 GB/s，差距大到离谱。不用SIMD的话，CPU处理速度都跟不上硬盘读取速度，那还玩个屁。现在的字符串库、JSON解析库基本都用SIMD优化了，不然根本没法跟别人竞争。不过SIMD代码写起来确实麻烦，可读性差，维护成本高。好在有simdutf这种现成的库可以用。

### [auto返回类型的隐藏编译时成本](https://andreasfertig.com/blog/2025/09/efficient-cpp-the-hidden-compile-time-cost-of-auto-return-types/)

Andreas Fertig测量了auto返回类型对编译时间的影响。

**代码示例：**

不用auto：
```cpp
int Fun(bool b, int val) {
  if(b) {
    return val * 2;
  } else {
    return val / 2 * 3;
  }
}
```

用auto：
```cpp
auto Fun(bool b, int val) {
  if(b) {
    return val * 2;
  } else {
    return val / 2 * 3;
  }
}
```

**编译时间测量结果（Clang 19，单个翻译单元）：**

- **不用auto：** ExecuteCompiler耗时6.499ms
- **用auto：** ExecuteCompiler耗时8.114ms
- **差异：** 大约慢1.5ms（增加约25%）

**关键发现：**

当在头文件中使用auto返回类型时，会出现一个额外的编译步骤叫"ParseFunctionDefinition"。这是因为**编译器在解析声明时必须查找函数定义**。不用auto的话，编译器会推迟解析函数体，直到实际调用它。

**建议：** 为了优化构建时间，在头文件函数中避免使用auto返回类型。

25%的编译时间增长，我操

### [处理器越来越宽](https://lemire.me/blog/2025/09/01/processors-are-getting-wider/)

现代处理器通过超标量执行提升性能——每个时钟周期同时执行多条指令。因为频率限制在~5 GHz（散热问题），厂商就加执行单元。

处理器能力：
- 标准x86-64处理器：每周期通常一次乘法
- 最新Apple处理器：每周期超过8条指令，两次乘法能力
- AMD Zen 5：三个专用乘法执行单元，通用64位寄存器上可能每周期3次乘法

向量寄存器操作：Zen 5有"四个512位寄存器执行单元，其中两个能做乘法"，通过寄存器打包同时处理多个值。

关键点：更宽的处理器设计需要复杂的架构支持："你得把数据送到这些单元，得安排计算顺序，处理分支"。不是简单加执行单元就完事。

加宽比加核心，能榨干单线程性能。不过写代码也得配合，乱写一通CPU再宽也没用。

### [C++ nth_element算法](https://mariusbancila.ro/blog/2025/09/02/what-is-the-cpp-nth_element-algorithm/)

`nth_element()`做部分排序，把第n个位置的元素改成排序后应该在那个位置的元素。

特点：
- 第n个位置之前的元素≤第n个元素（无序）
- 之后的元素≥第n个元素（无序）
- 零基索引

**基础示例：**

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

int main()
{
    std::vector<int> v {9, 4, 3, 8, 1, 2, 1, 8, 7, 6};
    auto mid = v.begin() + v.size() / 2;
    std::nth_element(v.begin(), mid, v.end());

    for(auto const & e : v)
        std::cout << e << " ";
}
// 输出: 2 4 3 1 1 6 8 8 7 9
```

**计算中位数：**

避免全排序O(n log n)，平均O(n)：

```cpp
double compute_median(std::vector<int> data)
{
    size_t mid = data.size() / 2;
    if (data.size() % 2 == 1) {
        std::nth_element(data.begin(), data.begin() + mid, data.end());
        return data[mid];
    } else {
        std::nth_element(data.begin(), data.begin() + mid - 1, data.end());
        int val1 = data[mid - 1];
        std::nth_element(data.begin(), data.begin() + mid, data.end());
        int val2 = data[mid];
        return (val1 + val2) / 2.0;
    }
}
```

**找最小N个元素：**

```cpp
std::vector<int> v {9, 4, 3, 8, 1, 2, 1, 8, 7, 6};
int n = 3;

std::nth_element(v.begin(), v.begin() + n, v.end());
std::sort(v.begin(), v.begin() + n);
// 前3个元素现在是排序后的最小值
```

**找最大N个元素：**

```cpp
std::nth_element(v.begin(), v.begin() + n, v.end(), std::greater<>{});
std::sort(v.begin(), v.begin() + n);
```

应用场景：统计计算、图像处理（中值滤波）、排行榜Top N、性能监控、快排优化。

不需要全排序就别用sort，nth_element快得多。算中位数、百分位数这种场景特别有用。

### [C++26: Concept和变量模板作为模板参数](https://www.sandordargo.com/blog/2025/08/20/cpp26-P2841)

提案P2841R7被C++26接受，允许concept和变量模板作为模板参数，解决当前模板元编程的可读性和性能问题。

**之前的冗长约束：**

```cpp
template<typename Q>
requires Quantity<std::remove_cvref_t<Q>>
void foo(Q&& q);
```

**之后的Concept模板模板参数：**

```cpp
template <typename T, template <typename> concept C>
concept decays_to = C<std::decay_t<T>>;

template <decays_to<Quantity> Q>
void foo(Q&& q);
```

**变量模板模板参数：**

之前：
```cpp
template <template <typename> typename p, typename... Ts>
constexpr std::size_t count_if_v = (... + p<Ts>::value);
```

之后：
```cpp
template <template <typename> auto p, typename... Ts>
constexpr std::size_t count_if_v = (... + p<Ts>);
```

去掉`::value`，消除不必要的类模板实例化开销。

**统一模板参数语法：**

```cpp
template<
    template <typename T> typename TT,    // 类模板
    template <typename T> concept C,      // Concept
    template <typename T> auto VT         // 变量模板
>
```

好处：更清晰的语法、减少样板代码、提升编译时性能、更有表达力。

模板元编程能少写不少boilerplate

### [C++26的template for和:expand:](https://ib-krajewski.blogspot.com/2025/08/whats-fuss-about-template-for-and.html)

**Template For循环（提议中）：**

反射用的`template for`语法：

```cpp
template <typename E>
constexpr std::string enum2Strg(E value) {
    template for (constexpr auto e : std::meta::enumerators_of(^^E)) {
        if (value == [:e:])
            return std::string(std::meta::identifier_of(e));
    }
    return "???";
}
```

**:expand:临时方案（当前替代）：**

因为`template for`还没标准化，现在用这个等价模式：

```cpp
[:expand(std::meta::enumerators_of(^^E)):] >> [&]<auto e>{
    if (value == [:e:]) {
        result = std::meta::identifier_of(e);
    }
};
```

**实际例子：命令行解析器：**

```cpp
template <typename Opts>
consteval auto parse_options(std::span<const std::string_view> args) -> Opts
{
    Opts opts;
    template for (constexpr auto dm : nonstatic_data_members_of(^^Opts)) {
        // 查找匹配参数
        auto it = std::ranges::find_if(args,
            [](std::string_view arg) {
                return arg.starts_with("--") &&
                arg.substr(2) == identifier_of(dm);
            });

        // 解析并赋值
        using T = typename[:type_of(dm):];
        auto iss = std::ispanstream(it[1]);
        if (iss >> opts.[:dm:]; !iss) {
            // 错误处理
        }
    }
    return opts;
}
```

关键点：`:expand:`只是临时workaround，等`template for`标准化。

不过现在还是提案阶段，`:expand:`这语法看着有点怪。

### Raymond Chen C++/WinRT系列：非Windows Runtime类型的IAsyncOperation

[Part 1](https://devblogs.microsoft.com/oldnewthing/20250903-00/?p=111546) | [Part 2](https://devblogs.microsoft.com/oldnewthing/20250904-00/?p=111557)

**问题：**`IAsyncOperation<T>`中的T必须是Windows Runtime类型，因为接口ID生成算法只对WinRT类型有效。

**解决方案1：用其他协程库**

用`cppcoro::task<T>`、`wil::task<T>`或`concurrency::task<T>`，它们支持任意C++类型。

**解决方案2：输出参数模式**

通过`shared_ptr`传结果而不是返回值：
- 需要构造的类型：`shared_ptr<std::optional<Widget>>`
- 便宜构造的类型：`shared_ptr<Widget>`

保证结果对象活到协程完成，防止内存损坏。

**解决方案3：IInspectable包装器**

创建实现`IInspectable`的包装结构，隐藏非WinRT类型：

```cpp
struct IValueAsInspectable : ::IUnknown
{
    std::type_info const* type;

    template<typename T>
    T& get_value()
    {
        if (*type != typeid(T)) {
            throw std::bad_cast();
        }
        return static_cast<ValueAsInspectable<T>*>(this)->value;
    }
};

template<typename T>
struct ValueAsInspectable :
    winrt::implements<ValueAsInspectable<T>,
    winrt::Windows::Foundation::IInspectable,
    IValueAsInspectable>
{
    T value;

    template<typename...Args>
    ValueAsInspectable(Args&&... args) :
        value{ std::forward<Args>(args)... }
    {
        this->type = std::addressof(typeid(T));
    }
};
```

返回包装后的值，接收端用`get_self()`提取。通过`std::type_info`比较做运行时类型检查，类型错误抛`std::bad_cast`。


### [Non-owning Range](https://hannes.hauswedell.net/post/2025/05/17/non-owning-range/)

非所有权range不管理元素内存。区分：
- **Non-owning ranges**：O(1)时间可拷贝
- **Borrowed ranges**：迭代器生命周期超过range对象的non-owning range

**String View（Non-Owning Borrowed Range）：**

```cpp
std::string_view s  = "foobar";      // 绑定到静态存储 [O(1)]
std::string_view s2 = s;             // 绑定到同一存储 [O(1)]

char c = *std::ranges::min_element(s);
assert(c == 'a');

char d = *std::ranges::min_element(std::string_view{"foobar"});
assert(d == 'a');
```

关键点：拷贝`string_view`是O(1)，因为只存指针，不存底层数据。

**C++20 Range适配器：**

标准库限制：
```cpp
std::vector vec{-1, 2, -3, 1, 7};
auto non_neg = [] (int i) { return i >= 0; };

auto it1 = std::ranges::min_element(vec | std::views::filter(non_neg));
// 问题：filter_view永远不是borrowed
```

RADR库解决方案：
```cpp
auto it2 = std::ranges::min_element(std::ref(vec) | radr::filter(non_neg));
assert(*it == 1);  // 有效：所有radr适配器在左值上都是borrowed
```

标准库的range适配器在borrowed这块设计有缺陷，RADR算是个补丁。


## 开源项目介绍

- [asteria](https://github.com/lhmouse/asteria) 一个脚本语言，可嵌入，长期找人，希望胖友们帮帮忙，也可以加群753302367和作者对线


---

[上一期](https://wanghenshui.github.io/cppweeklynews/posts/190.html)

[本期](https://wanghenshui.github.io/cppweeklynews/posts/191.html)

[下一期](https://wanghenshui.github.io/cppweeklynews/posts/192.html)
