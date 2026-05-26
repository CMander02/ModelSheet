CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  name_en TEXT,
  name_zh TEXT,
  region TEXT NOT NULL DEFAULT 'other',
  orgs_json TEXT NOT NULL DEFAULT '[]',
  scan_json TEXT NOT NULL DEFAULT '{}',
  raw_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  huggingface_url TEXT,
  modelscope_url TEXT,
  arxiv_url TEXT,
  tech_report TEXT,
  total_parameters INTEGER,
  active_parameters INTEGER,
  embedding_parameters INTEGER,
  non_embedding_parameters INTEGER,
  context_length INTEGER,
  embedding_dim INTEGER,
  vocab_size INTEGER,
  architecture TEXT,
  architecture_family TEXT,
  num_layers INTEGER,
  num_heads INTEGER,
  num_kv_heads INTEGER,
  hidden_size INTEGER,
  intermediate_size INTEGER,
  position_encoding TEXT,
  activation TEXT,
  norm_type TEXT,
  norm_eps REAL,
  attention_dropout REAL,
  mlp_factor REAL,
  gqa_ratio REAL,
  torch_dtype TEXT,
  is_moe INTEGER NOT NULL DEFAULT 0,
  num_experts INTEGER,
  num_shared_experts INTEGER,
  num_experts_per_token INTEGER,
  num_activated_experts INTEGER,
  moe_intermediate_size_json TEXT,
  input_modalities_json TEXT NOT NULL DEFAULT '[]',
  output_modalities_json TEXT NOT NULL DEFAULT '[]',
  openness TEXT,
  task TEXT,
  knowledge_cutoff TEXT,
  parameter_confidence TEXT,
  parameter_source TEXT,
  parameter_source_url TEXT,
  name_note TEXT,
  created_at TEXT,
  updated_at TEXT,
  raw_json TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS architectures (
  id TEXT PRIMARY KEY,
  family TEXT NOT NULL,
  era TEXT NOT NULL,
  type TEXT NOT NULL,
  norm_placement TEXT NOT NULL,
  description_zh TEXT NOT NULL,
  description_en TEXT NOT NULL,
  paper_url TEXT,
  hf_org TEXT,
  default_params_json TEXT NOT NULL DEFAULT '{}',
  diagram_subtitle TEXT,
  diagram_nodes_json TEXT NOT NULL DEFAULT '[]',
  raw_yaml TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS architecture_aliases (
  alias TEXT PRIMARY KEY,
  architecture_id TEXT NOT NULL,
  FOREIGN KEY (architecture_id) REFERENCES architectures(id)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_hash TEXT NOT NULL,
  model_count INTEGER NOT NULL,
  architecture_count INTEGER NOT NULL,
  synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_architecture ON models(architecture);
CREATE INDEX IF NOT EXISTS idx_models_total_parameters ON models(total_parameters);
CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at);
CREATE INDEX IF NOT EXISTS idx_models_search ON models(name, provider, id);
CREATE INDEX IF NOT EXISTS idx_architecture_aliases_architecture_id
  ON architecture_aliases(architecture_id);
