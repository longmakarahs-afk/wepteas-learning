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

export interface Organization {
  id: string;
  slug: string;
  name: string;
  admin_password?: string;
  geofence?: {
    lat: number;
    lng: number;
    radius_meters: number;
  };
  payroll?: {
    salary_style: 'fixed' | 'hourly';
    deduction_rate_late: number;
    deduction_rate_absent: number;
  };
  payroll_settings?: {
    late_penalty_rate: number;
    absent_penalty_rate: number;
    target_working_days: number;
  };
  qr_secret?: string;
  attendance_methods?: {
    gps: boolean;
    face: boolean;
    qr: boolean;
    nfc: boolean;
    pin: boolean;
    manual?: boolean;
  };
  created_at?: string;
}

export interface Timesheet {
  id: string;
  employee_id: string;
  org_id: string;
  date: string; // YYYY-MM-DD
  worked_hours: number;
  notes?: string;
}

export interface WeeklySchedule {
  id: string;
  employee_id: string;
  org_id: string;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  saturday_hours: number;
  sunday_hours: number;
}

export interface Employee {
  id: string;
  employee_code?: string; // Unique employee code (e.g. EMP001)
  tenant_id: string;
  org_id?: string; // Multi-tenant isolation ID
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
  telegram_id?: string; // telegram ID (user request)
  active?: boolean; // active boolean (user request)
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  employee_code: string; // Keyed employee code (user request)
  org_id?: string; // Multi-tenant isolation ID
  substitute_for_employee_id?: string; // Picked worker we are covering for
  check_in_time: string;
  check_out_time?: string;
  method: 'GPS' | 'FACE' | 'QR' | 'NFC' | 'PIN' | 'MANUAL';
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
  org_id?: string; // Multi-tenant isolation ID
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
  org_id?: string; // Multi-tenant isolation ID
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

// Cookie and cryptographic signature helpers
export function getOrgSlugCookieClient(): string {
  if (typeof window === 'undefined') return 'default';
  const urlParams = new URLSearchParams(window.location.search);
  const orgParam = urlParams.get('org');
  if (orgParam) {
    document.cookie = `org=${orgParam};path=/;max-age=31536000`;
    return orgParam;
  }
  const match = document.cookie.match(/(?:^|; )org=([^;]*)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return 'default';
}

export function setOrgSlugCookieClient(slug: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `org=${slug};path=/;max-age=31536000`;
}

export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';
  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664f, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  /* @ts-ignore */
  const isPrime = {};
  let candidate = 2;
  let primeCount = 0;
  while (primeCount < 64) {
    /* @ts-ignore */
    if (!isPrime[candidate]) {
      for (i = candidate * candidate; i < 311; i += candidate) {
        /* @ts-ignore */
        isPrime[i] = true;
      }
      hash[primeCount] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
      k[primeCount] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCount++;
    }
    candidate++;
  }
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength | 0);
  for (j = 0; j < words[lengthProperty]; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);
    hash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const wItem = i < 16 ? w[i] : (
        words[i] = (
          (rightRotate(words[i - 2], 17) ^ rightRotate(words[i - 2], 19) ^ (words[i - 2] >>> 10)) +
          (words[i - 7] || 0) +
          (rightRotate(words[i - 15], 7) ^ rightRotate(words[i - 15], 18) ^ (words[i - 15] >>> 3)) +
          (words[i - 16] || 0)
        ) | 0
      );
      const temp1 = (
        (hash[7] +
          (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
          ((hash[4] & hash[5]) ^ (~hash[4] & hash[6])) +
          k[i] +
          wItem) | 0
      );
      const temp2 = (
        ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) +
          ((hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]))) | 0
      );
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.length = 8;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
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
    employee_code: 'EMP001',
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
    employee_code: 'EMP002',
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
    employee_code: 'EMP003',
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
  localStorage.setItem('secureattend_organizations', JSON.stringify(SEED_ORGANIZATIONS));
  localStorage.setItem('secureattend_timesheets', JSON.stringify([]));
  localStorage.setItem('secureattend_weekly_schedules', JSON.stringify([]));
};

export interface FaceEnrollment {
  id: string;
  employee_id: string;
  descriptor: number[];
  created_at?: string;
}

const SEED_FACE_ENROLLMENTS: FaceEnrollment[] = [];

export const SEED_ORGANIZATIONS: Organization[] = [
  {
    id: 'default',
    slug: 'default',
    name: 'Default Org',
    admin_password: 'admin',
    geofence: {
      lat: 11.5645,
      lng: 104.9123,
      radius_meters: 150.0
    },
    payroll: {
      salary_style: 'fixed',
      deduction_rate_late: 2.50,
      deduction_rate_absent: 15.00
    },
    qr_secret: 'defaultorgkey123',
    attendance_methods: {
      gps: true,
      face: true,
      qr: true,
      nfc: true,
      pin: true,
      manual: true
    }
  },
  {
    id: 'baktouk',
    slug: 'baktouk',
    name: 'Bak Touk High Organization',
    admin_password: 'admin',
    geofence: {
      lat: 11.5645,
      lng: 104.9123,
      radius_meters: 150.0
    },
    payroll: {
      salary_style: 'fixed',
      deduction_rate_late: 2.00,
      deduction_rate_absent: 10.00
    },
    qr_secret: 'baktouksecrets789',
    attendance_methods: {
      gps: true,
      face: true,
      qr: true,
      nfc: true,
      pin: true,
      manual: true
    }
  }
];

export const getDbState = () => {
  const tenants = getStored('tenants', SEED_TENANTS);
  const rawEmployees = getStored('employees', SEED_EMPLOYEES);
  const rawLogs = getStored('attendance_logs', SEED_ATTENDANCE);
  const leaves = getStored('leave_requests', SEED_LEAVES);
  const payrolls = getStored('payrolls', SEED_PAYROLLS);
  const face_enrollments = getStored('face_enrollments', SEED_FACE_ENROLLMENTS);
  const organizations = getStored('organizations', SEED_ORGANIZATIONS);
  const timesheets = getStored('timesheets', [] as Timesheet[]);
  const weekly_schedules = getStored('weekly_schedules', [] as WeeklySchedule[]);

  // Upgrade / normalize employees to fit user requested schema
  const employees: Employee[] = rawEmployees.map((emp, idx) => {
    const nextCodeNum = idx + 1;
    const padding = nextCodeNum < 10 ? '00' : nextCodeNum < 100 ? '0' : '';
    const generatedCode = `EMP${padding}${nextCodeNum}`;
    return {
      ...emp,
      org_id: emp.org_id || 'default',
      employee_code: emp.employee_code || (emp as any).qr_key || generatedCode,
      active: emp.active !== undefined ? emp.active : emp.status !== 'inactive',
      telegram_id: emp.telegram_id || `@emp_${emp.full_name_en.replace(/\s+/g, '_').toLowerCase()}`
    };
  });

  // Upgrade / normalize logs with keying by employee_code and org_id
  const logs: AttendanceLog[] = rawLogs.map(log => {
    const emp = employees.find(e => e.id === log.employee_id);
    return {
      ...log,
      org_id: log.org_id || emp?.org_id || 'default',
      employee_code: log.employee_code || emp?.employee_code || 'EMP001'
    };
  });

  // Guarantee seed tables are saved in LocalStorage if first time
  if (typeof window !== 'undefined' && !localStorage.getItem('secureattend_organizations')) {
    setStored('organizations', organizations);
    setStored('employees', employees);
    setStored('attendance_logs', logs);
    setStored('leave_requests', leaves.map(l => ({ ...l, org_id: 'default' })));
    setStored('payrolls', payrolls.map(p => ({ ...p, org_id: 'default' })));
    setStored('timesheets', timesheets);
    setStored('weekly_schedules', weekly_schedules);
  }

  return { tenants, employees, logs, leaves, payrolls, face_enrollments, organizations, timesheets, weekly_schedules };
};

// Database operation wrapper
export const db = {
  // --- ORGANIZATIONS ---
  async getOrganizations(): Promise<Organization[]> {
    if (supabase) {
      const { data, error } = await supabase.from('organizations').select('*').order('name', { ascending: true });
      if (!error && data) return data as Organization[];
    }
    return getDbState().organizations;
  },

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    if (supabase) {
      const { data, error } = await supabase.from('organizations').select('*').eq('slug', slug).maybeSingle();
      if (!error && data) return data as Organization;
    }
    const orgs = getDbState().organizations;
    return orgs.find(o => o.slug === slug) || null;
  },

  async addOrganization(org: Omit<Organization, 'id'>): Promise<Organization> {
    const newOrg: Organization = {
      ...org,
      id: crypto.randomUUID()
    };
    if (supabase) {
      const { data, error } = await supabase.from('organizations').insert([newOrg]).select().single();
      if (!error && data) return data as Organization;
    }
    const state = getDbState();
    state.organizations.push(newOrg);
    setStored('organizations', state.organizations);
    return newOrg;
  },

  async updateOrganization(id: string, updatedFields: Partial<Organization>): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('organizations').update(updatedFields).eq('id', id);
      return !error;
    }
    const state = getDbState();
    const index = state.organizations.findIndex(o => o.id === id);
    if (index !== -1) {
      state.organizations[index] = { ...state.organizations[index], ...updatedFields };
      setStored('organizations', state.organizations);
      return true;
    }
    return false;
  },

  // --- TENANTS (Legacy alias to Organization) ---
  async getTenants(): Promise<Tenant[]> {
    const orgs = await this.getOrganizations();
    return orgs.map(o => ({
      id: o.id,
      name_kh: o.name,
      name_en: o.name,
      type: 'company',
      geofence_lat: o.geofence?.lat || 11.5645,
      geofence_lng: o.geofence?.lng || 104.9123,
      geofence_radius_meters: o.geofence?.radius_meters || 150
    }));
  },

  async addTenant(tenant: Omit<Tenant, 'id'>): Promise<Tenant> {
    const o = await this.addOrganization({
      slug: tenant.name_en.toLowerCase().replace(/\s+/g, '-'),
      name: tenant.name_kh || tenant.name_en,
      admin_password: 'admin',
      geofence: {
        lat: tenant.geofence_lat,
        lng: tenant.geofence_lng,
        radius_meters: tenant.geofence_radius_meters
      },
      attendance_methods: { gps: true, face: true, qr: true, nfc: true, pin: true, manual: true }
    });
    return {
      id: o.id,
      name_kh: o.name,
      name_en: o.name,
      type: 'company',
      geofence_lat: o.geofence?.lat || 11.5645,
      geofence_lng: o.geofence?.lng || 104.9123,
      geofence_radius_meters: o.geofence?.radius_meters || 150
    };
  },

  async updateTenantGeofence(id: string, lat: number, lng: number, radius: number): Promise<boolean> {
    return this.updateOrganization(id, {
      geofence: { lat, lng, radius_meters: radius }
    });
  },

  // --- EMPLOYEES ---
  async getEmployees(orgId?: string): Promise<Employee[]> {
    const filterOrgId = orgId || 'default';
    if (supabase) {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('org_id', filterOrgId)
          .range(from, to);
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        }
      }
      return allData as Employee[];
    }
    const { employees } = getDbState();
    return employees.filter(e => (e.org_id || 'default') === filterOrgId);
  },

  async addEmployee(employee: Omit<Employee, 'id'> & { org_id?: string }): Promise<Employee> {
    const filterOrgId = employee.org_id || 'default';
    const stateForCode = getDbState();
    const nextCodeNum = stateForCode.employees.filter(e => (e.org_id || 'default') === filterOrgId).length + 1;
    const padding = nextCodeNum < 10 ? '00' : nextCodeNum < 100 ? '0' : '';
    const generatedCode = `EMP${padding}${nextCodeNum}`;

    const newEmployee: Employee = {
      ...employee,
      id: crypto.randomUUID(),
      org_id: filterOrgId,
      employee_code: employee.employee_code || generatedCode,
      active: employee.active !== undefined ? employee.active : true,
      telegram_id: employee.telegram_id || ''
    };

    if (supabase) {
      const { data, error } = await supabase.from('employees').insert([newEmployee]).select().single();
      if (!error && data) return data as Employee;
    }
    const state = getDbState();
    state.employees.push(newEmployee as any);
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

  async updateEmployeeTelegramId(id: string, telegramId: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('employees').update({ telegram_id: telegramId }).eq('id', id);
      return !error;
    }
    const state = getDbState();
    const index = state.employees.findIndex(e => e.id === id);
    if (index !== -1) {
      state.employees[index].telegram_id = telegramId;
      setStored('employees', state.employees);
      return true;
    }
    return false;
  },

  async updateEmployee(id: string, updatedFields: Partial<Employee>): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('employees').update(updatedFields).eq('id', id);
      return !error;
    }
    const state = getDbState();
    const index = state.employees.findIndex(e => e.id === id);
    if (index !== -1) {
      state.employees[index] = { ...state.employees[index], ...updatedFields };
      setStored('employees', state.employees);
      return true;
    }
    return false;
  },

  async deleteEmployee(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      return !error;
    }
    const state = getDbState();
    const index = state.employees.findIndex(e => e.id === id);
    if (index !== -1) {
      state.employees.splice(index, 1);
      setStored('employees', state.employees);
      return true;
    }
    return false;
  },

  // --- ATTENDANCE ---
  async getAttendanceLogs(orgId?: string): Promise<AttendanceLog[]> {
    const filterOrgId = orgId || 'default';
    if (supabase) {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('attendance_logs')
          .select(`
            *,
            employees:employee_id (
              id,
              full_name_kh,
              full_name_en,
              org_id
            )
          `)
          .eq('org_id', filterOrgId)
          .range(from, to)
          .order('check_in_time', { ascending: false });
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        }
      }
      return allData.map((item: any) => ({
        ...item,
        employee_name: item.employees?.full_name_kh || item.employees?.full_name_en,
        org_id: item.employees?.org_id || item.org_id
      }));
    }

    const { logs, employees } = getDbState();
    const joined = logs.map(l => {
      const emp = employees.find(e => e.id === l.employee_id);
      return {
        ...l,
        employee_name: emp ? `${emp.full_name_kh} (${emp.full_name_en})` : 'Unknown Employee',
        org_id: emp?.org_id || l.org_id || 'default'
      };
    });

    return joined.filter(l => (l.org_id || 'default') === filterOrgId);
  },

  async checkIn(log: Omit<AttendanceLog, 'id' | 'check_in_time' | 'employee_code'> & { employee_code?: string; org_id?: string; substitute_for_employee_id?: string }): Promise<AttendanceLog> {
    const filterOrgId = log.org_id || 'default';
    const dbStateForCode = getDbState();
    const emp = dbStateForCode.employees.find(e => e.id === log.employee_id);
    const newLog: AttendanceLog = {
      ...log,
      id: crypto.randomUUID(),
      org_id: filterOrgId,
      substitute_for_employee_id: log.substitute_for_employee_id || undefined,
      employee_code: log.employee_code || emp?.employee_code || 'EMP001',
      check_in_time: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from('attendance_logs').insert([newLog]).select().single();
      if (!error && data) {
        if (emp) {
          sendTelegramCheckInAlert(emp, data as AttendanceLog).catch(err => console.error('Telegram alerting failed:', err));
        }
        return data as AttendanceLog;
      }
    }
    const state = getDbState();
    state.logs.push(newLog);
    setStored('attendance_logs', state.logs);
    if (emp) {
      sendTelegramCheckInAlert(emp, newLog).catch(err => console.error('Telegram alerting failed:', err));
    }
    return newLog;
  },

  async checkOut(employeeId: string): Promise<boolean> {
    const now = new Date().toISOString();
    if (supabase) {
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
    const index = state.logs.findIndex(l => l.employee_id === employeeId && !l.check_out_time);
    if (index !== -1) {
      state.logs[index].check_out_time = now;
      setStored('attendance_logs', state.logs);
      return true;
    }
    return false;
  },

  // --- LEAVE REQUESTS ---
  async getLeaveRequests(orgId?: string): Promise<LeaveRequest[]> {
    const filterOrgId = orgId || 'default';
    if (supabase) {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('leave_requests')
          .select(`
            *,
            employees:employee_id (
              full_name_kh,
              full_name_en,
              org_id
            )
          `)
          .eq('org_id', filterOrgId)
          .range(from, to)
          .order('created_at', { ascending: false });
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        }
      }
      return allData.map((item: any) => ({
        ...item,
        employee_name: item.employees?.full_name_kh || item.employees?.full_name_en,
        org_id: item.employees?.org_id || item.org_id
      }));
    }

    const { leaves, employees } = getDbState();
    const joined = leaves.map(l => {
      const emp = employees.find(e => e.id === l.employee_id);
      return {
        ...l,
        employee_name: emp ? `${emp.full_name_kh} (${emp.full_name_en})` : 'Unknown Employee',
        org_id: emp?.org_id || l.org_id || 'default'
      };
    });
    return joined.filter(l => (l.org_id || 'default') === filterOrgId);
  },

  async addLeaveRequest(req: Omit<LeaveRequest, 'id' | 'status'> & { org_id?: string }): Promise<LeaveRequest> {
    const filterOrgId = req.org_id || 'default';
    const newReq: LeaveRequest = {
      ...req,
      id: crypto.randomUUID(),
      org_id: filterOrgId,
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
  async getPayrolls(orgId?: string): Promise<Payroll[]> {
    const filterOrgId = orgId || 'default';
    if (supabase) {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('payrolls')
          .select(`
            *,
            employees:employee_id (
              full_name_kh,
              full_name_en,
              org_id
            )
          `)
          .eq('org_id', filterOrgId)
          .range(from, to)
          .order('billing_month', { ascending: false });
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        }
      }
      return allData.map((item: any) => ({
        ...item,
        employee_name: item.employees?.full_name_kh || item.employees?.full_name_en,
        org_id: item.employees?.org_id || item.org_id
      }));
    }

    const { payrolls, employees } = getDbState();
    const joined = payrolls.map(p => {
      const emp = employees.find(e => e.id === p.employee_id);
      return {
        ...p,
        employee_name: emp ? `${emp.full_name_kh} (${emp.full_name_en})` : 'Unknown Employee',
        org_id: emp?.org_id || p.org_id || 'default'
      };
    });
    return joined.filter(p => (p.org_id || 'default') === filterOrgId);
  },

  async addPayroll(payroll: Omit<Payroll, 'id'> & { org_id?: string }): Promise<Payroll> {
    const filterOrgId = payroll.org_id || 'default';
    const newPayroll: Payroll = {
      ...payroll,
      id: crypto.randomUUID(),
      org_id: filterOrgId
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
  },

  // --- TIMESHEETS ---
  async getTimesheets(orgId?: string): Promise<Timesheet[]> {
    const filterOrgId = orgId || 'default';
    if (supabase) {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('timesheets')
          .select('*')
          .eq('org_id', filterOrgId)
          .range(from, to);
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        }
      }
      return allData as Timesheet[];
    }
    const state = getDbState();
    return state.timesheets.filter(t => (t.org_id || 'default') === filterOrgId);
  },

  async saveTimesheet(timesheet: Omit<Timesheet, 'id'>): Promise<Timesheet> {
    const newTimesheet: Timesheet = {
      ...timesheet,
      id: crypto.randomUUID()
    };
    if (supabase) {
      // Check if existing
      const { data: exist } = await supabase
        .from('timesheets')
        .select('*')
        .eq('employee_id', timesheet.employee_id)
        .eq('date', timesheet.date)
        .maybeSingle();

      if (exist) {
        const { data, error } = await supabase
          .from('timesheets')
          .update({ worked_hours: timesheet.worked_hours, notes: timesheet.notes })
          .eq('id', exist.id)
          .select()
          .single();
        if (!error && data) return data as Timesheet;
      } else {
        const { data, error } = await supabase.from('timesheets').insert([newTimesheet]).select().single();
        if (!error && data) return data as Timesheet;
      }
    }
    const state = getDbState();
    const index = state.timesheets.findIndex(t => t.employee_id === timesheet.employee_id && t.date === timesheet.date);
    if (index !== -1) {
      state.timesheets[index] = { ...state.timesheets[index], worked_hours: timesheet.worked_hours, notes: timesheet.notes };
    } else {
      state.timesheets.push(newTimesheet);
    }
    setStored('timesheets', state.timesheets);
    return newTimesheet;
  },

  // --- WEEKLY SCHEDULES ---
  async getWeeklySchedules(orgId?: string): Promise<WeeklySchedule[]> {
    const filterOrgId = orgId || 'default';
    if (supabase) {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('weekly_schedules')
          .select('*')
          .eq('org_id', filterOrgId)
          .range(from, to);
        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        }
      }
      return allData as WeeklySchedule[];
    }
    const state = getDbState();
    return state.weekly_schedules.filter(w => (w.org_id || 'default') === filterOrgId);
  },

  async saveWeeklySchedule(schedule: Omit<WeeklySchedule, 'id'>): Promise<WeeklySchedule> {
    const newSched: WeeklySchedule = {
      ...schedule,
      id: crypto.randomUUID()
    };
    if (supabase) {
      const { data: exist } = await supabase
        .from('weekly_schedules')
        .select('*')
        .eq('employee_id', schedule.employee_id)
        .maybeSingle();

      if (exist) {
        const { data, error } = await supabase
          .from('weekly_schedules')
          .update({
            monday_hours: schedule.monday_hours,
            tuesday_hours: schedule.tuesday_hours,
            wednesday_hours: schedule.wednesday_hours,
            thursday_hours: schedule.thursday_hours,
            friday_hours: schedule.friday_hours,
            saturday_hours: schedule.saturday_hours,
            sunday_hours: schedule.sunday_hours
          })
          .eq('id', exist.id)
          .select()
          .single();
        if (!error && data) return data as WeeklySchedule;
      } else {
        const { data, error } = await supabase.from('weekly_schedules').insert([newSched]).select().single();
        if (!error && data) return data as WeeklySchedule;
      }
    }
    const state = getDbState();
    const index = state.weekly_schedules.findIndex(w => w.employee_id === schedule.employee_id);
    if (index !== -1) {
      state.weekly_schedules[index] = { ...state.weekly_schedules[index], ...schedule };
    } else {
      state.weekly_schedules.push(newSched);
    }
    setStored('weekly_schedules', state.weekly_schedules);
    return newSched;
  },

  // --- FACE ENROLLMENT ---
  async addFaceEnrollment(enrollment: Omit<FaceEnrollment, 'id'>): Promise<FaceEnrollment> {
    const newEnrollment: FaceEnrollment = {
      ...enrollment,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from('face_enrollments').insert([newEnrollment]).select().single();
      if (!error && data) return data as FaceEnrollment;
    }
    const state = getDbState();
    state.face_enrollments = state.face_enrollments.filter(e => e.employee_id !== enrollment.employee_id);
    state.face_enrollments.push(newEnrollment);
    setStored('face_enrollments', state.face_enrollments);
    return newEnrollment;
  },

  async getFaceEnrollments(): Promise<FaceEnrollment[]> {
    if (supabase) {
      const { data, error } = await supabase.from('face_enrollments').select('*');
      if (!error && data) return data as FaceEnrollment[];
    }
    return getDbState().face_enrollments;
  },

  // --- TELEGRAM PAYSLIPS ---
  async sendTelegramPayslip(employee: Employee, text: string): Promise<boolean> {
    const chat = employee.telegram_id;
    if (!chat) return false;
    try {
      await sendTelegramMessage(chat, text);
      return true;
    } catch {
      return false;
    }
  }
};

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Telegram API error: status ${res.status}, response: ${errText}`);
    }
  } catch (err) {
    console.error('Error sending Telegram message:', err);
  }
}

export async function sendTelegramCheckInAlert(employee: Employee, log: AttendanceLog) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const adminGroupId = process.env.TELEGRAM_ADMIN_GROUP_ID;
  const empTelegramId = employee.telegram_id;

  const timeStr = new Date(log.check_in_time).toLocaleTimeString('kh-KH', { hour: '2-digit', minute: '2-digit' });

  // 1. Admin Group Notification Text
  const adminMessage = 
    `🔔 *របាយការណ៍វត្តមានថ្មី (New Attendance Log)* 🔔\n\n` +
    `👤 *បុគ្គលិក:* ${employee.full_name_kh} [${employee.full_name_en}]\n` +
    `🔑 *អត្តលេខ (ID):* ${employee.employee_code || 'N/A'}\n` +
    `🏢 *ផ្នែក (Dept):* ${employee.department || 'General'}\n` +
    `⏰ *ម៉ោងចូល:* ${timeStr}\n` +
    `📍 *Geofence:* ${log.geofence_ok ? '✅ ✅ ត្រឹមត្រូវ (OK)' : '⚠️ មិនត្រឹមត្រូវ (FAIL)'}\n` +
    `⚡ *វិធីសាស្ត្រ:* ${log.method}\n` +
    `📝 *កំណត់សម្គាល់:* ${log.notes || 'N/A'}`;

  // Send to Admin Group if configured
  if (adminGroupId) {
    await sendTelegramMessage(adminGroupId, adminMessage);
  } else {
    console.log('TELEGRAM_ADMIN_GROUP_ID is not configured, skipping admin alert.');
  }

  // 2. Private Employee DM Notification Text
  if (empTelegramId) {
    const employeeMessage = 
      `✅ *ការចុះវត្តមានរបស់អ្នកត្រូវបានកត់ត្រាជោគជ័យ!* \n\n` +
      `⏰ *ម៉ោងចូល Check-in:* ${timeStr}\n` +
      `⚡ *វិធីសាស្ត្រ Method:* ${log.method}\n` +
      `📍 *Geofence:* ${log.geofence_ok ? '✅ ត្រឹមត្រូវ' : '⚠️ ក្រៅតំបន់ស្កែន'}\n\n` +
      `សូមអរគុណ និងសូមបំពេញការងារដោយរីករាយ! 🙏`;

    await sendTelegramMessage(empTelegramId, employeeMessage);
  } else {
    console.log(`Employee ${employee.full_name_en} does not have telegram_id linked, skipping private DM.`);
  }
}
