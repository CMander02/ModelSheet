ALTER TABLE models ADD COLUMN model_category TEXT NOT NULL DEFAULT 'language';
ALTER TABLE models ADD COLUMN base_model TEXT;
ALTER TABLE models ADD COLUMN decision_types_json TEXT NOT NULL DEFAULT '[]';
CREATE INDEX idx_models_category_release
  ON models(model_category, released_at IS NULL, released_at DESC, name ASC, id ASC);
