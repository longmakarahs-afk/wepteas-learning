-- 003_face_and_qr.sql
-- Note: Requires employees table created early. Assuming it's tracked in another script or we create definitions here using IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS face_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    descriptor JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
