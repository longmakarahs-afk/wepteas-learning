-- 007_work_schedule.sql

CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    mon_hours NUMERIC(4, 2) DEFAULT 8,
    tue_hours NUMERIC(4, 2) DEFAULT 8,
    wed_hours NUMERIC(4, 2) DEFAULT 8,
    thu_hours NUMERIC(4, 2) DEFAULT 8,
    fri_hours NUMERIC(4, 2) DEFAULT 8,
    sat_hours NUMERIC(4, 2) DEFAULT 0,
    sun_hours NUMERIC(4, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS timesheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    worked_hours NUMERIC(5, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
