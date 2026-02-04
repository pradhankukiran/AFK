-- AFK Database Schema
-- Requires PostgreSQL with PostGIS extension

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- For gen_random_uuid() on PG < 13

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'created',  -- created, uploading, processing, ready, failed
    image_count INTEGER DEFAULT 0,
    odm_task_uuid VARCHAR(100),  -- NodeODM task ID
    orthomosaic_path VARCHAR(500),
    bounds GEOMETRY(POLYGON, 4326),
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    geometry GEOMETRY(GEOMETRY, 4326),
    label VARCHAR(255) NOT NULL,
    category VARCHAR(100),  -- disease, irrigation, pest, other
    notes TEXT,
    area_sqm NUMERIC,
    perimeter_m NUMERIC,
    centroid GEOMETRY(POINT, 4326),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_annotations_geometry ON annotations USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_annotations_project ON annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_annotations_updated_at ON annotations;
CREATE TRIGGER update_annotations_updated_at
    BEFORE UPDATE ON annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
