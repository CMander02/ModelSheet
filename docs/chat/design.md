使用 material design web  完成前端设计和配置。
后端使用python完成。
使用 github action 完成 github pages 部署和推送。
注意网页流量和是否能被 google 发现静态页面。

一期开发计划：
通过下载每个模型的 config.json, tokenizer_config.json, tokenizer.json, Model Card，获取当前主流模型的几乎所有信息，并整理成大型的表格。（因为字段是固定的甚至可以csv走起）
将这个表格渲染到网页端。
一期网页端需要支持静态查找模型的具体信息，自定义显示哪些列和不显示哪些列，并配置简单、爱好者、开发者、自定义等四档kv复杂度。
网页端需要支持按特定列的排序，并现场渲染。

二期开发计划：
做类似比价网页的模型参数对比页。选择模型，一起列出，比较参数。一期的配置可以平行迁移到这里。

---
Gemini 3 给出的设计思路参考：

基本上是正确的。拿到这 4 个文件（`config.json`, `tokenizer_config.json`, `tokenizer.json`, `README.md`），你已经掌握了 **95%** 的信息，包括模型架构、如何对话、模型文档和元数据。

但是，如果你追求「**全知全能**」（特别是涉及到自动化部署、LoRA 区分、或精确的磁盘占用估算），我建议你再关注 **3 个额外的小文件**。如果不看它们，你可能会在以下几种情况「看走眼」：

### 1. 关键补充文件（强烈建议加入扫描列表）

#### A. `model.safetensors.index.json` (或 `pytorch_model.bin.index.json`)
* **作用**：权重映射表。
* **为什么需要**：
    * `config.json` 只能算出参数量（比如 7B），算不出**实际文件大小**。
    * 这个 index 文件里的 `total_size` 字段能告诉你模型下载下来精确占多少字节。
    * 它还能告诉你模型被切分成了几个文件（shard），方便你做并行下载逻辑。

#### B. `generation_config.json`
* **作用**：生成参数配置。
* **为什么需要**：
    * 有些模型极其依赖特定的 `eos_token_id` 或者 `pad_token_id`，这些有时不写在 tokenizer config 里，而是在这里。
    * 有些模型必须设置特定的 `repetition_penalty` 才能正常说话，否则会复读机。如果不读这个文件，你只看 config 可能会觉得这模型坏了。

#### C. `adapter_config.json` (至关重要❗️)
* **作用**：LoRA / Peft 适配器配置。
* **为什么需要**：
    * **这是最大的坑**。很多 Hugging Face 仓库其实不是完整模型，而是 **LoRA Adapter**。
    * 如果你只看 `config.json`，LoRA 仓库通常也会包含一个基础模型的 config，你可能会误以为它是一个完整的 7B 模型。
    * 只有检测到 `adapter_config.json`，你才能断定：“哦，这不是个独立模型，这是个挂件，需要搭配 Base Model 跑。”

---

### 2. 这个文件可以「战略性放弃」

#### `tokenizer.json`
* **观点**：如果你只是为了**扫描信息**而不是在本地运行模型，这个文件**可以不下载**。
* **理由**：
    * 它非常大（有时几 MB 甚至十几 MB），里面全是密密麻麻的词表映射。
    * 关于「是不是 Chat 模型」、「对话模板是什么」这些核心元数据，都在 **`tokenizer_config.json`** 里。
    * 除非你要分析词表的具体构成（比如含不含中文词），否则只读 `tokenizer_config.json` 足够了。

---

### 3. 终极扫描清单 (Checklist)

如果你想做一个完美的自动化扫描工具（类似你的 `AutoArxiv` 思路），这是我推荐的**优先级队列**：

| 优先级 | 文件名 | 目的 | 信息量 |
| :--- | :--- | :--- | :--- |
| **P0 (核心)** | `config.json` | 身份识别 | 架构、参数规模、上下文长度 |
| **P0 (核心)** | `README.md` | 软性说明 | License、跑分、引用、Markdown 元数据 (YAML Header) |
| **P1 (交互)** | `tokenizer_config.json`| 交互方式 | **Chat Template** (最重要)、特殊 Token |
| **P1 (类型)** | `adapter_config.json` | 判别 LoRA | **判断这是否只是一个微调层** |
| **P2 (部署)** | `*.index.json` | 物理体量 | 精确的磁盘占用大小 (`total_size`) |
| **P2 (微调)** | `generation_config.json`| 推理默认值 | 默认的温度、Top-P、停止符 |

### 总结

你的结论基本成立，但为了程序的健壮性，**请务必增加对 `adapter_config.json` 的检测**。

Hugging Face 上现在有海量的 LoRA 仓库，如果不区分，你的工具可能会把它们和 Base Model 混在一起，导致统计数据偏差巨大。

**是否需要我为你提供一个 Python 函数，用来解析 `README.md` 开头的那个 YAML Metadata（Model Card Data）？** 那里面通常包含最规范的 License 和 Dataset 信息。