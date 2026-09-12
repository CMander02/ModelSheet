-- Match NULL-last ordering and its tie-breakers, so browse requests can stop at LIMIT.
CREATE INDEX IF NOT EXISTS idx_models_browse_release
  ON models(released_at IS NULL, released_at DESC, name ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_models_browse_parameters
  ON models(total_parameters IS NULL, total_parameters DESC, name ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_models_provider_release
  ON models(provider_id, released_at IS NULL, released_at DESC, name ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_models_architecture_lower
  ON models(lower(architecture));
