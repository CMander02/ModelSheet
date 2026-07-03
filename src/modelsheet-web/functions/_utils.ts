interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>
  first<T = Record<string, unknown>>(): Promise<T | null>
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement
}

export interface FunctionEnv {
  DB?: D1DatabaseLike
  ASSETS?: { fetch: (req: Request) => Promise<Response> }
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function loadStaticModels(env: FunctionEnv, requestUrl: URL): Promise<Record<string, unknown>[]> {
  if (!env.ASSETS) return []
  const assetUrl = new URL("/data/models.json", requestUrl.origin)
  const assetResp = await env.ASSETS.fetch(new Request(assetUrl))
  if (!assetResp.ok) return []
  return assetResp.json()
}

export function modelFromRow(row: Record<string, unknown>): Record<string, unknown> {
  const raw = parseJson<Record<string, unknown>>(row.raw_json, {})
  if (Object.keys(raw).length > 0) return raw

  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    huggingfaceUrl: row.huggingface_url,
    modelscopeUrl: row.modelscope_url,
    arxivUrl: row.arxiv_url,
    techReport: row.tech_report,
    totalParameters: row.total_parameters,
    activeParameters: row.active_parameters,
    embeddingParameters: row.embedding_parameters,
    nonEmbeddingParameters: row.non_embedding_parameters,
    contextLength: row.context_length,
    embeddingDim: row.embedding_dim,
    vocabSize: row.vocab_size,
    architecture: row.architecture,
    architectureFamily: row.architecture_family,
    numLayers: row.num_layers,
    numHeads: row.num_heads,
    numKvHeads: row.num_kv_heads,
    hiddenSize: row.hidden_size,
    intermediateSize: row.intermediate_size,
    positionEncoding: row.position_encoding,
    activation: row.activation,
    normType: row.norm_type,
    normEps: row.norm_eps,
    attentionDropout: row.attention_dropout,
    mlpFactor: row.mlp_factor,
    gqaRatio: row.gqa_ratio,
    torchDtype: row.torch_dtype,
    isMoe: Boolean(row.is_moe),
    numExperts: row.num_experts,
    numSharedExperts: row.num_shared_experts,
    numExpertsPerToken: row.num_experts_per_token,
    numActivatedExperts: row.num_activated_experts,
    moeIntermediateSize: parseJson(row.moe_intermediate_size_json, undefined),
    inputModalities: parseJson(row.input_modalities_json, []),
    outputModalities: parseJson(row.output_modalities_json, []),
    openness: row.openness,
    task: row.task,
    knowledgeCutoff: row.knowledge_cutoff,
    parameterConfidence: row.parameter_confidence,
    parameterSource: row.parameter_source,
    parameterSourceUrl: row.parameter_source_url,
    nameNote: row.name_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function architectureFromRow(
  row: Record<string, unknown>,
  aliases: string[] = [],
): Record<string, unknown> {
  return {
    id: row.id,
    family: row.family,
    era: row.era,
    type: row.type,
    normPlacement: row.norm_placement,
    descriptionZh: row.description_zh,
    descriptionEn: row.description_en,
    paperUrl: row.paper_url,
    hfOrg: row.hf_org,
    defaultParams: parseJson(row.default_params_json, {}),
    sourceLinks: parseJson(row.source_links_json, []),
    variants: parseJson(row.variants_json, []),
    evidence: parseJson(row.evidence_json, []),
    features: parseJson(row.features_json, {}),
    diagramSubtitle: row.diagram_subtitle,
    diagramNodes: parseJson(row.diagram_nodes_json, []),
    modelTypeAliases: aliases,
  }
}

export function providerFromRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id,
    name: row.display_name,
    displayName: row.display_name,
    nameEn: row.name_en,
    nameZh: row.name_zh,
    region: row.region,
    orgs: parseJson(row.orgs_json, []),
    scan: parseJson(row.scan_json, {}),
    modelCount: row.model_count ?? 0,
    archCount: row.arch_count ?? 0,
    latestCreatedAt: row.latest_created_at ?? null,
  }
}

export async function architectureAliases(
  db: D1DatabaseLike,
  ids?: string[],
): Promise<Map<string, string[]>> {
  const params = ids ?? []
  const where = params.length
    ? `WHERE architecture_id IN (${params.map(() => "?").join(",")})`
    : ""
  const rows = await db
    .prepare(`SELECT alias, architecture_id FROM architecture_aliases ${where} ORDER BY alias`)
    .bind(...params)
    .all<{ alias: string; architecture_id: string }>()

  const map = new Map<string, string[]>()
  for (const row of rows.results ?? []) {
    const list = map.get(row.architecture_id) ?? []
    list.push(row.alias)
    map.set(row.architecture_id, list)
  }
  return map
}
