## 价值观

## 概述

布局作为页面的基本构成、重要模式之一，也作为中后台页面统一的基础，奠定了整个中后台交互和视觉风格。

## 规范

### 画板尺寸

为了减少布局设定时的沟通与拆分计算成本，基于主流屏幕尺寸，我们将设计团队的标准画板宽度定为 1440px 或 1920px。

### 布局组成

布局中可以包含以下 4 种区域。

内容区域（Content）：通常用于放置主体内容。

顶部区域（Header）：位于页面顶部，通常用于放置顶部导航。

侧边区域（Sider）：位于主体内容两侧，通常用于放置侧边导航。

底部区域（Footer）：位于页面底部，通常用于放置辅助信息。

![](https://static.tdesign.tencent.com/assets/l-1-3qo-WyJv.jpg)

## 导航布局分类

导航用于组织产品的功能与内容，引导用户在页面间移动。

在 TDesign 中包含以下 3 种导航布局类型：

### 侧边导航布局

主要包含侧边区域、内容区域。该布局下，页面间切换的操作效率较高，但压缩了内容区域的横向空间。适用于导航层级较深，导航效率要求较高的页面。

![](https://static.tdesign.tencent.com/assets/l-2-XZhqZaIA.jpg)

### 顶部导航布局

主要包含顶部区域、内容区域。该布局下，横向空间的展示效率很高，但损失了导航空间，降低了页面导航的切换效率。适用于主要操作区域在内容区域，对页面叠好效率要求不高的页面。对于该类页面，为了保证信息布局的稳定性，内容区域的宽度常设置为固定宽度。

![](https://static.tdesign.tencent.com/assets/l-3-B69FRsvd.jpg)

### 混合导航布局

主要包含顶部区域、侧边区域、内容区域。顶部导航和侧边导航的组合使用，提升了导航效率。多用于信息架构复杂、对导航效率有一定要求的应用型网站。

---

注意：当顶部需要承载重要功能时，可以将顶部区域、底部区域固定。当内容区域过高时，可以将侧边区域固定。

![](https://static.tdesign.tencent.com/assets/l-4-D4vu-QA_.jpg) ![](https://static.tdesign.tencent.com/assets/l-5-CvmE2Fun.jpg)

## 栅格系统

栅格是以规则的网格阵列来指导和规范网页中的版面布局以及信息分布，提高界面内布局的一致性，节约成本。

### 网格基数

网格基数是栅格系统中的基本网格单位。栅格化之前先定义网格基数尤其重要，一方面规范设计，指导版式设计与内容布局，辅助规范页面元素对齐和间距设定；另一方面节省设计开发沟通的时间。目前栅格系统中以 8 点为网格基数，粒度大小合适，且能够匹配多数主流屏幕。在 TDesign 中，网格基数为 8px。

![](https://static.tdesign.tencent.com/assets/l-6-lUW-bmWy.jpg)

### 栅格组成

栅格由列（column）、槽（gutter）、安全边距（margin）组成。

#### 列

列是假象的垂直块，用于对齐内容。通常使用百分比(%)或固定值定义列的宽度。列的宽度不是一个固定值时，如果栅格的宽度发生变化，则列的宽度也会相应地增大或缩小。

#### 槽

槽是列之间的间隔。槽用来分隔内容。通常槽的宽度为固定值。TDesign 中默认为 16px。

#### 安全边距

安全边距是内容和屏幕边缘之间的间隔。通常为固定宽度，用来定义在所有尺寸屏幕下最小的呼吸空间。TDesign 中侧边距的默认值为 24px，也可根据实际情况确定取值，建议使用 8 的倍数。

![](https://static.tdesign.tencent.com/assets/l-7-BwP4ADZ0.jpg)

### 布局栅格

用于组成栅格的列数称为列结构。8、12、16 和 24是响应式布局中最常见的列结构。在栅格中放置内容区块时，内容区块的位置应该从列开始，到列结束。

为了平衡灵活性与复杂度，对于内容区域，我们采用 12 栅格系统。

![](https://static.tdesign.tencent.com/assets/l-8-DQGzRPC3.jpg)

---

根据布局的不同使用不同的栅格布局，在 TDesign 中包含以下 3 种布局栅格：

#### 无侧边栏布局栅格

内容区域占据页面全部宽度。

![](https://static.tdesign.tencent.com/assets/l-9-B0bUMd9g.jpg)

#### 定宽侧边栏布局栅格-展开

侧边栏宽度在一组断点范围内固定，剩余空间分配给内容区域。在 TDesign 中默认展开侧边栏宽度为 232px。

![](https://static.tdesign.tencent.com/assets/l-10-CecV4Np1.jpg)

#### 定宽侧边栏布局栅格-收起

在 TDesign 中默认收起侧边栏宽度为 64px。

![](https://static.tdesign.tencent.com/assets/l-11-DXWTjCv4.jpg)

---

注意：侧边栏区域可设置为响应式布局，当浏览器宽度小于配置的断点值，侧边导航自动从展开态变为收起态（TDesign 中该断点值默认为 992px）。

![](https://static.tdesign.tencent.com/assets/l-12-CG0-LVf8.jpg)

### 间距

为了页面布局的一致性，在不同区域中放置内容元素时，应当保持间距的规律性。我们推荐了一组具有韵律的间距值，在遵循 8 倍数原则的基础上，增加了 4、12 两档小间距，以灵活满足不同的应用场景。

![](https://static.tdesign.tencent.com/assets/l-13-Cuw4WsDm.jpg)

## 响应式布局

### 断点系统

在栅格中，如果只使用一种内容布局方式，有时无法较好地适配各种尺寸的显示设备。此时可以使用响应式栅格，通过设置一系列断点（即布局变化的临界点）实现布局的切换。

![](https://static.tdesign.tencent.com/assets/l-14-C85rDwcM.jpg)

---

TDesign 基于不同显示设备，共设置了 3 个断点。该断点系统在兼顾平板端设备的同时，对 PC 端的断点进行细分，并考虑不同浏览器的特性差异（注1），使栅格系统更好地适配主流的电脑显示器和浏览器。实际使用中，可依据业务需求选取其中的部分断点，也可以适当使用自定义断点。

<table><colgroup><col> <col> <col> <col> <col> <col></colgroup><thead><tr><th><p>断点</p></th><th><p>断点值</p></th><th><p>响应区间</p></th><th><p>槽宽</p></th><th><p>栅格</p></th><th><p>显示设备参考</p></th></tr></thead><tbody><tr><td><p>sm</p></td><td><p>768px</p></td><td><p>768px-991px</p></td><td rowspan="3">16px</td><td rowspan="2">内容区块根据不同的断点进行堆叠或缩放</td><td><p>平板</p></td></tr><tr><td><p>md</p></td><td><p>992px</p></td><td><p>992px-1199px</p></td><td><p>超小尺寸电脑</p></td></tr><tr><td><p>lg</p></td><td><p>1200px</p></td><td><p>大于 1200px</p></td><td>大于断点值时，始终保持水平排列</td><td><p>小尺寸电脑</p></td></tr></tbody></table>

注意：在 Safari 浏览器中，纵向滚动条的出现和消失，会导致相应式判断所依据的宽度值发生变化，如果此时宽度值恰好在断点附近，可能会导致布局出现非预期的改变。因此，对于 PC 端，TDesign 中并没有直接将主流的屏幕宽度用作断点值，而是下调了一定宽度，以规避滚动条的影响。

## 栅格行为

在不同的断点范围内，系统存在不同的栅格方式。

### 固定栅格

固定栅格具有固定列宽、固定槽宽和固定安全边距。固定栅格具有固定的内容宽度，在特定的断点范围内不发生变化，取值可根据实际情况决定。

#### 在 TDesign中：

1）无侧边栏布局：固定栅格最小宽度为 768px（最小断点值）；当浏览器宽度小于配置的最小断点值时，页面不再缩小，浏览器出现横向滚动条。

![](https://static.tdesign.tencent.com/assets/l-15-B-WVDWTK.jpg)

---

2）侧边栏布局：固定栅格最小宽度为 704px（TDesign 中页面最小宽度为 768px，侧边栏宽度为 64px）；内容区域小于 704px 时页面不再缩小，浏览器出现横向滚动条。

![](https://static.tdesign.tencent.com/assets/l-16-CrP3jN9h.jpg)

### 流式栅格

流式栅格具有流式列宽、固定槽宽和固定安全边距。流式栅格具有弹性的内容宽度，其宽度将随着浏览器宽度的变化而相应地增大或缩小。

在 TDesign 中，当浏览器宽度大于最小断点值 768px 时，内容区域随着浏览器宽度的变化而相应地增大或缩小。

![](https://static.tdesign.tencent.com/assets/l-17-B8MQ8tJR.jpg)

腾讯设计

[![](https://cdc.cdn-go.cn/tdc/latest/images/tdesign.svg)](https://tdesign.tencent.com/?utm_source=tdc&utm_medium=tdc.nav)

[TDesign 企业级设计体系](https://tdesign.tencent.com/?utm_source=tdc&utm_medium=tdc.nav)

[![](https://cdc.cdn-go.cn/tdc/latest/images/codesign.svg)

CoDesign 一站式设计协作平台

](https://codesign.qq.com/?utm_source=tdc&utm_medium=tdc.nav)

腾讯设计

[![](https://cdc.cdn-go.cn/tdc/latest/images/tdesign.svg)](https://tdesign.tencent.com/?utm_source=tdc&utm_medium=tdc.nav)

[TDesign 企业级设计体系](https://tdesign.tencent.com/?utm_source=tdc&utm_medium=tdc.nav)

[![](https://cdc.cdn-go.cn/tdc/latest/images/codesign.svg)

CoDesign 一站式设计协作平台

](https://codesign.qq.com/?utm_source=tdc&utm_medium=tdc.nav)