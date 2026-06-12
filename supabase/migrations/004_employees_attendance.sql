-- 004_employees_attendance.sql

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_code TEXT NOT NULL,
    full_name_kh TEXT NOT NULL,
    full_name_en TEXT NOT NULL,
    role TEXT,
    department TEXT,
    nfc_tag_id TEXT UNIQUE,
    qr_key TEXT UNIQUE,
    pin_code TEXT,
    photo_url TEXT,
    status TEXT DEFAULT 'active',
    base_salary NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(org_id, employee_code)
);

CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_time TIMESTAMP WITH TIME ZONE,
    method TEXT NOT NULL, 
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    geofence_ok BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
