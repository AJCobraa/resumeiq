-- Migration: Add auto-branching columns to resumes table
-- is_base: TRUE = master resume (never mutated by approvals), FALSE = job-specific tailored copy
-- source_resume_id: lineage tracking — which base resume a tailored copy was forked from

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_base BOOLEAN DEFAULT TRUE NOT NULL;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS source_resume_id VARCHAR;
