# 前端设计改进方案

基于腾讯 TDesign 设计规范的分析和改进实施。

## 改进概览

本次改进从**美感、结构、实用性、交互方式**四个维度优化 ModelSheet 前端设计,遵循 TDesign 企业级设计体系的最佳实践。

---

## 一、美感改进

### 1.1 色彩系统优化

#### 问题分析
- ❌ 深色模式饱和度过高,造成视觉疲劳
- ❌ 缺少系统化的色阶体系
- ❌ 色彩对比度未达 WCAG 2.0 标准

#### 改进方案
✅ **引入 TDesign 10级色阶系统**
```css
/* 品牌色 - Blue */
--blue-1: #1E2C60 → --blue-10: #ABCAFF
/* 功能色 - Cyan, Green, Red, Orange 等 */
```

✅ **深色模式色彩优化**
- 降低主色饱和度: `Blue6(100%饱和度) → Blue7(91%饱和度)`
- 背景更深: `8%灰度` 替代原 `3.9%`
- 卡片背景分层: `12%灰度` 增强层次感

✅ **文字透明度规范**
遵循 TDesign 深色模式标准:
- 标题: 90% 透明度
- 次要文字: 60% 透明度
- 占位符: 40% 透明度
- 禁用状态: 26% 透明度

### 1.2 间距系统标准化

#### 问题分析
- ❌ 圆角 `0.625rem (10px)` 不符合 8px 基数原则
- ❌ 间距值随意,缺少韵律感

#### 改进方案
✅ **8px 网格基数系统**
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px
--spacing-3xl: 64px
```

✅ **圆角标准化**
```css
--radius: 0.5rem (8px)
--radius-sm: 4px
--radius-md: 6px
--radius-lg: 8px
--radius-xl: 12px
```

---

## 二、结构改进

### 2.1 栅格系统实现

#### 问题分析
- ❌ 无标准 12 列栅格
- ❌ 响应式断点不完整
- ❌ 容器宽度未遵循最小宽度规范

#### 改进方案
✅ **12 栅格系统配置**
```css
--grid-columns: 12
--grid-gutter: 16px     /* 槽宽 */
--grid-margin: 24px     /* 安全边距 */
--grid-min-width: 768px /* 最小宽度 */
```

✅ **响应式断点系统**
| 断点 | 值    | 适用设备      | 容器最大宽度 |
|------|-------|---------------|--------------|
| sm   | 768px | 平板          | 100%         |
| md   | 992px | 超小电脑      | 960px        |
| lg   | 1200px| 小尺寸电脑    | 1140px       |
| xl   | 1440px| 标准画板      | 1320px       |

✅ **固定栅格行为**
- 最小宽度 768px,小于此值显示横向滚动条
- 保证布局稳定性,避免内容过度压缩

### 2.2 容器系统规范

```css
.container {
  width: 100%;
  margin: auto;
  padding-left: var(--grid-margin);
  padding-right: var(--grid-margin);
}
```

---

## 三、实用性改进

### 3.1 数据筛选优化

#### 问题分析
- ❌ 搜索框为"查询后生效"模式,效率低
- ❌ 缺少高级筛选折叠功能

#### 改进方案
✅ **立即生效搜索**
```typescript
// Debounce 300ms,实时筛选
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm)
  }, 300)
  return () => clearTimeout(timer)
}, [searchTerm])
```

✅ **性能优化**
- 使用 `useMemo` 缓存计算结果
- 避免不必要的重渲染

### 3.2 批量操作改进

#### 问题分析
- ❌ 批量操作按钮隐藏在 header,不够明显

#### 改进方案
✅ **"所见即所得"批量操作栏**
```tsx
{selectedModels.size > 0 && (
  <div className="sticky top-16 z-40 bg-primary/10">
    <div className="container flex h-14 items-center justify-between">
      <span>已选择 {selectedModels.size} 个模型</span>
      <Button onClick={handleCompare}>对比模型</Button>
    </div>
  </div>
)}
```

特点:
- ✅ Sticky 定位,始终可见
- ✅ 淡色背景区分状态
- ✅ 清除选择功能

### 3.3 加载状态优化

#### 问题分析
- ❌ 只有简单文字提示"加载中..."
- ❌ 缺少骨架屏,体验差

#### 改进方案
✅ **骨架屏加载状态**
- Header 骨架屏
- 搜索栏骨架屏
- 表格行骨架屏(8行)
- 渐进式动画延迟(`animationDelay`)

---

## 四、交互方式改进

### 4.1 排序视觉反馈

#### 问题分析
- ❌ 排序状态不明确
- ❌ 缺少升序/降序指示

#### 改进方案
✅ **明确的排序指示器**
```tsx
{sortConfig.key === column.key ? (
  sortConfig.direction === "asc" ? (
    <ArrowUp className="text-primary" />
  ) : (
    <ArrowDown className="text-primary" />
  )
) : (
  <ArrowUpDown className="text-muted-foreground" />
)}
```

特点:
- ✅ 激活状态使用主色(`text-primary`)
- ✅ 未激活状态灰色(`text-muted-foreground`)
- ✅ 明确的上/下箭头

### 4.2 动画和过渡

#### 改进内容
✅ **表格行渐入动画**
```tsx
<TableRow
  className="animate-in fade-in-50 duration-200"
  style={{ animationDelay: `${index * 20}ms` }}
>
```

✅ **折叠面板过渡**
```tsx
<div className="animate-in fade-in-50 duration-200">
  {/* 展开内容 */}
</div>
```

✅ **Hover 状态**
```css
.hover:bg-muted/50 transition-colors
```

### 4.3 对比页面视觉层级

#### 改进内容
✅ **卡片样式增强**
- 渐变背景: `bg-gradient-to-br from-primary/5 to-accent/5`
- 阴影效果: `shadow-sm hover:shadow-md`
- 关键参数卡片化展示

✅ **折叠区域优化**
- Group hover 效果
- 过渡动画
- 背景色区分

---

## 五、遵循的 TDesign 设计原则

### 5.1 内容优先
- ✅ 深色模式优先保证内容识别度
- ✅ 文本对比度符合 WCAG 2.0 标准(1:4.5)

### 5.2 阅读舒适度
- ✅ 避免高饱和度色彩
- ✅ 柔和的色彩过渡

### 5.3 信息层级一致性
- ✅ 亮色/深色模式信息层级一致
- ✅ 通过透明度和色阶区分层级

### 5.4 符合标准
- ✅ WCAG 2.0 对比度标准
- ✅ 8px 网格基数
- ✅ 12 栅格系统

---

## 六、技术实现要点

### 6.1 CSS 变量体系
```css
:root {
  /* 色彩系统 */
  --primary: 216 100% 56%;  /* TDesign Blue6 */
  --accent: 197 71% 50%;    /* TDesign Cyan6 */
  --destructive: 0 75% 60%; /* TDesign Red6 */

  /* 间距系统 */
  --spacing-*: ...

  /* 栅格系统 */
  --grid-*: ...

  /* 断点系统 */
  --breakpoint-*: ...
}
```

### 6.2 React 性能优化
```typescript
// 使用 useMemo 避免重复计算
const visibleColumns = useMemo(...)
const filteredModels = useMemo(...)
const sortedModels = useMemo(...)

// Debounce 搜索
useEffect(() => {
  const timer = setTimeout(...)
  return () => clearTimeout(timer)
}, [searchTerm])
```

### 6.3 动画实现
```tsx
// Tailwind CSS 内置动画
className="animate-in fade-in-50 duration-200"

// 渐进式延迟
style={{ animationDelay: `${index * 20}ms` }}

// Transition
className="transition-colors duration-200"
```

---

## 七、改进效果对比

| 维度         | 改进前                       | 改进后                           |
|--------------|------------------------------|----------------------------------|
| **色彩**     | 深色模式饱和度过高           | TDesign 低饱和度色板             |
| **对比度**   | 未达标                       | 符合 WCAG 2.0 (1:4.5)            |
| **间距**     | 不规范(10px圆角)             | 8px网格基数                      |
| **栅格**     | 无                           | 12列栅格 + 响应式断点            |
| **搜索**     | 查询后生效                   | 立即生效(Debounce 300ms)         |
| **排序**     | 无明确指示                   | 上/下箭头 + 主色高亮             |
| **批量操作** | 隐藏在header                 | Sticky操作栏(所见即所得)         |
| **加载**     | 简单文字                     | 骨架屏 + 渐进式动画              |
| **动画**     | 无                           | 淡入/过渡/Hover效果              |
| **层级**     | 扁平                         | 渐变/阴影/卡片化                 |

---

## 八、未来优化方向

### 8.1 高级筛选
- [ ] 折叠筛选条件面板
- [ ] 筛选条件模板保存与调用
- [ ] 多维度组合筛选

### 8.2 新手引导
- [ ] 首次访问阻断式引导
- [ ] 功能点 Tooltip 提示
- [ ] 主动触发的引导入口

### 8.3 侧边导航
- [ ] 可收起侧边栏(232px展开 / 64px收起)
- [ ] 响应式断点自动收起(<992px)

### 8.4 数据可视化
- [ ] 参数对比雷达图
- [ ] 性能指标趋势图

---

## 参考资源

- [TDesign 官网](https://tdesign.tencent.com/)
- [TDesign 布局规范](https://tdesign.tencent.com/design/layout)
- [TDesign 深色模式](https://tdesign.tencent.com/design/dark-mode)
- [TDesign 高频任务设计](https://tdesign.tencent.com/design/tasks)
- [WCAG 2.0 标准](https://www.w3.org/WAI/WCAG21/quickref/)

---

**改进时间**: 2025-12-08
**设计系统**: TDesign
**实施范围**: 色彩、布局、交互、动画
