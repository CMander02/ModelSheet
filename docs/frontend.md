# 前端界面设计文档

## 1. 技术选型

| 选项 | 选择 | 原因 |
|------|------|------|
| 框架 | React + Vite | 纯静态部署，无需 SSR |
| UI 库 | shadcn/ui | 现代化设计，可定制性强 |
| 样式 | Tailwind CSS | 原子化 CSS，开发效率高 |
| 路由 | React Router | 单页应用导航 |
| 状态 | useState + localStorage | 简单场景无需复杂状态管理 |

## 2. 页面结构

```
┌──────────────────────────────────────────────────────────────────┐
│                            Header                                │
│  Logo   [总表] [对比]                    🌙/☀️  🌐中/EN           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                         Main Content                             │
│                                                                  │
│    ┌──────────────────────────────────────────────────────┐     │
│    │                   Page Content                        │     │
│    │         (ModelTable / CompareView)                   │     │
│    └──────────────────────────────────────────────────────┘     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                            Footer                                │
│                  © 2024 ModelSheet · GitHub                      │
└──────────────────────────────────────────────────────────────────┘
```

## 3. 页面设计

### 3.1 总表页面 (/)

主要功能：展示所有模型的参数表格

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 搜索模型...                                                   │
├─────────────────────────────────────────────────────────────────┤
│ 复杂度: [简单] [爱好者] [开发者] [自定义]     ⚙️ 列配置          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────┬──────────┬─────────┬──────────┬─────────────────┐  │
│ │ 模型名称 │ 发布时间 ↓│ 参数量 ↕│ 上下文长度│ 输入模态        │  │
│ ├─────────┼──────────┼─────────┼──────────┼─────────────────┤  │
│ │ Llama 3 │2024-07-23│   405B  │  128K    │ text            │  │ → 点击行查看详情
│ ├─────────┼──────────┼─────────┼──────────┼─────────────────┤  │
│ │ Claude 3│2024-03-04│   140B  │  200K    │ text, image     │  │
│ ├─────────┼──────────┼─────────┼──────────┼─────────────────┤  │
│ │ GPT-4   │2024-04-09│    1T   │  128K    │ text            │  │
│ └─────────┴──────────┴─────────┴──────────┴─────────────────┘  │
│                                                                 │
│                        [1] [2] [3] ... [10]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**交互逻辑:**

1. **搜索**: 实时过滤，匹配模型名称、提供商、基座模型
2. **复杂度切换**: 预设列显示方案
   - 简单: 名称、参数量、上下文长度、发布时间
   - 爱好者: +基座模型、输入模态、Embedding 大小
   - 开发者: +架构、位置编码、MoE、量化支持
   - 自定义: 完全自由配置
3. **列配置**: 弹出 Popover，勾选显示/隐藏列
4. **排序**: 点击列头切换 升序/降序/无序
5. **行点击**: 弹出模型详情卡片 (Sheet/Dialog)

### 3.2 对比页面 (/compare)

主要功能：横向对比选中的模型

```
┌─────────────────────────────────────────────────────────────────┐
│                        选择要对比的模型                          │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 🔍 搜索模型...                                             │  │
│ ├───────────────────────────────────────────────────────────┤  │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │  │
│ │ │ ☑ Llama 3.1│ │ ☑ Claude 3 │ │ ☐ GPT-4    │ ...       │  │
│ │ │   Meta     │ │  Anthropic │ │   OpenAI   │          │  │
│ │ └─────────────┘ └─────────────┘ └─────────────┘          │  │
│ └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                   对比结果 (2 个模型)                           │
│ 复杂度: [简单] [爱好者] [开发者] [自定义]                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌────────────┬───────────────┬───────────────┐                 │
│ │   参数     │   Llama 3.1   │   Claude 3   ✕│                 │
│ │            │     Meta      │   Anthropic   │                 │
│ ├────────────┼───────────────┼───────────────┤                 │
│ │ 参数量     │     405B      │     140B      │                 │
│ ├────────────┼───────────────┼───────────────┤                 │
│ │ 上下文长度 │     128K      │     200K ✓    │  ← 最大值高亮   │
│ ├────────────┼───────────────┼───────────────┤                 │
│ │ 发布时间   │  2024-07-23   │  2024-03-04   │                 │
│ ├────────────┼───────────────┼───────────────┤                 │
│ │ 输入模态   │     text      │  text, image  │                 │
│ └────────────┴───────────────┴───────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**交互逻辑:**

1. **模型选择器**:
   - 搜索过滤
   - 点击卡片选中/取消
   - 显示已选数量
2. **移除模型**: 点击表头的 ✕ 按钮
3. **复杂度切换**: 同总表页面
4. **数值高亮**: 数值类型字段，最大/最小值高亮显示
5. **横向滚动**: 当模型数量多时，表格可横向滚动，参数列固定

### 3.3 模型详情弹窗

```
┌─────────────────────────────────────────────┐
│                                         ✕  │
│  Llama 3.1 405B                            │
│  Meta · 2024-07-23                         │
│                                            │
│  ─────────────────────────────────────     │
│                                            │
│  基础信息                                   │
│  ├─ 参数量: 405B                           │
│  ├─ 上下文长度: 128K                        │
│  └─ 基座模型: Llama 3.1                     │
│                                            │
│  架构信息                                   │
│  ├─ 架构类型: Decoder-only                  │
│  ├─ 位置编码: RoPE                          │
│  ├─ MoE: 是                                │
│  └─ Embedding: 8192                        │
│                                            │
│  训练信息                                   │
│  ├─ 训练 Token 数: 15T                      │
│  └─ 量化支持: int8, int4, fp16, fp8        │
│                                            │
│  ─────────────────────────────────────     │
│                                            │
│  [在 HuggingFace 查看]  [添加到对比]         │
│                                            │
└─────────────────────────────────────────────┘
```

## 4. 组件设计

### 4.1 组件层级

```
App
├── Header
│   ├── Logo
│   ├── Navigation (总表 / 对比)
│   ├── ThemeToggle
│   └── LanguageToggle
│
├── Routes
│   ├── HomePage
│   │   ├── SearchInput
│   │   ├── ComplexitySelector
│   │   ├── ColumnConfigPopover
│   │   ├── ModelTable
│   │   │   ├── TableHeader (可排序)
│   │   │   └── TableBody
│   │   ├── Pagination
│   │   └── ModelDetailSheet
│   │
│   └── ComparePage
│       ├── ModelSelector
│       │   ├── SearchInput
│       │   └── ModelCard (可选中)
│       ├── ComplexitySelector
│       └── ComparisonTable
│
└── Footer
```

### 4.2 核心组件说明

| 组件 | 职责 | shadcn 组件 |
|------|------|------------|
| ModelTable | 展示模型列表，支持排序 | Table |
| ComparisonTable | 横向对比表格 | Table |
| ModelDetailSheet | 模型详情弹窗 | Sheet / Dialog |
| ModelSelector | 模型多选器 | Card + Checkbox |
| ColumnConfigPopover | 列配置弹窗 | Popover + Checkbox |
| ComplexitySelector | 复杂度切换 | ToggleGroup |
| SearchInput | 搜索框 | Input |
| Pagination | 分页器 | Pagination |
| ThemeToggle | 主题切换 | Button |
| LanguageToggle | 语言切换 | DropdownMenu |

## 5. 状态管理

### 5.1 全局状态 (localStorage 持久化)

```typescript
interface GlobalState {
  theme: 'light' | 'dark'
  language: 'zh' | 'en'
  columnConfig: ColumnConfig[]    // 列显示/隐藏配置
  complexityLevel: ComplexityLevel
}
```

### 5.2 页面状态

```typescript
// 总表页面
interface HomePageState {
  searchTerm: string
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null
  currentPage: number
  selectedModel: ModelInfo | null  // 详情弹窗
}

// 对比页面
interface ComparePageState {
  searchTerm: string
  selectedModels: ModelInfo[]
}
```

## 6. 数据加载

### 6.1 数据流

```
1. 应用启动
2. fetch('/data/models.json')
3. 解析 JSON 数据
4. 存入 React state
5. 渲染界面
```

### 6.2 数据 Hook

```typescript
// hooks/useModels.ts
export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetch('/data/models.json')
      .then(res => res.json())
      .then(data => setModels(data))
      .catch(err => setError(err))
      .finally(() => setLoading(false))
  }, [])

  return { models, loading, error }
}
```

## 7. 排序逻辑

### 7.1 列头点击状态流转

```
无排序 → 升序(↑) → 降序(↓) → 无排序
```

### 7.2 排序实现

```typescript
function sortModels(
  models: ModelInfo[],
  key: string,
  direction: 'asc' | 'desc'
): ModelInfo[] {
  return [...models].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]

    // 处理 null/undefined
    if (aVal == null) return 1
    if (bVal == null) return -1

    // 数值比较
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    }

    // 日期比较
    if (key.includes('date') || key.includes('Date')) {
      const aDate = new Date(aVal).getTime()
      const bDate = new Date(bVal).getTime()
      return direction === 'asc' ? aDate - bDate : bDate - aDate
    }

    // 字符串比较
    const aStr = String(aVal).toLowerCase()
    const bStr = String(bVal).toLowerCase()
    return direction === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr)
  })
}
```

## 8. 响应式设计

### 8.1 断点设计

| 断点 | 宽度 | 布局调整 |
|------|------|----------|
| sm | < 640px | 隐藏部分列，简化 Header |
| md | 640-1024px | 默认布局 |
| lg | > 1024px | 完整布局 |

### 8.2 移动端适配

- 表格水平滚动
- 模型卡片单列排列
- 底部固定导航栏
- 简化复杂度选项为下拉菜单

## 9. 性能优化

### 9.1 数据量大时

- 虚拟滚动 (react-virtual)
- 分页加载
- 搜索防抖

### 9.2 初始加载

- 数据预加载
- Loading 骨架屏
- 错误边界处理
