# 为 React 和 epub.js 在 iPadOS Safari 上构建自定义文本高亮解决方案的架构指南

## 引言

在构建功能丰富的跨平台 Web 应用时，开发者常常会遇到一些由底层操作系统和浏览器引擎的固有设计哲学所带来的挑战。本文旨在解决一个在基于 React 和 `epub.js` 的网页阅读器中遇到的具体问题：在 iPadOS Safari 环境下，自定义的文本选择菜单被系统的原生上下文菜单（Context Menu）强制覆盖。此问题并非简单的代码错误或浏览器兼容性缺陷，而是源于 Apple 对其移动操作系统用户体验和安全模型的深度集成。

iPadOS 上的原生文本编辑菜单并非一个可轻易替换的浏览器默认组件，而是一个享有特权的系统级 UI 界面 1。该菜单的设计旨在提供跨应用的一致性体验，并能安全地接入翻译、查询、共享等系统级服务。这种设计理念导致 Web 内容在其沙箱环境中，对这类原生 UI 的控制能力受到严格限制。

本报告将深入剖析 iPadOS Safari 的选择环境、`epub.js` 的 `iframe` 架构以及相关的 Web API，旨在为开发者提供一个全面的技术解析和一套切实可行的架构蓝图。报告的目标不仅是解决眼前的 UI 问题，更是要提供一套能够理解并适应平台限制的工程方法，从而构建出在严苛环境下依然稳健、可靠且用户体验良好的高亮功能。本报告将详细分析三种不同的实现策略，从技术可行性、用户体验、长期可维护性等多个维度进行评估，并最终给出一套明确的架构建议。

---

## 第一部分：iPadOS Safari 选择环境的技术深度剖析

要构建一个有效的解决方案，首先必须深刻理解问题的根源。本部分将解构 iPadOS Safari 的底层工作机制，阐明为何自定义菜单会被覆盖，并分析可用的原生 Web 技术及其局限性。这部分内容将从 Apple 的高层设计哲学延伸至 WebKit 在 iPadOS 上的具体技术行为。

### 1.1 系统级上下文菜单：一个特权 UI 组件

在 Apple 的生态系统中，用户界面的连贯性和可预测性被置于极高的优先级。文本编辑菜单（Edit Menu）是这一理念的集中体现。根据 Apple 的人机交互指南（Human Interface Guidelines），该菜单是核心操作系统体验的一部分，而非一个简单的应用级功能 1。当用户在 iPadOS 上选择文本时，系统会智能地分析所选内容的类型——例如，识别出地址、电话号码或日期——并动态地在菜单中添加相关的操作项，如“获取路线”或“创建日历事件” 1。

这种行为的实现依赖于操作系统层面的深度集成。对于原生应用开发者，Apple 提供了如 `UITextSelectionDisplayInteraction` 等一系列 API，允许应用与这个系统级菜单进行深度交互和定制 2。然而，这些强大的 API 并未对标准的 Web 内容沙箱开放。Web 页面运行在一个受限的环境中，其对系统 UI 的访问和控制能力被严格限制，这是出于安全和隐私的考量。

因此，开发者遇到的问题——自定义菜单无法显示——其根本原因在于，该问题是系统性的，而非偶然的错误。用户的预期是 Web 页面能够像在桌面浏览器中一样，完全控制右键菜单的行为。但在 iPadOS 上，文本选择触发的菜单是一个由操作系统渲染和管理的特权组件。任何试图通过标准 Web 技术直接、强制性地替换该原生菜单的尝试，都将不可避免地与平台的核心架构发生冲突。这种对抗性的方法不仅成功率低，而且极其脆弱，极易因未来 iPadOS 的系统更新而失效。理解这一点至关重要，因为它将指导我们放弃直接对抗的思路，转而寻求更具适应性和弹性的变通策略。

### 1.2 WebKit CSS `touch-callout` 属性：一把双刃剑

在 WebKit 引擎（Safari 的底层引擎）中，CSS 提供了一个专门用于控制长按行为的属性：`-webkit-touch-callout` 3。当用户在触摸屏上长按一个元素时（即“touch and hold”手势），浏览器默认会显示一个包含“拷贝”、“查询”等选项的“标注”或“气泡”菜单（callout）。将此属性设置为

`none`，可以有效地禁用这个默认菜单的弹出。

CSS

```
.epub-container {
  -webkit-touch-callout: none; /* 禁用长按时弹出的系统菜单 */
}
```

然而，`-webkit-touch-callout: none;` 是一个非常“钝”的工具。它只能实现“全有”或“全无”的效果——要么显示原生菜单，要么什么都不显示。它本身不提供任何事件钩子（hooks）或 API 来让开发者在禁用原生菜单的同时，插入一个自定义的替代品。它仅仅是取消了长按手势的默认关联动作。

更复杂的是，为了实现高亮功能，用户必须能够首先选择文本。开发者社区的讨论中经常提到，`-webkit-touch-callout: none;` 通常与另一个 WebKit 特有的 CSS 属性 `-webkit-user-select: none;` 配合使用，后者可以完全禁止用户选择元素内的文本 4。但这与我们的目标背道而驰。我们面临的挑战是：如何在允许用户进行文本选择的同时，精确地阻止原生菜单的出现。单独使用

`-webkit-touch-callout: none;` 虽然可以阻止菜单，但并不能阻止文本选择本身，这为我们后续的策略提供了一个可能性，尽管这个可能性依赖于一个非标准的、特定于 WebKit 的 CSS 属性。

### 1.3 跨平台对比分析：为何其他平台表现不同

开发者观察到自定义菜单在桌面浏览器和安卓浏览器上工作正常，这进一步凸显了 iPadOS Safari 的特殊性。这种差异源于不同平台对用户交互事件模型的不同实现。

在桌面浏览器（如 Chrome, Firefox, Safari on macOS）上，用户的鼠标右键点击会触发一个标准化的 `contextmenu` DOM 事件。这个事件的一个关键特性是它是可以被取消的。通过在事件监听器中调用 `event.preventDefault()`，Web 开发者可以完全阻止浏览器默认的右键菜单出现，从而为实现功能完备的自定义菜单提供了坚实的基础 6。

JavaScript

```
document.addEventListener('contextmenu', function(event) {
  // 阻止浏览器默认的上下文菜单
  event.preventDefault();
  // 在此处渲染自定义的 React 菜单
  showCustomMenuAt(event.clientX, event.clientY);
});
```

安卓生态系统中的浏览器，绝大多数基于 Blink 引擎（Chromium 的开源内核），在 UI 控制方面通常给予 Web 页面更大的自由度。虽然其触摸交互模型与桌面不同，但它通常不会像 iPadOS 那样强制推行一个不可更改的系统级菜单。因此，通过监听触摸事件和选择事件，开发者可以相对容易地实现自定义的交互逻辑。

相比之下，iPadOS Safari 在处理触摸和长按手势以选择文本时，其行为更接近于原生应用而非传统的 Web 页面。它不会为这个特定的交互（长按选择文本后松开）触发一个可被 `preventDefault()` 阻止的 `contextmenu` 事件。系统接管了这个交互流程，直接渲染原生 UI。正是这种事件模型的根本差异，导致了在 iPadOS 上看似简单的任务变得异常复杂。

---

## 第二部分：核心技术：掌握 Web 选择与定位

无论采用何种策略，其实现都离不开一系列标准的 Web API。这些 API 负责处理文本选择的检测、内容获取和位置计算。本部分将详细介绍这些构建模块，并特别指出它们在移动 Safari 环境下的特性和潜在问题。

### 2.1 JavaScript Selection 与 Range API

Web 平台提供了一套标准的 API 来与用户在页面上选择的文本进行交互。这个流程的起点是 `window.getSelection()` 或 `document.getSelection()` 方法 7。调用此方法会返回一个

`Selection` 对象，该对象代表了当前文档中的用户选择区或光标位置。

`Selection` 对象本身提供了诸如选区起点 (`anchorNode`)、终点 (`focusNode`) 以及选区是否为空 (`isCollapsed`) 等信息。但对于开发者而言，其最重要的方法是 `getRangeAt(0)` 9。该方法返回一个

`Range` 对象。一个 `Selection` 对象理论上可以包含多个不连续的 `Range`（例如，在 Firefox 中按住 Ctrl/Cmd 键进行多选），但在绝大多数 Web 浏览器和实际应用场景中，用户选择总是连续的，因此我们只关心索引为 0 的第一个 `Range`。

`Range` 对象是进行后续所有操作的核心。它精确地描述了选区的边界，包含了起始容器节点 (`startContainer`)、起始偏移量 (`startOffset`)、结束容器节点 (`endContainer`) 和结束偏移量 (`endOffset`) 10。这些信息不仅可以用来提取所选的 DOM 内容，更是计算选区在屏幕上位置的基础。

### 2.2 事件处理的难题：可靠地检测选择结束

要在一个文本选择完成后显示菜单，首先需要可靠地捕捉到“选择完成”这一时刻。移动 Safari 完全支持标准的 `selectionchange` 事件，该事件在 `document` 对象上触发 7。每当选区发生任何变化——无论是开始选择、拖动选择手柄调整范围，还是取消选择——该事件都会被触发。

然而，一个朴素的 `selectionchange` 事件监听器是不足以满足需求的。开发者社区的经验表明，当用户拖动选择手柄时，`selectionchange` 事件会以极高的频率被连续触发 11。如果直接在该事件的回调函数中执行显示菜单的逻辑，会导致菜单在用户刚开始选择第一个字符时就出现，并随着用户拖动手柄的每一个微小移动而不断闪烁和重新定位。这会造成极其糟糕的用户体验。

真正的目标是检测用户“完成”选择的动作。在触摸设备上，用户的完整选择手势包含了一系列的触摸事件：`touchstart`（手指按下）、`touchmove`（手指移动）和 `touchend`（手指抬起）12。一个健壮的解决方案必须将这些事件与

`selectionchange` 事件结合起来，构建一个简单的状态机来管理交互流程：

1. **状态初始化**：在监听到 `touchstart` 事件时，可以设置一个标志位，表示用户可能即将开始选择文本。
    
2. **选择过程**：在监听到 `selectionchange` 事件时，持续更新应用状态中存储的当前 `Selection` 或 `Range` 对象。此时，不应触发任何 UI 变化，只是静默地记录选区的最新状态。
    
3. **选择结束**：当监听到 `touchend` 事件时，标志着用户已经抬起了手指，完成了拖动选择的操作。这正是触发显示自定义菜单的最佳时机。此时，可以读取在 `selectionchange` 过程中记录的最终选区信息，并执行显示菜单的逻辑。
    

通过这种方式，我们可以将菜单的显示动作精确地延迟到用户交互手势的末尾，从而避免了过程中的界面闪烁，提供了更稳定、更接近原生体验的交互反馈。

### 2.3 计算位置：`getBoundingClientRect()` 及其风险

获得了代表选区的 `Range` 对象后，接下来的关键步骤是确定该选区在屏幕上的几何位置，以便在其旁边或上方定位我们的自定义菜单。标准的解决方案是调用 `range.getBoundingClientRect()` 方法 13。

此方法返回一个 `DOMRect` 对象，它包含了 `top`, `left`, `right`, `bottom`, `width`, `height` 等属性。这些属性描述了能够完全包围该 `Range` 内容的最小矩形，其坐标是相对于浏览器视口（viewport）左上角的。这个 `DOMRect` 对象为我们精确定位 React 菜单组件提供了所需的全部坐标数据。

然而，在移动 Safari 上使用 `getBoundingClientRect()` 时必须格外小心。一个关键的 Stack Overflow 帖子及相关的 WebKit 错误报告揭示，该方法在移动 Safari 上的返回值可能存在不一致性 15。尤其是在用户快速滚动页面，或者浏览器顶部的动态地址栏/工具栏因滚动而收缩或展开时，

`getBoundingClientRect()` 返回的 `top` 值可能会出现微小的、非预期的波动。它可能返回带有多个小数位的浮点数，或者与理论值存在亚像素（sub-pixel）的偏差。

这种不稳定性意味着我们的定位逻辑必须具备“防御性”，不能盲目信任 API 返回的原始值。一个健壮的实现应该遵循以下原则：

1. **数值处理**：对从 `getBoundingClientRect()` 获取的 `top` 和 `left` 值使用 `Math.round()` 进行取整，以消除浮点数不一致性带来的抖动。
    
2. **坐标系转换**：`getBoundingClientRect()` 返回的坐标是相对于视口的。如果页面是可滚动的，菜单的 `position` 属性通常会设为 `absolute`，这意味着它的定位基准是整个文档。因此，必须将视口相对坐标转换为文档绝对坐标。正确的计算方式是：`const absoluteTop = selectionRect.top + window.scrollY;`。忽略 `window.scrollY` 会导致在页面滚动后菜单定位错误。
    

遵循这些防御性编程实践，可以确保即使在复杂的移动浏览器环境下，自定义菜单也能稳定、准确地出现在预期的位置。

---

## 第三部分：驾驭 `epub.js` 的 Iframe 架构

在用户的特定场景中，最大的技术复杂性来源于 `epub.js` 的核心架构：它将 EPUB 的内容渲染在一个 `<iframe>` 元素内部。这个 `<iframe>` 构成了一个独立的文档沙箱，为事件处理、坐标计算和 DOM 访问带来了额外的挑战。

### 3.1 Iframe 沙箱：事件委托与访问

`<iframe>` 元素拥有自己独立的 `window` 和 `document` 对象，与宿主页面（父页面）的 `window` 和 `document` 是隔离开的。这意味着，为了捕捉在 EPUB 内容区域发生的文本选择事件，事件监听器必须被附加到 `iframe` 的 `contentDocument` 上，而不是父页面的 `document` 上。

直接手动操作 `iframe` 的 `contentDocument` 是一种可行但脆弱的方法。这种方法紧密耦合了我们应用的逻辑与 `epub.js` 的内部 DOM 结构。如果 `epub.js` 在未来的版本中改变了其渲染方式或 `iframe` 的管理机制，我们的代码就可能会失效。

幸运的是，`epub.js` 库提供了一个更高层次的抽象来处理这个问题。通过查阅其文档和相关的 GitHub issue，我们可以发现 `Rendition` 对象（负责图书内容的渲染和显示）提供了一套自己的事件系统 16。其中，最关键的事件是

`selected`。我们可以通过 `rendition.on('selected',...)` 来监听用户的选择操作。

JavaScript

```
rendition.on('selected', (cfi, contents) => {
  // cfi: 选区的 Canonical Fragment Identifier
  // contents: 一个代理对象，可以访问 iframe 的 window 和 document
  const selection = contents.window.getSelection();
  if (selection &&!selection.isCollapsed) {
    const range = selection.getRangeAt(0);
    // 在这里处理 range 对象
  }
});
```

这个 `selected` 事件的回调函数提供了两个至关重要的参数：`cfi`（EPUB 内容的规范片段标识符，用于持久化高亮）和 `contents` 对象。`contents` 对象是一个代理，通过它我们可以安全地访问到 `iframe` 内部的 `window` 对象，进而调用 `contents.window.getSelection()` 来获取 `Selection` 和 `Range` 对象 19。

采用 `epub.js` 提供的官方 API 是一个远比手动 DOM 操作更优越的策略。它将我们的解决方案与库的内部实现细节解耦，确保了代码的向前兼容性和可维护性，并避免了与库自身可能存在的内部事件处理器发生冲突。这体现了在与第三方库集成时，优先使用其公共 API 而非依赖其内部实现的重要工程原则。

### 3.2 坐标转换的必要性

当我们在 `iframe` 内部的 `Range` 对象上调用 `range.getBoundingClientRect()` 时，返回的 `DOMRect` 对象的坐标是相对于 `iframe` 自身视口的，而不是父页面的视口 20。如果直接使用这些坐标来定位位于父页面 DOM 树中的 React 菜单组件，其位置将会是错误的。

为了实现准确定位，必须执行一个两步坐标转换过程 20：

1. **获取 Iframe 在父页面中的位置**：首先，需要获取 `iframe` 元素本身在父页面视口中的位置。
    
    JavaScript
    
    ```
    const iframeElement = document.querySelector('.epub-view iframe'); // 选择器可能需要根据实际情况调整
    const iframeRect = iframeElement.getBoundingClientRect();
    ```
    
2. **获取选区在 Iframe 中的位置**：通过 `epub.js` 的 `selected` 事件回调，获取 `Range` 对象并计算其在 `iframe` 视口中的位置。
    
    JavaScript
    
    ```
    const selectionRect = range.getBoundingClientRect();
    ```
    
3. **合并坐标**：将两个坐标系的坐标相加，得到选区在父页面视口中的最终绝对位置。
    
    JavaScript
    
    ```
    const finalTop = iframeRect.top + selectionRect.top;
    const finalLeft = iframeRect.left + selectionRect.left;
    ```
    

这个坐标转换步骤是确保自定义菜单能够精确地显示在用户所选文本旁边的关键，是任何基于浮动菜单的解决方案都不可或缺的一环。

### 3.3 焦点管理：一个看不见的障碍

在解决了事件监听和坐标定位之后，还存在一个更为隐蔽但同样致命的障碍：焦点管理。来自 Radix UI 库的一个 GitHub issue 精确地描述了这个问题：在 Safari 上，当一个自定义的上下文菜单出现时，页面上原有的文本选择会被意外地清除 22。

这种现象的根本原因在于焦点（focus）的转移。当一个新的 UI 元素（我们的自定义菜单）被渲染到 DOM 中，尤其是当它包含可交互的子元素（如 `<button>`）时，它可能会自动获取焦点，成为文档中的 `activeElement`。在 Safari 中，当焦点从主文档内容区域转移到其他地方时，浏览器会认为用户的选择操作已经结束或被中断，因此会清除当前的 `Selection` 对象。

这意味着，我们的自定义菜单不仅仅是显示出来就足够了，它还必须以一种“非侵入式”的方式显示，即不能窃取当前文档的焦点。如果菜单的出现导致了 `Selection` 的清除，那么这个菜单就失去了它所要操作的目标，整个高亮功能也就无从谈起。

因此，在实现 React 菜单组件时，必须明确地处理焦点行为。有几种可能的方法：

- **避免可聚焦元素**：如果菜单只是显示信息，不包含按钮等本身即可聚焦的元素，问题可能不那么严重。
    
- **阻止自动聚焦**：对于包含按钮的菜单，需要在组件渲染逻辑中采取措施。例如，在使用一些第三方 tooltip 或 popover 库时，需要查找并设置相关属性，以阻止其在打开时自动聚焦。在 Radix UI 的案例中，解决方案是在其弹出层组件的 `onOpenAutoFocus` 事件回调中调用 `event.preventDefault()` 22。
    
- **手动管理焦点**：在更复杂的情况下，可能需要在菜单显示后，通过编程方式将焦点重新设置回文档的 `body` 或其他合适的元素上。
    

这个问题凸显了在开发复杂 UI 交互时，除了可见的布局和样式之外，还必须关注诸如焦点管理这样的“不可见”状态。对于 iPadOS Safari 这种行为严格的平台，忽略这一点将直接导致功能的彻底失败。许多标准的弹窗库（S42-S47）被设计为模态对话框，其默认行为就是捕获焦点，因此在不经详细配置的情况下，它们可能不适用于此场景。

---

## 第四部分：可行的实现蓝图

综合以上分析，我们将理论转化为三种具体的、可操作的实现策略。每种策略都有其独特的实现路径和优缺点权衡。

### 4.1 策略 A：完全重写方法

概念：

这是一种最直接、最大胆的策略。它旨在完全绕过并取代 iOS 的原生交互，通过 CSS 强制禁用系统菜单，然后利用 JavaScript 从零开始构建一套自定义的选择和菜单系统。

**实施步骤**：

1. **禁用原生菜单**：在 `epub.js` 渲染容器的父元素上应用 CSS 规则 `-webkit-touch-callout: none;`。这将阻止在长按文本时弹出任何系统级菜单。
    
2. **监听选择事件**：使用 `epub.js` 提供的 `rendition.on("selected",...)` 事件作为核心触发器。如第二部分所述，结合 `touchstart` 和 `touchend` 事件来精确判断选择的开始和结束，以获得最佳的用户体验。
    
3. **获取选区信息**：在事件回调中，从 `contents` 对象获取 `Range` 对象，并提取所需的文本内容。
    
4. **计算菜单位置**：执行第三部分详述的坐标转换逻辑，即获取 `iframe` 和 `Range` 各自的 `getBoundingClientRect()`，然后将它们相加以得到在父页面视口中的最终坐标。同时，要加上 `window.scrollY` 以适应页面滚动。
    
5. **状态管理与渲染**：使用 React 的 `useState` Hook 来管理菜单的状态，包括其可见性 (`isOpen`)、位置 (`{top, left}`) 以及所选内容 (`selectionText`)。
    
    JavaScript
    
    ```
    const = useState({
      isOpen: false,
      top: 0,
      left: 0,
      text: ''
    });
    ```
    
6. **条件渲染菜单**：在你的 React 组件中，根据 `menuState.isOpen` 的值来条件渲染自定义的菜单组件，并将其 `style` 属性设置为计算出的 `top` 和 `left` 值。
    
    JavaScript
    
    ```
    {menuState.isOpen && (
      <CustomHighlightMenu
        style={{ top: menuState.top, left: menuState.left }}
        onHighlight={() => { /*... */ }}
      />
    )}
    ```
    
7. **处理焦点**：确保 `CustomHighlightMenu` 组件在显示时不会窃取焦点。如果组件内部有按钮，可能需要在其外层容器上设置 `tabIndex="-1"`，并阻止相关的焦点事件。
    

**权衡分析**：

- **优点**：提供了对 UI/UX 的最大控制权。开发者可以完全自定义菜单的外观、动画和行为，使其与应用的整体设计风格保持一致。
    
- **缺点**：此策略的核心依赖于一个非标准的 WebKit 特定 CSS 属性 (`-webkit-touch-callout`)。Apple 随时可能在未来的 iOS 或 Safari 更新中更改或移除此属性的行为，这将导致整个功能瞬间失效。此外，完全自定义的交互可能会让习惯了 iOS 原生操作的用户感到陌生或不适。这是一个高风险、高回报的策略。
    

### 4.2 策略 B：拦截与替换方法（“闪烁”法）

概念：

此策略承认直接阻止原生菜单的困难性和风险，因此采取了一种不同的思路：允许原生菜单先出现，然后在它出现的瞬间，通过代码迅速将其“替换”掉。这是一个基于时序控制的复杂技巧。

**实施步骤**：

1. **不禁用原生菜单**：不要使用 `-webkit-touch-callout: none;`。让系统正常处理长按和选择，并显示原生菜单。
    
2. **监听选择完成**：与策略 A 类似，使用 `rendition.on("selected",...)` 或经过防抖（debounce）处理的 `selectionchange` 事件来判断选择的完成。
    
3. **清除原生选择**：在检测到选择完成后，立即通过 JavaScript 程序化地清除文档中的当前选区：
    
    JavaScript
    
    ```
    contents.window.getSelection().removeAllRanges();
    ```
    
    清除选区通常会导致与之关联的原生上下文菜单自动消失 9。
    
4. **渲染自定义菜单**：在清除了原生选区之后，立即在同一事件循环中，使用之前保存的选区位置信息，将自定义的 React 菜单渲染出来。如果需要保持文本被选中的视觉效果，可以在清除后立即用之前保存的 `Range` 对象重新设置选区，但这会增加复杂性。
    

**权衡分析**：

- **优点**：不依赖于可能被废弃的非标准 CSS 属性，理论上更符合 Web 标准。
    
- **缺点**：此策略的成功与否完全取决于时序的精确控制，而这在不同的设备性能和系统负载下很难保证。几乎不可避免地，用户会观察到一个明显的“闪烁”：原生菜单出现一瞬间，然后消失，接着自定义菜单才出现。这种视觉上的不连贯会严重损害用户体验，给人一种应用卡顿或有缺陷的感觉。实现复杂度极高，且效果不佳，因此通常不被推荐用于生产环境。
    

### 4.3 策略 C：UX 规避方法（渐进增强）

概念：

这是最务实、最稳健的策略。它不试图与系统进行直接的技术对抗，而是通过调整用户体验（UX）设计来巧妙地规避这个问题。其核心思想是，在 iPadOS 上，放弃在选区旁边显示浮动菜单的交互模式，转而采用一个固定的、非上下文的 UI 元素来承载高亮操作。

**实施步骤**：

1. **设备检测**：在应用加载时，通过检查用户代理（User Agent）字符串或使用 `navigator.maxTouchPoints` 等特性检测，判断当前设备是否为 iPad。
    
    JavaScript
    
    ```
    const isIPad = /iPad/i.test(navigator.userAgent) |
    
    ```
    

| (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

2. **状态管理**：当用户在 iPad 上选择文本时，仍然监听 `rendition.on("selected",...)` 事件。但此时，不计算位置，也不尝试显示任何浮动菜单。而是将获取到的选区信息（特别是用于持久化的 `cfi`）存储在应用的全局状态中（例如使用 React Context 或 Redux）。javascript

// 在状态管理逻辑中

if (isIPad && selectionIsValid) {

setActiveSelectionCfi(cfi);

}

```

3. 启用固定 UI：在应用界面中，设计一个持久存在的工具栏（例如在屏幕顶部或底部）。当 activeSelectionCfi 状态不为空时，激活工具栏中的“高亮”按钮。此时，用户可以正常地看到系统原生菜单弹出，但他们可以忽略它。

4. 执行操作：用户在选择了文本后，将视线和操作转移到这个固定的工具栏，并点击“高亮”按钮。该按钮的 onClick 事件处理器会读取状态中存储的 activeSelectionCfi，然后调用 epub.js 的高亮 API（如 rendition.annotations.add(...)）来应用高亮。操作完成后，清除 activeSelectionCfi 状态，使“高亮”按钮变回禁用状态。

UI/UX 模式：

这种方法与许多现代触摸优先的设计模式不谋而合。在移动设备上，由于屏幕空间有限且手指操作精度较低，将核心操作放置在屏幕边缘的固定、可预测位置（如底部导航栏或顶部操作栏）通常比依赖浮动的、可能被手指遮挡的上下文菜单更为可靠和易用 23。

**权衡分析**：

- **优点**：这是迄今为止最稳健、最面向未来的解决方案。它完全不与操作系统的限制发生冲突，因此没有被未来系统更新破坏的风险。实现逻辑相对简单，避免了复杂的坐标计算和焦点管理问题。
    
- **缺点**：导致在不同平台上的用户体验不一致。桌面和安卓用户可能习惯于一步式（选择即操作）的上下文菜单，而 iPad 用户则需要两步式（选择，然后到工具栏操作）的流程。这需要产品和设计团队进行权衡，但从工程稳定性的角度来看，这种可控的 UX 差异远优于一个脆弱或体验不佳的功能。
    

---

## 第五部分：高级实现与战略建议

本部分将提供更具体的代码架构指导，并将前面的分析汇总成一个明确的、可操作的最终建议。

### 5.1 代码架构：构建可复用的 `useEpubSelection` React Hook

为了保持代码的整洁、可维护和可复用，处理 `epub.js` 选择事件、坐标转换和状态管理的复杂逻辑应该被封装到一个自定义的 React Hook 中。这遵循了现代 React 将逻辑与视图分离的最佳实践 6。

Hook 签名设计：

一个设计良好的 Hook 应该接收 rendition 对象作为输入，并返回组件所需的所有状态和操作。

JavaScript

```
import { useState, useEffect } from 'react';

// 假设 isIPad 是一个外部确定的常量或从 context 获取
const isIPad = /iPad/i.test(navigator.userAgent) |

| (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const useEpubSelection = (rendition) => {
  const = useState({
    text: '',
    cfi: null,
    rect: null, // DOMRect for positioning menu (non-iPad)
    isPending: false, // Flag for selection in progress
  });

  useEffect(() => {
    if (!rendition) return;

    let iframe = null;

    const handleSelectStart = () => {
        setSelectionState(prev => ({...prev, isPending: true }));
    };

    const handleSelected = (cfi, contents) => {
      const selection = contents.window.getSelection();
      if (!selection |

| selection.isCollapsed) {
        // Selection was cleared
        setSelectionState({ text: '', cfi: null, rect: null, isPending: false });
        return;
      }

      const range = selection.getRangeAt(0);
      const selectionText = selection.toString();

      if (isIPad) {
        // 策略 C: 只更新 CFI 和文本
        setSelectionState({ text: selectionText, cfi, rect: null, isPending: false });
      } else {
        // 策略 A: 计算位置
        if (!iframe) {
            // 尝试获取 iframe 引用，这可能需要更稳健的方式
            iframe = rendition.manager.views.first().iframe;
        }
        if (iframe) {
            const iframeRect = iframe.getBoundingClientRect();
            const selectionRect = range.getBoundingClientRect();
            
            const finalRect = {
              top: Math.round(iframeRect.top + selectionRect.top + window.scrollY),
              left: Math.round(iframeRect.left + selectionRect.left + window.scrollX),
              width: Math.round(selectionRect.width),
              height: Math.round(selectionRect.height),
            };
            setSelectionState({ text: selectionText, cfi, rect: finalRect, isPending: false });
        }
      }
    };
    
    const handleTouchEnd = () => {
        // touchend 之后，如果仍然是 pending 状态，说明可能是单击而不是选择
        // epub.js 的 'selected' 事件处理了大部分逻辑，这里可以做一些清理
        if (selectionState.isPending) {
            setTimeout(() => {
                const sel = rendition.getContents().window.getSelection();
                if (!sel |

| sel.isCollapsed) {
                    setSelectionState({ text: '', cfi: null, rect: null, isPending: false });
                }
            }, 100);
        }
    };

    // 监听 epub.js 的事件
    rendition.on('selected', handleSelected);
    // 监听 iframe 内部的触摸事件
    rendition.on('started', () => {
        const contents = rendition.getContents();
        if (contents) {
            contents.document.addEventListener('touchstart', handleSelectStart, { passive: true });
            contents.document.addEventListener('touchend', handleTouchEnd, { passive: true });
        }
    });

    return () => {
      rendition.off('selected', handleSelected);
      const contents = rendition.getContents();
      if (contents && contents.document) {
          contents.document.removeEventListener('touchstart', handleSelectStart);
          contents.document.removeEventListener('touchend', handleTouchEnd);
      }
    };
  },);

  const clearSelection = () => {
    setSelectionState({ text: '', cfi: null, rect: null, isPending: false });
  };

  return {
    selectionText: selectionState.text,
    selectionCfi: selectionState.cfi,
    selectionRect: selectionState.rect,
    clearSelection,
  };
};
```

使用 Hook：

在你的阅读器组件中，可以这样使用这个 Hook：

JavaScript

```
function EpubReader({ rendition }) {
  const { selectionText, selectionCfi, selectionRect, clearSelection } = useEpubSelection(rendition);
  const isIPad = /*... detect iPad... */;

  const handleHighlight = () => {
    if (selectionCfi) {
      rendition.annotations.add('highlight', selectionCfi, {});
      clearSelection();
    }
  };

  return (
    <div>
      <div id="viewer" /> {/* epub.js render target */}
      
      {isIPad? (
        <Toolbar>
          <button disabled={!selectionCfi} onClick={handleHighlight}>
            Highlight
          </button>
        </Toolbar>
      ) : (
        selectionRect && (
          <CustomHighlightMenu
            style={{ top: selectionRect.top, left: selectionRect.left }}
            onHighlight={handleHighlight}
          />
        )
      )}
    </div>
  );
}
```

这个架构将复杂的底层交互逻辑封装起来，让你的 UI 组件只关心状态和渲染，极大地提高了代码的可读性和可维护性。

### 5.2 最终建议与决策矩阵

在全面分析了技术限制、实现复杂性和用户体验影响后，**强烈建议采用策略 C（UX 规避方法）** 作为在生产环境中为 iPadOS 用户提供文本高亮功能的首选方案。

虽然策略 A（完全重写）在技术上是可行的，并且能提供最大程度的 UI 自定义能力，但它建立在一个脆弱的基础之上。它对 `-webkit-touch-callout` 的依赖构成了一个显著的长期维护风险。在移动 Web 领域，依赖特定于供应商的非标准特性来构建核心功能，通常是一种不明智的赌博。

策略 B（拦截与替换）则因其几乎无法避免的“闪烁”问题，在用户体验上存在根本性缺陷，应予以排除。

策略 C 则完全不同。它不试图“战胜”平台，而是“适应”平台。它承认并尊重 iPadOS 的系统设计，通过调整应用层的交互模式来达成功能目标。这种方法不仅技术实现上更简单、更可靠，而且完全不受未来 Safari 或 iPadOS 更新的影响。虽然它引入了跨平台的 UX 不一致性，但这是一种明确的、可控的设计决策，远比一个功能不稳定或随时可能崩溃的应用要好。对于一个专业的、追求长期稳定性的产品而言，健壮性应优先于在所有平台上的像素级一致性。

为了更直观地比较这三种策略，下表提供了一个决策矩阵：

**表 1：iPadOS 高亮策略对比分析**

|特性|策略 A：完全重写|策略 B：拦截与替换|策略 C：UX 规避|
|---|---|---|---|
|**实现复杂度**|高|极高|中等|
|**iPad 用户体验**|良好，但非原生|差（界面闪烁）|良好，但流程不同|
|**健壮性与可维护性**|低（高风险）|极低（脆弱）|极高（面向未来）|
|**核心依赖/风险**|`-webkit-touch-callout` 属性可能被更改或移除|依赖难以保证的事件时序（竞态条件）|跨平台 UX 不一致，需设计层面接受|

---

## 结论

开发者在 iPadOS Safari 上遇到的自定义文本选择菜单被覆盖的问题，其根源在于 Apple 将该菜单设计为操作系统的一个特权级、不可替代的 UI 组件。这一设计决策深刻地影响了 Web 应用在该平台上的行为。

本报告的分析表明，任何试图直接对抗这一系统级限制的策略，都将面临巨大的技术挑战和长期的维护风险。无论是依赖非标准 CSS 属性的“完全重写”方法，还是会导致糟糕用户体验的“拦截与替换”方法，都非理想的工程选择。

最有效、最专业的解决方案是**策略 C：UX 规避方法**。通过在 iPadOS 上采用一种不同的交互模式——即使用一个固定的工具栏按钮来触发高亮操作，而非依赖上下文弹出菜单——开发者可以完全绕开与系统限制的冲突。这种方法不仅实现起来更简单、更可靠，而且保证了功能在未来的 iPadOS 和 Safari 版本中能够持续稳定地工作。

最终，成功的 Web 架构并非总是要强迫所有平台表现得一模一样，而是在深刻理解每个平台特性的基础上，做出明智的、适应性的设计决策。通过采纳 UX 规避策略，开发者可以为 iPad 用户提供一个功能完整、性能稳定且体验流畅的高亮功能，同时避免了因试图挑战平台核心规则而带来的技术债务和不确定性。