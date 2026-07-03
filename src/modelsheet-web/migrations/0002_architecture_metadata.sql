ALTER TABLE architectures ADD COLUMN source_links_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE architectures ADD COLUMN variants_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE architectures ADD COLUMN evidence_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE architectures ADD COLUMN features_json TEXT NOT NULL DEFAULT '{}';
