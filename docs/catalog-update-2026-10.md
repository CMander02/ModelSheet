# October 2026 catalog curation

Reviewed on 2026-10-22. This update adds 15 open-weight checkpoints and the previously reviewed closed-model releases. `data/models.json` remains canonical.

## Open-weight additions

- [Amazon ALoDLM](https://huggingface.co/amazon/ALoDLM-8B): 1.7B and 8B named variants. Adaptively looped diffusion; CC BY-NC 4.0 weights. The smaller checkpoint has about 2.03B stored parameters including embeddings, despite its nominal 1.7B name.
- [QwenDLM / ORL](https://github.com/Introspective-Diffusion/ORL): `yifanyu/QwenDLM-4B` and `yifanyu/QwenDLM-4B-ORL`. 256-token block diffusion derived from Qwen3-4B-Thinking-2507. Publisher is Yifan Yu, not the Qwen organization.
- [Meta Muse Spark Open](https://huggingface.co/meta-models/Muse-Spark-Open-816B-A42B) and [Muse Glimmer](https://huggingface.co/meta-models/Muse-Glimmer-30B). Spark's config requires gated access: the CLI reported incomplete data, so the record uses the public model card and HF API. Its 822.04B full tensor count differs from the advertised 816B backbone; 42B active is approximate. Unknown layer and expert counts remain unset. The Glimmer assistant checkpoint is a speculative-decoding helper and is not included as a standalone model.
- [Reflection Beam](https://huggingface.co/reflection/Beam-1.0-501B-A23B): canonical BF16 release; official approximately 23B active, HF total tensor count.
- [Aleph Alpha Kolibri-1](https://huggingface.co/Aleph-Alpha/Kolibri-1): official exact 78,103,074,560 total / 3,457,573,120 active parameters.
- [Jais 3](https://ifm.ai/blog/jais3/): six final checkpoints from `inception42`, nominal sizes 0.9B, 3.7B, 7B, 32B, MoVA 36B-A4B and 375B-A23B. Full HF tensor counts are retained; names are not treated as exact counts. MoE active counts use the official approximate 4B and 23B values. Publisher identity is distinct from Inception Labs.
- [Tencent Hy-Memory-30B-A3B](https://huggingface.co/tencent/Hy-Memory-30B-A3B): long-term-memory writer, officially approximately 3B active parameters.

Release timestamps follow the existing repository convention of official HF `createdAt`; these may precede the public announcement. Canonical releases are included without duplicating quantized versions. Existing Hy4-preview data is preserved.

## Parameter evidence policy

Only an identifiable leak or report with an explicit source URL qualifies as `rumored`. Statistical inversion, benchmark fitting, IKP-based estimation, hardware extrapolation and assumptions that one model shares another model's size do not qualify.

Parameter estimates sourced from `anpaure/frontier-model-sizes` have been removed. Affected model records remain, with unsupported parameter counts and provenance omitted. This cleanup also removes unsupported GPT-4 Turbo, GPT-5.5, Claude 1 and ChatGPT size claims. Existing explicitly sourced rumors remain unconfirmed rumors.

## Manual exceptions

The generic parser's active-parameter estimates did not match the model cards for Kolibri, Beam, Jais MoE and Hy-Memory. Those values are curated from the official cards, with `curatedFields` preserving them on refresh. No broad parser update is bundled here. ALoDLM and QwenDLM receive separate architecture identities so diffusion decoding is not presented as ordinary autoregressive Qwen3.

Publisher icons reuse existing SVG components where available. Reflection uses its official SVG. Yifan Yu and Inception42 use traceable raster artwork pending suitable SVGs; see the artwork source list.

## Shanghai AI Lab follow-up

Reviewed on 2026-10-22, adding two open-weight checkpoints and one hosted release:

- [Sage-A1.5](https://huggingface.co/InternScience/Sage-A1.5): scientific agentic model based on Qwen3.6-35B-A3B and Agents-A1. The official tensor count is 35,951,822,704, including vision and MTP weights. Its text inference path activates 3,454,988,928 parameters. HF repository creation timestamp: 2026-10-15T08:34:39Z.
- [MLExpert](https://huggingface.co/InternScience/MLExpert): autonomous machine learning engineering model based on Qwen3.6-35B-A3B. The released tensor count is 34,660,610,688, with 3,454,988,928 active parameters. Its weight index contains no vision or MTP tensors despite those fields remaining in the config; the official serving examples use `--language-model-only`. Input is curated as text only. HF repository creation timestamp: 2026-10-01T03:51:49Z.
- [Atria Dawn](https://github.com/atria-asi/Atria-Dawn): the full release is available through the official API. Its model table advertises 512K context, while both weight download columns still say “Coming soon”. It is cataloged as closed until weights become available, separately from the existing open-weight Preview. The README names a 744B GLM-5.2 foundation; that is not treated as a verified full-checkpoint count, so parameter fields remain unset. Its release timestamp comes from the [first official full-release update](https://github.com/atria-asi/Atria-Dawn/commit/ce5c439f37841b1875b58d85bcb830903116517c), 2026-10-14T09:32:05Z. The 512K model-table update followed on October 19; older client examples still use 256K.

For both Qwen-based checkpoints, active parameters include embeddings, the LM head, attention, routers and shared experts, plus eight routed experts per layer; they exclude vision and MTP. Independently checked against MLExpert's tensor total: `34,660,610,688 - 40 × (256 - 8) × 3 × 2048 × 512 = 3,454,988,928`.

Their verified ModelScope mirrors use [InternScience/Sage-A1.5](https://modelscope.cn/models/InternScience/Sage-A1.5) and [InternScience/MLExpert](https://modelscope.cn/models/InternScience/MLExpert), rather than the CLI's default Shanghai_AI_Laboratory namespace. These URLs and MLExpert's text-only modality are protected by `curatedFields`. The existing Shanghai AI Lab / InternLM SVG mapping is reused.
