DROP INDEX IF EXISTS idx_models_created_at;

ALTER TABLE models RENAME COLUMN created_at TO released_at;

CREATE INDEX IF NOT EXISTS idx_models_released_at ON models(released_at);
