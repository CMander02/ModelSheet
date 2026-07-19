# ModelSheet

[English](README.md) | [简体中文](README.zh-CN.md)

**开源 LLM 模型参数速查与对比工具。**

ModelSheet 是一个可浏览的语言模型目录，展示参数量、架构、上下文长度、模态等信息。数据直接来自 HuggingFace / ModelScope 的模型配置文件，并通过本地 CLI 生成为可审查的数据快照。

→ **[在线网站](https://modelsheet.pages.dev)**

---

## 功能

ModelSheet 会解析模型配置文件，把不同来源的模型信息整理成统一的 JSON 目录。前端是 React 静态站点，支持搜索、筛选和横向对比模型。

- 已收录 **2000+** 个模型，并可通过外部定时扫描持续更新
- 覆盖 Qwen、Llama、Mistral、DeepSeek、Gemma 等主流开源权重模型
- 以精简条目收录 GPT、Claude、Gemini 等闭源前沿模型，便于横向参考
- 数据在本地生成并提交到仓库，不在运行时调用 LLM，避免幻觉数据
- **架构图库**：用通用渲染器展示主要模型家族的结构图，结构数据来自可审查的架构 DSL / JSON

---

## CLI

`modelsheet` CLI 负责抓取模型配置、解析字段，并写入 `data/models.json`。

### 安装

```bash
# 推荐使用 uv
uv sync
uv pip install -e .

# 或使用 pip
pip install -e .
```

### 添加模型

```bash
# 单个模型
modelsheet add Qwen/Qwen2.5-7B

# 一次添加多个模型
modelsheet add Qwen/Qwen2.5-7B mistralai/Mistral-7B-v0.3 deepseek-ai/DeepSeek-V3

# 从文件添加（.txt 或 .yaml）
modelsheet add --file models.txt

# 重新抓取并更新所有已有条目
modelsheet add --update-all
```

### 扫描新模型

`scan` 会把当前 HuggingFace / ModelScope 组织列表与本地快照、模型数据库做 diff，报告新增候选模型。

```bash
# 扫描所有已跟踪组织（HuggingFace + ModelScope）
modelsheet scan

# 只扫描 HuggingFace 的某个组织
modelsheet scan --source hf --org Qwen

# 显示被过滤掉的模型（量化、TTS、embedding 等）
modelsheet scan --show-skipped

# 保存快照，后续扫描从这里继续 diff
modelsheet scan --commit

# 扫描并立即添加新增模型
modelsheet scan --commit --add
```

### 构建 SQLite / D1 数据

```bash
modelsheet db build    # 写入 data/modelsheet.sqlite
modelsheet db seed     # 写入 data/d1/seed.sql
modelsheet db verify   # 校验数量、provider、架构 alias、source hash
```

`data/modelsheet.sqlite` 是本地构建产物，已被 Git 忽略。`data/d1/seed.sql` 是可审查、可部署到 Cloudflare D1 的 SQL 快照。

### 同步数据到 Cloudflare D1

模型发现和扫描由仓库外部的定时 agent / operator 负责。只要更新后的源数据被推送到 `main`，GitHub Actions 就会把这份已提交的数据发布到 Cloudflare D1。

Workflow: [`.github/workflows/d1-sync.yml`](.github/workflows/d1-sync.yml)

需要配置的 GitHub repository secrets：

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

CI 辅助脚本会通过 Cloudflare D1 query API 执行生成的 seed，并跳过 `PRAGMA` / 事务包装语句，因为 D1 远端导入会拒绝原始 `BEGIN` / `COMMIT` SQL。

Workflow 主要流程：

```bash
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify
cd src/modelsheet-web
npx wrangler d1 migrations apply modelsheet --remote
cd ../..
python scripts/sync_d1_seed.py --seed data/d1/seed.sql --wrangler src/modelsheet-web/wrangler.toml
cd src/modelsheet-web
npx wrangler d1 execute modelsheet --remote --command "SELECT COUNT(*) AS model_count FROM models" --json
```

本地登录 Wrangler 后也可以手动发布：

```bash
uv sync
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify

cd src/modelsheet-web
npm ci
npx wrangler d1 migrations apply modelsheet --remote
npm run d1:seed:remote
npx wrangler d1 execute modelsheet --remote --command "SELECT COUNT(*) AS model_count FROM models" --json
```

### 从 Cloudflare D1 导出 SQL

需要备份或检查远端 D1 时，可以使用 Wrangler export：

```bash
cd src/modelsheet-web
npx wrangler d1 export modelsheet --remote --output ../../data/d1/remote.sql --yes
```

`data/d1/remote.sql` 只用于检查或备份，不应替代作为源数据的 `data/models.json`。

### 修改本地 SQLite 数据

优先修改源文件，然后重新构建：

```bash
# 修改 data/models.json、data/providers.json 或 data/architectures/*.yaml
uv run modelsheet db build
uv run modelsheet db seed
uv run modelsheet db verify
```

直接编辑 `data/modelsheet.sqlite` 只适合临时本地调试。下一次执行 `modelsheet db build` 时它会被覆盖。需要持久保存的改动应写回 JSON / YAML 源文件，再重新生成 SQLite 和 seed SQL。

### 其他命令

```bash
modelsheet show Qwen/Qwen2.5-7B     # 查看单个模型详情
modelsheet list                      # 列出所有模型 ID
modelsheet remove --model <id>       # 删除模型
modelsheet list | grep deepseek      # 适合管道处理的输出
```

每个命令都支持 `--help`：

```bash
modelsheet --help
modelsheet scan --help
modelsheet add --help
```

---

## 数据格式

`data/models.json` 每个对象对应一个模型：

```json
{
  "id": "Qwen/Qwen2.5-7B",
  "name": "Qwen2.5-7B",
  "provider": "Qwen Team",
  "huggingfaceUrl": "https://huggingface.co/Qwen/Qwen2.5-7B",
  "totalParameters": 7615616000,
  "contextLength": 131072,
  "architecture": "qwen2",
  "architectureFamily": "Qwen2",
  "numLayers": 28,
  "numHeads": 28,
  "numKvHeads": 4,
  "hiddenSize": 3584,
  "intermediateSize": 18944,
  "positionEncoding": "RoPE",
  "activation": "silu",
  "normType": "RMSNorm",
  "mlpFactor": 5.29,
  "gqaRatio": 7.0,
  "isMoe": false,
  "releasedAt": "2024-09-18T09:53:43.000Z"
}
```

MoE 模型会额外包含 `numExperts`、`numExpertsPerToken`、`activeParameters` 等字段。闭源模型通常不包含完整架构内部字段，而是以 `techReport` 等来源链接作为参考。

---

## 自动更新

模型扫描有意与 GitHub Actions 解耦。外部定时 agent 可以运行 `modelsheet scan --commit --add`，人工审查并提交 `data/models.json` 和 `data/scan_snapshot.json` 后推送到 `main`。GitHub D1 同步 workflow 只负责把已经提交的数据发布到 Cloudflare D1。

---

## 项目结构

```text
ModelSheet/
├── .github/workflows/
│   └── d1-sync.yml           # 发布已提交的数据快照到 Cloudflare D1
├── src/
│   ├── modelsheet-cli/       # Python CLI：抓取、解析、导出、扫描
│   └── modelsheet-web/       # React + Vite 前端
├── data/
│   ├── models.json           # 模型目录，源数据
│   ├── providers.json        # org -> provider 名称映射
│   └── scan_snapshot.json    # 增量扫描快照
└── scripts/                  # 一次性数据维护脚本
```

---

## 技术栈

| 层 | 技术 |
|----|------|
| CLI | Python 3.13, typer, httpx, rich |
| 前端 | React 19, Vite, TypeScript, shadcn/ui, Tailwind, Mermaid |
| 数据 | CLI 生成的静态 JSON / SQLite / D1 seed |
| 托管 | Cloudflare Pages |
| CI | GitHub Actions |

---

## 参考与灵感

- [LLM Architecture Gallery](https://sebastianraschka.com/llm-architecture-gallery/)：Sebastian Raschka 的手绘模型架构卡片集合，启发了 `/arch` 页面
- [Transformers Timeline](https://huggingface.co/spaces/yonigozlan/Transformers-Timeline)：HuggingFace Space，用于参考架构发布时间线
- [HuggingFace transformers](https://github.com/huggingface/transformers)：模块级架构细节的主要来源

---

## Roadmap

### 架构图库

- [ ] 添加 LLaMA / LLaMA-2 / LLaMA-3 图（GQA、SwiGLU、grouped RoPE）
- [ ] 添加 Mistral / Mixtral（sliding window attention、稀疏 MoE）
- [ ] 添加 Gemma / Gemma 2（multi-query attention、logit soft-cap）
- [ ] 添加原始 Transformer（encoder-decoder, "Attention Is All You Need"）
- [ ] 从模型表格的架构列深链接到 `/arch` 页面
- [ ] Mermaid 暗色模式主题
- [ ] 架构 diff 视图（两个结构图并排对比）

### 数据与 CLI

- [ ] 为闭源模型添加 `knowledgeCutoff` 字段（YYYY-MM-DD）
- [ ] 补齐 GPT-5 系列、o-series 等闭源模型目录缺口
- [ ] ModelScope 抓取能力与 HuggingFace fetcher 对齐

### 前端

- [ ] 模型发布时间线视图（releasedAt 作为 x 轴）
- [ ] 移动端模型详情页布局优化
- [ ] 可分享的模型对比 URL

---

## 贡献

最简单的贡献方式是添加缺失模型：

```bash
modelsheet add org/model-name
# 检查 data/models.json 是否正确
git add data/models.json
git commit -m "data: add org/model-name"
```

如果要修改 CLI 或前端，请先开 issue 讨论范围。

---

## License

MIT
