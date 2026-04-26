import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function t5Def({ numLayers = 24, numHeads = 32, hiddenSize = 2048 }: DiagramParams) {
  return `flowchart TD
    input_enc(["Encoder Input tokens"]):::input
    input_dec(["Decoder Input tokens"]):::input

    subgraph outer["T5 / FLAN-T5"]
      emb_enc["Encoder Token Embedding  weight-tied"]:::emb

      subgraph enc["Encoder Block ×${numLayers}"]
        enc_ln1["RMSNorm  pre-norm"]:::norm
        enc_attn["MHA  ${numHeads} heads  Relative Attention Bias  no RoPE"]:::attn
        enc_plus1(("+")):::resid
        enc_ln2["RMSNorm  pre-norm"]:::norm
        enc_ffn["SwiGLU FFN  wi_0 · wi_1 → GELU → wo"]:::ffn
        enc_plus2(("+")):::resid
      end

      enc_lnf["Encoder Final RMSNorm"]:::norm

      emb_dec["Decoder Token Embedding  weight-tied"]:::emb

      subgraph dec["Decoder Block ×${numLayers}"]
        dec_ln1["RMSNorm  pre-norm"]:::norm
        dec_sattn["Causal Self-Attention  Relative Attention Bias"]:::attn
        dec_plus1(("+")):::resid
        dec_ln2["RMSNorm  pre-norm"]:::norm
        dec_cattn["Cross-Attention  Q from decoder  KV from encoder"]:::attn
        dec_plus2(("+")):::resid
        dec_ln3["RMSNorm  pre-norm"]:::norm
        dec_ffn["SwiGLU FFN"]:::ffn
        dec_plus3(("+")):::resid
      end

      dec_lnf["Decoder Final RMSNorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input_enc --> emb_enc --> enc_ln1 --> enc_attn --> enc_plus1 --> enc_ln2 --> enc_ffn --> enc_plus2 --> enc_lnf
    emb_enc -.->|residual| enc_plus1
    enc_plus1 -.->|residual| enc_plus2

    input_dec --> emb_dec --> dec_ln1 --> dec_sattn --> dec_plus1 --> dec_ln2 --> dec_cattn --> dec_plus2 --> dec_ln3 --> dec_ffn --> dec_plus3 --> dec_lnf --> lmh
    emb_dec -.->|residual| dec_plus1
    dec_plus1 -.->|residual| dec_plus2
    dec_plus2 -.->|residual| dec_plus3
    enc_lnf -->|encoder hidden states| dec_cattn
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  no bias  weight-tied emb/LM head"]:::resid
${BASE_STYLES}`
}

export default function T5Diagram(p: DiagramParams) {
  return <MermaidDiagram definition={t5Def(p)} fit={p.fit} />
}
