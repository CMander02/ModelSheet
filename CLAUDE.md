# ModelSheet

开源模型参数速查与对比工具。通过获取 HuggingFace 上模型的配置文件，解析并展示模型的核心参数。

## 项目结构

```
ModelSheet/
├── docs/              # 设计文档
│   ├── architecture.md    # 架构设计
│   ├── frontend.md        # 前端设计
│   ├── cli.md             # CLI 设计
│   ├── schema.md          # 字段定义
│   └── deployment.md      # 部署方案
├── cli/               # Python CLI 工具 (数据获取/解析)
├── web/               # React 前端 (shadcn/ui + Vite)
└── reference/         # 参考代码
```

## 技术栈

- **前端**: React + Vite + shadcn/ui + Tailwind CSS
- **CLI**: Python 3.13+ + typer + httpx
- **部署**: GitHub Pages (CI/CD 自动)

## 工作流程

1. 本地运行 CLI 获取模型配置
2. 解析生成 JSON 数据
3. 人工校验后 git push
4. GitHub Actions 自动构建部署

## 相关文档

详细设计请参考 `docs/` 目录下的文档。
