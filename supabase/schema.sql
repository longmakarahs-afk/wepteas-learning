-- SecureAttend Supabase PostgreSQL Database Schema
-- Multi-tenant HR, Payroll, and Smart Attendance System

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create TENANTS table (Institutions like schools or corporations)
create table public.tenants (
    id uuid default gen_random_uuid() primary key,
    name_kh varchar(255) not null,
    name_en varchar(255) not null,
    domain varchar(100) unique,
    type varchar(50) not null check (type in ('school', 'company', 'other')),
    logo_url text,
    geofence_lat double precision not null default 11.5564, -- Default Phnom Penh
    geofence_lng double precision not null default 104.9282,
    geofence_radius_meters double precision not null default 100.0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create EMPLOYEES table
create table public.employees (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id) on delete cascade not null,
    full_name_kh varchar(255) not null,
    full_name_en varchar(255) not null,
    role varchar(100) not null default 'Staff',
    department varchar(100) default 'General',
    photo_url text, -- Register photo base64/URL used by Gemini for face recognition
    nfc_tag_id varchar(100) unique,
    qr_key varchar(100) unique,
    pin_code varchar(6),
    base_salary decimal(12, 2) not null default 200.00,
    status varchar(50) not null default 'active' check (status in ('active', 'inactive', 'suspended')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create ATTENDANCE_LOGS table
create table public.attendance_logs (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references public.employees(id) on delete cascade not null,
    check_in_time timestamp with time zone default timezone('utc'::text, now()) not null,
    check_out_time timestamp with time zone,
    method varchar(50) not null check (method in ('GPS', 'FACE', 'QR', 'NFC', 'PIN')),
    gps_lat double precision,
    gps_lng double precision,
    geofence_ok boolean default true,
    photo_matched boolean default false,
    face_matching_score double precision,
    status varchar(50) not null default 'ON_TIME' check (status in ('ON_TIME', 'LATE', 'HALF_DAY', 'ABSENT')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create LEAVE_REQUESTS table
create table public.leave_requests (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references public.employees(id) on delete cascade not null,
    leave_type varchar(50) not null check (leave_type in ('ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY')),
    start_date date not null,
    end_date date not null,
    reason text not null,
    status varchar(50) not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by varchar(255),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create PAYROLLS table
create table public.payrolls (
    id uuid default gen_random_uuid() primary key,
    employee_id uuid references public.employees(id) on delete cascade not null,
    billing_month varchar(7) not null, -- format "YYYY-MM"
    base_salary decimal(12, 2) not null,
    bonuses decimal(12, 2) default 0.00,
    deductions decimal(12, 2) default 0.00,
    attendance_days integer not null default 0,
    late_days integer not null default 0,
    net_salary decimal(12, 2) not null,
    status varchar(50) not null default 'PENDING' check (status in ('PENDING', 'PAID', 'APPROVED')),
    processed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_payroll_employee_month unique (employee_id, billing_month)
);

-- Enable Row Level Security (RLS)
alter table public.tenants enable row level security;
alter table public.employees enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.leave_requests enable row level security;
alter table public.payrolls enable row level security;

-- Simple permissive policies for showcase purposes
create policy "Enable all access for showcase" on public.tenants for all using (true) with check (true);
create policy "Enable all access for showcase" on public.employees for all using (true) with check (true);
create policy "Enable all access for showcase" on public.attendance_logs for all using (true) with check (true);
create policy "Enable all access for showcase" on public.leave_requests for all using (true) with check (true);
create policy "Enable all access for showcase" on public.payrolls for all using (true) with check (true);

-- Seed Data (Phnom Penh coordinates)
insert into public.tenants (id, name_kh, name_en, domain, type, geofence_lat, geofence_lng, geofence_radius_meters)
values 
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'វិទ្យាល័យបាក់ទូក', 'Bak Touk High School', 'baktouk.edu.kh', 'school', 11.5645, 104.9123, 150.0),
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'ក្រុមហ៊ុន វឌ្ឍនៈ គ្រុប', 'Vattanac Group', 'vattanac.com', 'company', 11.5724, 104.9221, 200.0);

insert into public.employees (id, tenant_id, full_name_kh, full_name_en, role, department, base_salary, status, nfc_tag_id, qr_key, pin_code)
values
('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'សុខ ជា', 'Sok Chea', 'គ្រូបង្រៀន', 'គណិតវិទ្យា', 350.00, 'active', 'NFC_BT_SOK_CHEA', 'QR_BT_SOK_CHEA', '123456'),
('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'ចាន់ ធារី', 'Chan Theary', 'គ្រូបង្រៀន', 'វិទ្យាសាស្ត្រ', 380.00, 'active', 'NFC_BT_CHAN_THEARY', 'QR_BT_CHAN_THEARY', '654321'),
('e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'លី ម៉េងហ៊ាង', 'Ly Mengheang', 'Software Engineer', 'IT Department', 850.00, 'active', 'NFC_VG_LY_MENG', 'QR_VG_LY_MENG', '888888'),
('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'សៅរ៍ វីរៈ', 'Saur Virak', 'HR Manager', 'Human Resources', 650.00, 'active', 'NFC_VG_SAUR_VIRAK', 'QR_VG_SAUR_VIRAK', '111111');
