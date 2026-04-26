import { MermaidDiagram } from "../mermaid-diagram"
import { BASE_STYLES, type DiagramParams } from "./shared"

function mambaDef({ numLayers = 64, hiddenSize = 2560 }: DiagramParams) {
  return `flowchart TD
    input(["Input tokens"]):::input

    subgraph outer["Mamba / Mamba-2"]
      emb["Token Embedding"]:::emb

      subgraph block["Mamba Block ×${numLayers}"]
        ln1["RMSNorm  pre-norm"]:::norm
        in_proj["Input Projection  split → x and z"]:::attn
        conv1d["Conv1d  causal  depthwise"]:::attn
        silu1["SiLU activation"]:::attn
        ssm["SSM Selective Scan  S6  dt / A / B / C learned from x"]:::attn
        gate["× gate  silu(z)  gating"]:::attn
        out_proj["Output Projection"]:::attn
        plus1(("+")):::resid
      end

      lnf["Final RMSNorm"]:::norm
      lmh["LM Head  tied to token emb"]:::out
    end

    input --> emb --> ln1 --> in_proj --> conv1d --> silu1 --> ssm --> gate --> out_proj --> plus1 --> lnf --> lmh
    emb -.->|residual| plus1
    note_h["hidden: ${hiddenSize.toLocaleString()}  ·  no attention  linear-time inference"]:::resid
${BASE_STYLES}`
}

export default function MambaDiagram(p: DiagramParams) {
  return <MermaidDiagram definition={mambaDef(p)} fit={p.fit} />
}
