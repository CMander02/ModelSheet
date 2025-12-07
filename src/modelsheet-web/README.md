# ModelSheet Web Frontend

开源模型参数速查与对比工具的前端界面。

## 技术栈

- **框架**: React 19 + Vite 7
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS 4
- **图标**: Lucide React
- **路由**: React Router DOM 7
- **语言**: TypeScript 5

## 功能特性

### 1. 总表页面 (/)
- 模型列表展示
- 实时搜索过滤
- 列排序功能
- 复杂度切换（简单/爱好者/开发者/自定义）
- 主题切换（明亮/暗黑模式）
- 多语言支持（中文/English）

### 2. 对比页面 (/compare)
- 模型多选
- 横向参数对比
- 数值高亮（最大值/最小值）
- 复杂度配置
- 模型移除

## 开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
pnpm run build
```

构建产物位于 `dist/` 目录。

### 预览生产构建

```bash
pnpm run preview
```

## 项目结构

```
src/
├── components/           # UI 组件
│   ├── ui/              # shadcn/ui 基础组件
│   ├── model-table.tsx  # 模型表格组件
│   ├── model-selector.tsx # 模型选择器
│   ├── comparison-table.tsx # 对比表格
│   ├── theme-toggle.tsx # 主题切换
│   └── language-toggle.tsx # 语言切换
├── pages/               # 页面组件
│   ├── HomePage.tsx     # 总表页面
│   └── ComparePage.tsx  # 对比页面
├── lib/                 # 工具库
│   ├── types.ts         # TypeScript 类型定义
│   ├── i18n.ts          # 国际化配置
│   ├── model-data.ts    # 模型数据处理
│   └── utils.ts         # 工具函数
├── App.tsx              # 应用主组件
├── main.tsx             # 应用入口
└── index.css            # 全局样式
```

## 数据格式

模型数据存放在 `public/data/models.json`，格式如下：

```json
[
  {
    "id": "gpt-4-turbo",
    "name": "GPT-4 Turbo",
    "provider": "OpenAI",
    "releaseDate": "2024-04-09",
    "totalParameters": 1000000000000,
    "baseModel": "GPT-4",
    "isInferenceModel": true,
    "inputModalities": ["text"],
    "outputModalities": ["text"],
    "contextLength": 128000,
    "embeddingDim": 12288,
    "positionEncoding": "RoPE",
    "modelType": "Transformer",
    "architecture": "Decoder-only",
    "moe": false,
    "quantizationSupport": ["int8", "int4", "fp16"]
  }
]
```

## 部署

### GitHub Pages

项目配置为部署到 GitHub Pages。构建后的静态文件可以直接托管。

```bash
pnpm run build
```

将 `dist/` 目录内容部署到 GitHub Pages 即可。

## 配置说明

### 复杂度预设

在 `src/lib/model-data.ts` 中配置不同复杂度级别显示的列：

- **简单**: 名称、发布时间、参数量、上下文长度
- **爱好者**: 增加基座、输入模态、embedding 等信息
- **开发者**: 完整的技术参数和架构信息
- **自定义**: 显示所有可用参数

### 主题

在 `src/index.css` 中配置 light/dark 主题的颜色变量。

### 国际化

在 `src/lib/i18n.ts` 中添加或修改翻译文本。

## License

MIT
