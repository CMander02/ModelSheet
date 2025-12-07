# 部署方案文档

## 1. 部署策略

采用 **"本地生成数据 + CI/CD 自动部署"** 的混合模式。

### 1.1 为什么不用纯 CI/CD

| 风险点 | 说明 |
|--------|------|
| 数据准确性 | LLM 解析可能产生幻觉，无法人工校验 |
| 调试困难 | CI 环境调试需要多次 commit-push-wait |
| 网络限制 | GitHub Actions IP 可能被 HuggingFace 限流 |
| 复杂度 | 需要管理 API Key、处理超时、错误重试 |

### 1.2 混合模式优势

| 特性 | 本地生成 + CI 部署 |
|------|-------------------|
| 数据准确性 | ✅ 人工校验后再提交 |
| 调试体验 | ✅ 本地断点调试 |
| 安全性 | ✅ API Key 不需要存 CI |
| 稳定性 | ✅ 本地网络可控 |
| 自动化 | 需运行一行命令 |

## 2. 工作流程

### 2.1 数据更新流程

```
开发者本地:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. 编辑 models.yaml     →  添加/更新模型列表                    │
│                                                                 │
│  2. modelsheet update    →  获取配置、解析、导出 JSON            │
│                                                                 │
│  3. 检查 git diff        →  人工校验数据正确性                   │
│                                                                 │
│  4. git add & commit     →  提交变更                            │
│                                                                 │
│  5. git push             →  触发 CI/CD                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
GitHub Actions:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. checkout             →  拉取代码                            │
│                                                                 │
│  2. pnpm install         →  安装依赖                            │
│                                                                 │
│  3. pnpm build           →  构建前端                            │
│                                                                 │
│  4. deploy               →  部署到 GitHub Pages                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 完整命令流程

```bash
# 1. 添加新模型
modelsheet add deepseek-ai/DeepSeek-V3

# 2. 更新数据
modelsheet update

# 3. 检查变更
git diff web/public/data/models.json

# 4. 确认无误后提交
git add -A
git commit -m "feat: add DeepSeek-V3 model"
git push

# CI 自动部署，等待几分钟后访问网站
```

## 3. GitHub Actions 配置

### 3.1 目录结构

```
.github/
└── workflows/
    └── deploy.yml
```

### 3.2 deploy.yml

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
    paths:
      - 'web/**'
      - '.github/workflows/deploy.yml'

  # 允许手动触发
  workflow_dispatch:

# 设置权限
permissions:
  contents: read
  pages: write
  id-token: write

# 防止并发部署
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          cache-dependency-path: 'web/pnpm-lock.yaml'

      - name: Install dependencies
        working-directory: web
        run: pnpm install --frozen-lockfile

      - name: Build
        working-directory: web
        run: pnpm build
        env:
          # Vite base path for GitHub Pages
          VITE_BASE_URL: /ModelSheet/

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 3.3 Vite 配置 (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  // GitHub Pages 部署路径
  base: process.env.VITE_BASE_URL || '/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    outDir: 'dist',
    // 生成相对路径的资源引用
    assetsDir: 'assets',
  },
})
```

## 4. GitHub Pages 设置

### 4.1 仓库设置

1. 进入仓库 Settings
2. 左侧菜单选择 **Pages**
3. Source 选择 **GitHub Actions**
4. 保存

### 4.2 自定义域名 (可选)

1. 在 `web/public/` 目录创建 `CNAME` 文件
2. 写入自定义域名: `modelsheet.example.com`
3. 在域名服务商添加 CNAME 记录指向 `<username>.github.io`

## 5. 本地开发

### 5.1 前端开发

```bash
cd web

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建
pnpm build

# 预览构建结果
pnpm preview
```

### 5.2 CLI 开发

```bash
cd cli

# 安装依赖
uv sync

# 运行 CLI
uv run modelsheet --help

# 或者安装到环境
uv pip install -e .
modelsheet --help
```

## 6. 环境变量

### 6.1 本地开发 (.env)

```bash
# web/.env.local
VITE_BASE_URL=/

# cli/.env (可选)
HF_TOKEN=hf_xxxxx
HTTP_PROXY=http://127.0.0.1:7890
```

### 6.2 生产环境

GitHub Actions 中通过 `env` 注入:

```yaml
env:
  VITE_BASE_URL: /ModelSheet/
```

## 7. SEO 优化

### 7.1 预渲染 (可选)

对于纯静态站点，可以使用 `vite-plugin-prerender` 预渲染主要页面:

```typescript
// vite.config.ts
import { prerender } from 'vite-plugin-prerender'

export default defineConfig({
  plugins: [
    react(),
    prerender({
      routes: ['/', '/compare'],
    }),
  ],
})
```

### 7.2 Meta 标签

```html
<!-- index.html -->
<head>
  <title>ModelSheet - 开源模型参数速查</title>
  <meta name="description" content="一站式查看和比较主流开源大语言模型的参数配置">
  <meta name="keywords" content="LLM, 大模型, 参数, 对比, Llama, Qwen, Mistral">

  <!-- Open Graph -->
  <meta property="og:title" content="ModelSheet - 开源模型参数速查">
  <meta property="og:description" content="一站式查看和比较主流开源大语言模型的参数配置">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://username.github.io/ModelSheet/">
</head>
```

### 7.3 Sitemap

构建时自动生成 sitemap:

```typescript
// vite.config.ts
import { generateSitemap } from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    generateSitemap({
      hostname: 'https://username.github.io/ModelSheet/',
      routes: ['/', '/compare'],
    }),
  ],
})
```

## 8. 监控与分析

### 8.1 Google Analytics (可选)

```html
<!-- index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>
```

### 8.2 错误监控 (可选)

使用 Sentry 或类似服务监控前端错误。

## 9. 发布检查清单

### 9.1 首次发布

- [ ] 仓库 Settings → Pages → Source: GitHub Actions
- [ ] 确认 `.github/workflows/deploy.yml` 正确
- [ ] 运行 `pnpm build` 本地测试构建
- [ ] 推送代码触发首次部署
- [ ] 检查 Actions 运行结果
- [ ] 访问网站验证

### 9.2 数据更新

- [ ] 运行 `modelsheet update`
- [ ] 检查 `git diff` 确认数据正确
- [ ] 提交并推送
- [ ] 等待 CI 完成
- [ ] 刷新网站验证

### 9.3 前端更新

- [ ] 本地 `pnpm dev` 测试
- [ ] `pnpm build` 确认构建成功
- [ ] 提交并推送
- [ ] 等待 CI 完成
- [ ] 验证功能正常

## 10. 故障排除

### 10.1 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 404 页面 | base path 错误 | 检查 `VITE_BASE_URL` |
| 样式丢失 | 资源路径问题 | 确认 `base` 配置正确 |
| Actions 失败 | 依赖安装失败 | 检查 `pnpm-lock.yaml` |
| 部署无更新 | 缓存问题 | 清除浏览器缓存 |

### 10.2 调试命令

```bash
# 检查 Actions 日志
gh run list
gh run view <run-id>

# 手动触发部署
gh workflow run deploy.yml
```
