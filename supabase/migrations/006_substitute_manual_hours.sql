-- 006_substitute_manual_hours.sql

ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS substitute_for_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
