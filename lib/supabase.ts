import { createClient } from '@supabase/supabase-js';

export interface Tenant {
  id: string;
  name_kh: string;
  name_en: string;
  domain?: string;
  type: 'school' | 'company' | 'other';
  logo_url?: string;
  geofence_lat: number;
  geofence_lng: number;
  geofence_radius_meters: number;
  created_at?: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  full_name_kh: string;
  full_name_en: string;
  role: string;
  department?: string;
  photo_url?: string; // register photo base64/URL used for AI matching
  nfc_tag_id?: string;
  qr_key?: string;
  pin_code?: string;
  base_salary: number;
  status: 'active' | 'inactive' | 'suspended';
  created_at?: string;
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  check_in_time: string;
  check_out_time?: string;
  method: 'GPS' | 'FACE' | 'QR' | 'NFC' | 'PIN';
  gps_lat?: number;
  gps_lng?: number;
  geofence_ok: boolean;
  photo_matched: boolean;
  face_matching_score?: number;
  status: 'ON_TIME' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  notes?: string;
  created_at?: string;
  employee_name?: string; // Virtual joined property
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  created_at?: string;
  employee_name?: string; // Virtual joined property
}

export interface Payroll {
  id: string;
  employee_id: string;
  billing_month: string; // format "YYYY-MM"
  base_salary: number;
  bonuses: number;
  deductions: number;
  attendance_days: number;
  late_days: number;
  net_salary: number;
  status: 'PENDING' | 'PAID' | 'APPROVED';
  processed_at?: string;
  created_at?: string;
  employee_name?: string; // Virtual joined property
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize client if env vars exist
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Initial Seed Data for fallback
const SEED_TENANTS: Tenant[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    name_kh: 'វិទ្យាល័យបាក់ទូក',
    name_en: 'Bak Touk High School',
    domain: 'baktouk.edu.kh',
    type: 'school',
    geofence_lat: 11.5645,
    geofence_lng: 104.9123,
    geofence_radius_meters: 150.0
  },
  {
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    name_kh: 'ក្រុមហ៊ុន វឌ្ឍនៈ គ្រុប',
    name_en: 'Vattanac Group',
    domain: 'vattanac.com',
    type: 'company',
    geofence_lat: 11.5724,
    geofence_lng: 104.9221,
    geofence_radius_meters: 200.0
  }
];

const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
    tenant_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    full_name_kh: 'សុខ ជា',
    full_name_en: 'Sok Chea',
    role: 'គ្រូបង្រៀន',
    department: 'គណិតវិទ្យា',
    base_salary: 350.00,
    status: 'active',
    nfc_tag_id: 'NFC_BT_SOK_CHEA',
    qr_key: 'QR_BT_SOK_CHEA',
    pin_code: '123456'
  },
  {
    id: 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
    tenant_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    full_name_kh: 'ចាន់ ធារី',
    full_name_en: 'Chan Theary',
    role: 'គ្រូបង្រៀន',
    department: 'វិទ្យាសាស្ត្រ',
    base_salary: 380.00,
    status: 'active',
    nfc_tag_id: 'NFC_BT_CHAN_THEARY',
    qr_key: 'QR_BT_CHAN_THEARY',
    pin_code: '654321'
  },
  {
    id: 'e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3',
    tenant_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    full_name_kh: 'លី ម៉េងហ៊ាង',
    full_name_en: 'Ly Mengheang',
    role: 'Software Engineer',
    department: 'IT Department',
    base_salary: 850.00,
    status: 'active',
    nfc_tag_id: 'NFC_VG_LY_MENG',
    qr_key: 'QR_VG_LY_MENG',
    pin_code: '888888'
  },
  {
    id: 'e4e4e4e4-e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4',
    tenant_id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    full_name_kh: 'សៅរ៍ វីរៈ',
    full_name_en: 'Saur Virak',
    role: 'HR Manager',
    department: 'Human Resources',
    base_salary: 650.00,
    status: 'active',
    nfc_tag_id: 'NFC_VG_SAUR_VIRAK',
    qr_key: 'QR_VG_SAUR_VIRAK',
    pin_code: '111111'
  }
];

const SEED_ATTENDANCE: AttendanceLog[] = [
  {
    id: 'a-1',
    employee_id: 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
    check_in_time: '2026-06-09T07:15:00Z',
    check_out_time: '2026-06-09T16:30:00Z',
    method: 'GPS',
    gps_lat: 11.5646,
    gps_lng: 104.9124,
    geofence_ok: true,
    photo_matched: true,
    status: 'ON_TIME',
  },
  {
    id: 'a-2',
    employee_id: 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
    check_in_time: '2026-06-09T08:12:00Z',
    check_out_time: '2026-06-09T17:00:00Z',
    method: 'FACE',
    gps_lat: 11.5641,
    gps_lng: 104.9121,
    geofence_ok: true,
    photo_matched: true,
    status: 'LATE',
  },
  {
    id: 'a-3',
    employee_id: 'e3e3e3e3-e3e3-e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3',
    check_in_time: '2026-06-09T07:45:00Z',
    check_out_time: '2026-06-09T18:00:00Z',
    method: 'NFC',
    geofence_ok: true,
    photo_matched: false,
    status: 'ON_TIME',
  }
];

const SEED_LEAVES: LeaveRequest[] = [
  {
    id: 'l-1',
    employee_id: 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
    leave_type: 'ANNUAL',
    start_date: '2026-06-12',
    end_date: '2026-06-14',
    reason: 'សម្រាកលំហែកាយជាមួយគ្រួសារ',
    status: 'APPROVED',
    approved_by: 'Virak Hr'
  },
  {
    id: 'l-2',
    employee_id: 'e4e4e4e4-e4e4-e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4',
    leave_type: 'SICK',
    start_date: '2026-06-19',
    end_date: '2026-06-20',
    reason: 'ឈឺធ្មេញ ត្រូវទៅពិនិត្យ',
    status: 'PENDING'
  }
];

const SEED_PAYROLLS: Payroll[] = [
  {
    id: 'p-1',
    employee_id: 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
    billing_month: '2026-05',
    base_salary: 350.00,
    bonuses: 20.00,
    deductions: 0.00,
    attendance_days: 22,
    late_days: 1,
    net_salary: 370.00,
    status: 'PAID',
    processed_at: '2026-05-30T10:00:00Z'
  },
  {
    id: 'p-2',
    employee_id: 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2',
    billing_month: '2026-05',
    base_salary: 380.00,
    bonuses: 0.00,
    deductions: 15.00,
    attendance_days: 20,
    late_days: 3,
    net_salary: 365.00,
    status: 'PENDING'
  }
];

// LocalStorage Helper for fallback browser storage
const getStored = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(`secureattend_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setStored = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`secureattend_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error', e);
  }
};

// Clear everything and re-initialize fallback data
export const forceResetDatabase = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('secureattend_tenants', JSON.stringify(SEED_TENANTS));
  localStorage.setItem('secureattend_employees', JSON.stringify(SEED_EMPLOYEES));
  localStorage.setItem('secureattend_attendance_logs', JSON.stringify(SEED_ATTENDANCE));
  localStorage.setItem('secureattend_leave_requests', JSON.stringify(SEED_LEAVES));
  localStorage.setItem('secureattend_payrolls', JSON.stringify(SEED_PAYROLLS));
};

export const getDbState = () => {
  const tenants = getStored('tenants', SEED_TENANTS);
  const employees = getStored('employees', SEED_EMPLOYEES);
  const logs = getStored('attendance_logs', SEED_ATTENDANCE);
  const leaves = getStored('leave_requests', SEED_LEAVES);
  const payrolls = getStored('payrolls', SEED_PAYROLLS);

  // Guarantee seed tables are saved in LocalStorage if first time
  if (typeof window !== 'undefined' && !localStorage.getItem('secureattend_tenants')) {
    setStored('tenants', tenants);
    setStored('employees', employees);
    setStored('attendance_logs', logs);
    setStored('leave_requests', leaves);
    setStored('payrolls', payrolls);
  }

  return { tenants, employees, logs, leaves, payrolls };
};

// Database operation wrapper
export const db = {
  // --- TENANTS ---
  async getTenants(): Promise<Tenant[]> {
    if (supabase) {
      const { data, error } = await supabase.from('tenants').select('*').order('name_en', { ascending: true });
      if (!error && data) return data as Tenant[];
    }
    return getDbState().tenants;
  },

  async addTenant(tenant: Omit<Tenant, 'id'>): Promise<Tenant> {
    const newTenant: Tenant = {
      ...tenant,
      id: crypto.randomUUID()
    };
    if (supabase) {
      const { data, error } = await supabase.from('tenants').insert([newTenant]).select().single();
      if (!error && data) return data as Tenant;
    }
    const state = getDbState();
    state.tenants.push(newTenant);
    setStored('tenants', state.tenants);
    return newTenant;
  },

  async updateTenantGeofence(id: string, lat: number, lng: number, radius: number): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from('tenants')
        .update({ geofence_lat: lat, geofence_lng: lng, geofence_radius_meters: radius })
        .eq('id', id);
      return !error;
    }
    const state = getDbState();
    const index = state.tenants.findIndex(t => t.id === id);
    if (index !== -1) {
      state.tenants[index] = { ...state.tenants[index], geofence_lat: lat, geofence_lng: lng, geofence_radius_meters: radius };
      setStored('tenants', state.tenants);
      return true;
    }
    return false;
  },

  // --- EMPLOYEES ---
  async getEmployees(tenantId?: string): Promise<Employee[]> {
    if (supabase) {
      let query = supabase.from('employees').select('*');
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      const { data, error } = await query;
      if (!error && data) return data as Employee[];
    }
    const { employees } = getDbState();
    return tenantId ? employees.filter(e => e.tenant_id === tenantId) : employees;
  },

  async addEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    const newEmployee: Employee = {
      ...employee,
      id: crypto.randomUUID()
    };
    if (supabase) {
      const { data, error } = await supabase.from('employees').insert([newEmployee]).select().single();
      if (!error && data) return data as Employee;
    }
    const state = getDbState();
    state.employees.push(newEmployee);
    setStored('employees', state.employees);
    return newEmployee;
  },

  async updateEmployeePhoto(id: string, photoUrl: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('employees').update({ photo_url: photoUrl }).eq('id', id);
      return !error;
    }
    const state = getDbState();
    const index = state.employees.findIndex(e => e.id === id);
    if (index !== -1) {
      state.employees[index].photo_url = photoUrl;
      setStored('employees', state.employees);
      return true;
    }
    return false;
  },

  // --- ATTENDANCE ---
  async getAttendanceLogs(tenantId?: string): Promise<AttendanceLog[]> {
    if (supabase) {
      // In Supabase, can join on employees
      const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          employees:employee_id (
            full_name_kh,
            full_name_en,
            tenant_id
          )
        `)
        .order('check_in_time', { ascending: false });
        
      if (!error && data) {
        // filter by tenantId if provided
        const formatted = data.map((item: any) => ({
          ...item,
          employee_name: item.employees?.full_name_kh || item.employees?.full_name_en,
          tenant_id: item.employees?.tenant_id
        }));
        return tenantId ? formatted.filter(f => f.tenant_id === tenantId) : formatted;
      }
    }

    const { logs, employees } = getDbState();
    const joined = logs.map(l => {
      const emp = employees.find(e => e.id === l.employee_id);
      return {
        ...l,
        employee_name: emp ? `${emp.full_name_kh} (${emp.full_name_en})` : 'Unknown Employee',
        tenant_id: emp?.tenant_id
      };
    });

    return tenantId ? joined.filter(l => l.tenant_id === tenantId) : joined;
  },

  async checkIn(log: Omit<AttendanceLog, 'id' | 'check_in_time'>): Promise<AttendanceLog> {
    const newLog: AttendanceLog = {
      ...log,
      id: crypto.randomUUID(),
      check_in_time: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from('attendance_logs').insert([newLog]).select().single();
      if (!error && data) return data as AttendanceLog;
    }
    const state = getDbState();
    state.logs.push(newLog);
    setStored('attendance_logs', state.logs);
    return newLog;
  },

  async checkOut(employeeId: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (supabase) {
      // find open check-in
      const { data: openLog, error: findError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1);

      if (!findError && openLog && openLog.length > 0) {
        const { error } = await supabase
          .from('attendance_logs')
          .update({ check_out_time: now })
          .eq('id', openLog[0].id);
        return !error;
      }
      return false;
    }

    const state = getDbState();
    // find index of employee's open log of today
    const index = state.logs.findIndex(l => l.employee_id === employeeId && !l.check_out_time);
    if (index !== -1) {
      state.logs[index].check_out_time = now;
      setStored('attendance_logs', state.logs);
      return true;
    }
    return false;
  },

  // --- LEAVE REQUESTS ---
  async getLeaveRequests(tenantId?: string): Promise<LeaveRequest[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees:employee_id (
            full_name_kh,
            full_name_en,
            tenant_id
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted = data.map((item: any) => ({
          ...item,
          employee_name: item.employees?.full_name_kh || item.employees?.full_name_en,
          tenant_id: item.employees?.tenant_id
        }));
        return tenantId ? formatted.filter(f => f.tenant_id === tenantId) : formatted;
      }
    }

    const { leaves, employees } = getDbState();
    const joined = leaves.map(l => {
      const emp = employees.find(e => e.id === l.employee_id);
      return {
        ...l,
        employee_name: emp ? `${emp.full_name_kh} (${emp.full_name_en})` : 'Unknown Employee',
        tenant_id: emp?.tenant_id
      };
    });
    return tenantId ? joined.filter(l => l.tenant_id === tenantId) : joined;
  },

  async addLeaveRequest(req: Omit<LeaveRequest, 'id' | 'status'>): Promise<LeaveRequest> {
    const newReq: LeaveRequest = {
      ...req,
      id: crypto.randomUUID(),
      status: 'PENDING'
    };
    if (supabase) {
      const { data, error } = await supabase.from('leave_requests').insert([newReq]).select().single();
      if (!error && data) return data as LeaveRequest;
    }
    const state = getDbState();
    state.leaves.push(newReq);
    setStored('leave_requests', state.leaves);
    return newReq;
  },

  async updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED', approvedBy: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status, approved_by: approvedBy })
        .eq('id', id);
      return !error;
    }
    const state = getDbState();
    const index = state.leaves.findIndex(l => l.id === id);
    if (index !== -1) {
      state.leaves[index] = { ...state.leaves[index], status, approved_by: approvedBy };
      setStored('leave_requests', state.leaves);
      return true;
    }
    return false;
  },

  // --- PAYROLLS ---
  async getPayrolls(tenantId?: string): Promise<Payroll[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('payrolls')
        .select(`
          *,
          employees:employee_id (
            full_name_kh,
            full_name_en,
            tenant_id
          )
        `)
        .order('billing_month', { ascending: false });

      if (!error && data) {
        const formatted = data.map((item: any) => ({
          ...item,
          employee_name: item.employees?.full_name_kh || item.employees?.full_name_en,
          tenant_id: item.employees?.tenant_id
        }));
        return tenantId ? formatted.filter(f => f.tenant_id === tenantId) : formatted;
      }
    }

    const { payrolls, employees } = getDbState();
    const joined = payrolls.map(p => {
      const emp = employees.find(e => e.id === p.employee_id);
      return {
        ...p,
        employee_name: emp ? `${emp.full_name_kh} (${emp.full_name_en})` : 'Unknown Employee',
        tenant_id: emp?.tenant_id
      };
    });
    return tenantId ? joined.filter(p => p.tenant_id === tenantId) : joined;
  },

  async addPayroll(payroll: Omit<Payroll, 'id'>): Promise<Payroll> {
    const newPayroll: Payroll = {
      ...payroll,
      id: crypto.randomUUID()
    };
    if (supabase) {
      const { data, error } = await supabase.from('payrolls').insert([newPayroll]).select().single();
      if (!error && data) return data as Payroll;
    }
    const state = getDbState();
    const existId = state.payrolls.findIndex(p => p.employee_id === payroll.employee_id && p.billing_month === payroll.billing_month);
    if (existId !== -1) {
      state.payrolls[existId] = { ...state.payrolls[existId], ...newPayroll };
    } else {
      state.payrolls.push(newPayroll);
    }
    setStored('payrolls', state.payrolls);
    return newPayroll;
  }
};
