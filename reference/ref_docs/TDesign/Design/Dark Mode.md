## 价值观

## 概述

深色模式是一种夜间友好的颜色主题，主要侧重于UI界面中每个元素可读性所需的最小色彩对比度，以保证出色的阅读体验。

![](https://static.tdesign.tencent.com/assets/starter-UABtSUhJ.png)

## 原则

### 内容优先

深色模式下应优先保证内容识别度。需要确保文本内容易于阅读，而不是无缘无故的花哨。

### 阅读舒适度

尽量避免使用高饱和度的颜色，因为在较暗的表面上观看时，高饱和度颜色具有视觉“抖动”效果。相反，使用低饱和度或稍微柔和的颜色会减少人眼的视觉疲劳，保证阅读舒适性。

### 信息层级一致性

浅色模式和深色模式下转换时应该保持信息层级一致性。

### 符合 WCAG2.0 标准

依据 WCAG2.0 设计标准，文本的视觉呈现以及文本图像至少要有 1:4.5 的对比度，以确保所有的文字内容清晰易读，对比度足够。

## 文字

浅色文本出现在深色背景上时，正文文字和背景的对比度至少要有 1:4.5(AA 标准）在 TDesign 中，除了保证文字识别度之外，希望不同梯度的文字在深浅模式切换后的视觉感知也能趋于一致。所以针对转换后的透明度进行了微调。

| token | 名称 | 色值 |
| --- | --- | --- |
| @text-color-primary | 标题 | #ffffff 90% |
| @text-color-secondary | 次要文字 | #ffffff 60% |
| @text-color-placeholder | 占位符文字 | #ffffff 40% |
| @text-color-disabled | 禁用状态文字 | #ffffff 26% |

## 色彩

在 TDesign 色彩系统中，在亮色的色彩算法基础上，经过运算得到深色模式的色板。色阶的制定同样采用了 CIElab、HSL 色彩空间结合插值的方法，保证色彩变化均匀，多色之间亮度均等。

色彩中提供了 8 套常用的基础色板，每个扩展色均为 10 级色阶。

### 基础色板

Blue

Blue6 #2174FF

Blue1 #1E2C60

Blue2 #062E9A

Blue3 #073AB5

Blue4 #084DCD

Blue5 #0957D9

Blue6 #2174FF

Blue7 #478DFF

Blue8 #69A1FF

Blue9 #8CB8FF

Blue10 #ABCAFF

Cyan

Cyan6 #3CB1FB

Cyan1 #05437D

Cyan2 #06579E

Cyan3 #086CC0

Cyan4 #0B83DF

Cyan5 #0F98FA

Cyan6 #3CB1FB

Cyan7 #67C9FC

Cyan8 #8FDDFF

Cyan9 #BDEFFF

Cyan10 #E0F9FF

Purple

Purple6 #B382F0

Purple1 #451981

Purple2 #5A2D96

Purple3 #7141AC

Purple4 #8755C2

Purple5 #9E6CD8

Purple6 #B382F0

Purple7 #CB96FF

Purple8 #DDB5FF

Purple9 #EACFFF

Purple10 #F7EBFF

Pink

Pink6 #FF70CF

Pink1 #7B0554

Pink2 #9B066D

Pink3 #BC088A

Pink4 #D435A0

Pink5 #ED53B7

Pink6 #FF70CF

Pink7 #FF99E4

Pink8 #FFBDF4

Pink9 #FFDBFD

Pink10 #FFF2FF

Red

Red6 #FB6E77

Red1 #730524

Red2 #960627

Red3 #B01C37

Red4 #C9384A

Red5 #E35661

Red6 #FB6E77

Red7 #FF9195

Red8 #FFB5B8

Red9 #FFD6D8

Red10 #FFF2F2

Orange

Orange6 #ED8139

Orange1 #692204

Orange2 #873105

Orange3 #A24006

Orange4 #C25110

Orange5 #D66724

Orange6 #ED8139

Orange7 #FF9852

Orange8 #FFB97D

Orange9 #FFD8AD

Orange10 #FFF4E5

Yellow

Yellow6 #D29E08

Yellow1 #5E3B04

Yellow2 #754E05

Yellow3 #8C6106

Yellow4 #A37407

Yellow5 #BA8907

Yellow6 #D29E08

Yellow7 #EBB30E

Yellow8 #FBCC30

Yellow9 #FFE682

Yellow10 #FFF9C2

Green

Green6 #07A872

Green1 #034116

Green2 #035428

Green3 #046939

Green4 #057E4C

Green5 #06935F

Green6 #07A872

Green7 #37BF8E

Green8 #71D5AE

Green9 #B3E8D1

Green10 #E8F7F1