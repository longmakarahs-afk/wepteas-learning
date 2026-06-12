-- 002_system_settings.sql

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    geofence_lat DOUBLE PRECISION,
    geofence_lng DOUBLE PRECISION,
    geofence_radius_meters DOUBLE PRECISION,
    attendance_methods JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
