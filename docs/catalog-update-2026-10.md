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
