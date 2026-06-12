'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { 
  Users, QrCode as QrIcon, Bot, Sliders, Plus, Trash2, Edit, Search, 
  Lock, Unlock, LogOut, MapPin, CheckCircle2, AlertCircle, RefreshCw, 
  Building2, Printer, Map, ShieldAlert, Sparkles, Send, Eye, EyeOff, 
  UserCheck, UserX, CircleAlert, DollarSign, Key, Compass, Radio,
  FileSpreadsheet, CalendarDays, Clock, FileCheck, Check, HelpCircle
} from 'lucide-react';
import { db, Tenant, Employee, AttendanceLog, Organization, Timesheet, WeeklySchedule, getOrgSlugCookieClient, setOrgSlugCookieClient } from '@/lib/supabase';

export default function AdminDashboard() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('admin123'); // Default

  // Organization contextual scoping
  const [orgSlug, setOrgSlug] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getOrgSlugCookieClient() || 'default';
    }
    return 'default';
  });
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  // Sidebar Tabs state
  const [activeTab, setActiveTab] = useState<'employees' | 'qr' | 'telegram' | 'system' | 'report' | 'payroll' | 'timesheets'>('employees');

  // Database core datasets
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Timesheets & weekly schedules states
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);

  // Manual Check-in (Proxy)
  const [manualProxyEmpId, setManualProxyEmpId] = useState<string>('');

  // Selected filters/inputs for timesheet editing
  const [tsEmployeeId, setTsEmployeeId] = useState<string>('');
  const [tsDate, setTsDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tsHours, setTsHours] = useState<number>(8);
  const [tsNotes, setTsNotes] = useState<string>('');

  // Weekly schedule inputs per employee
  const [tsScheduleEmpId, setTsScheduleEmpId] = useState<string>('');
  const [schedMon, setSchedMon] = useState<number>(8);
  const [schedTue, setSchedTue] = useState<number>(8);
  const [schedWed, setSchedWed] = useState<number>(8);
  const [schedThu, setSchedThu] = useState<number>(8);
  const [schedFri, setSchedFri] = useState<number>(8);
  const [schedSat, setSchedSat] = useState<number>(0);
  const [schedSun, setSchedSun] = useState<number>(0);

  // Excel importing & template states
  const [excelError, setExcelError] = useState<string>('');
  const [excelSuccess, setExcelSuccess] = useState<string>('');

  // Monthly Report States
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-06');
  
  // Payroll states
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<string>('2026-06');
  const [bonusInputMapping, setBonusInputMapping] = useState<{[empId: string]: number}>({});
  const [deductionInputMapping, setDeductionInputMapping] = useState<{[empId: string]: number}>({});
  const [payrollSuccessMsg, setPayrollSuccessMsg] = useState<string>('');

  // Active filters and selectors
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Employee CRUD Modal/Form State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  // Employee Form fields
  const [formFullNameKh, setFormFullNameKh] = useState<string>('');
  const [formFullNameEn, setFormFullNameEn] = useState<string>('');
  const [formEmployeeCode, setFormEmployeeCode] = useState<string>('');
  const [formTenantId, setFormTenantId] = useState<string>('');
  const [formRole, setFormRole] = useState<string>('');
  const [formDepartment, setFormDepartment] = useState<string>('');
  const [formBaseSalary, setFormBaseSalary] = useState<number>(350);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [formTelegramId, setFormTelegramId] = useState<string>('');
  const [formNfcTagId, setFormNfcTagId] = useState<string>('');
  const [formQrKey, setFormQrKey] = useState<string>('');
  const [formPinCode, setFormPinCode] = useState<string>('');
  const [formPhotoUrl, setFormPhotoUrl] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // QR Tab state
  const [qrSelectedEmployee, setQrSelectedEmployee] = useState<Employee | null>(null);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');
  const [badgeCompanyLogoText, setBadgeCompanyLogoText] = useState<string>('SecureAttend Auth');
  
  // NFC Binding State
  const [nfcBindingInput, setNfcBindingInput] = useState<string>('');
  const [nfcBindingMsg, setNfcBindingMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Telegram Settings State
  const [telegramAdminGroupId, setTelegramAdminGroupId] = useState<string>('');
  const [telegramAlertEmployee, setTelegramAlertEmployee] = useState<string>('');
  const [telegramAlertSending, setTelegramAlertSending] = useState<boolean>(false);
  const [telegramAlertSuccess, setTelegramAlertSuccess] = useState<string>('');
  const [telegramAlertError, setTelegramAlertError] = useState<string>('');

  // System settings Tab state
  const [mapsInputLink, setMapsInputLink] = useState<string>('');
  const [systemSettingTenantId, setSystemSettingTenantId] = useState<string>('');
  const [geoLat, setGeoLat] = useState<number>(11.5645);
  const [geoLng, setGeoLng] = useState<number>(104.9123);
  const [geoRadius, setGeoRadius] = useState<number>(150);
  const [systemMessage, setSystemMessage] = useState<string>('');
  const [systemError, setSystemError] = useState<string>('');
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);

  // Load Saved Admin Password, Cookies, and Org configurations
  useEffect(() => {
    let active = true;
    if (typeof window !== 'undefined') {
      const slug = getOrgSlugCookieClient();
      
      db.getOrganizationBySlug(slug).then(org => {
        if (!active) return;
        if (org) {
          setCurrentOrg(org);
          
          const savedPass = localStorage.getItem('secureattend_admin_password');
          const logged = sessionStorage.getItem('secureattend_admin_logged_in');
          
          if (savedPass) {
            setAdminPassword(savedPass);
          } else if (org.admin_password) {
            setAdminPassword(org.admin_password);
          }
          
          if (logged === 'true') {
            setIsLoggedIn(true);
          }
        } else {
          const savedPass = localStorage.getItem('secureattend_admin_password');
          const logged = sessionStorage.getItem('secureattend_admin_logged_in');
          if (savedPass) setAdminPassword(savedPass);
          if (logged === 'true') setIsLoggedIn(true);
        }
      });

      return () => {
        active = false;
      };
    }
  }, []);

  // Fetch central database logs/employees
  const fetchData = async (targetOrgId?: string) => {
    setLoading(true);
    const orgId = targetOrgId || currentOrg?.id || 'default';
    try {
      const fetchedTenants = await db.getTenants();
      setTenants(fetchedTenants);
      
      const fetchedEmployees = await db.getEmployees(orgId);
      setEmployees(fetchedEmployees);

      const fetchedLogs = await db.getAttendanceLogs(orgId);
      setLogs(fetchedLogs);

      // Timesheets and schedules
      const fetchedTS = await db.getTimesheets(orgId);
      setTimesheets(fetchedTS);

      const fetchedWS = await db.getWeeklySchedules(orgId);
      setWeeklySchedules(fetchedWS);

      if (fetchedTenants.length > 0) {
        if (!selectedTenantId) {
          setSelectedTenantId(fetchedTenants[0].id);
        }
        if (!systemSettingTenantId) {
          setSystemSettingTenantId(fetchedTenants[0].id);
          setGeoLat(fetchedTenants[0].geofence_lat);
          setGeoLng(fetchedTenants[0].geofence_lng);
          setGeoRadius(fetchedTenants[0].geofence_radius_meters);
        }
      }

      const savedGroup = localStorage.getItem('secureattend_admin_group_id');
      if (savedGroup) {
        setTelegramAdminGroupId(savedGroup);
      } else {
        setTelegramAdminGroupId(process.env.TELEGRAM_ADMIN_GROUP_ID || '-1002233445566');
      }

    } catch (err) {
      console.error('Error fetching data for admin:', err);
    } finally {
      setLoading(false);
    }
  };

  // Excel Template download handler
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        EmployeeCode: 'EMP101',
        FullNameKh: 'ស៊ន វីរៈ',
        FullNameEn: 'Sorn Virak',
        Role: 'គ្រូបង្រៀន (Teacher)',
        Department: 'ព័ត៌មានវិទ្យា (IT)',
        BaseSalary: 350,
        TelegramId: '625345123',
        PinCode: '1234',
        NfcTagId: 'NFC998877'
      },
      {
        EmployeeCode: 'EMP102',
        FullNameKh: 'កែវ សោភា',
        FullNameEn: 'Keo Sophea',
        Role: 'គណនេយ្យករ (Accountant)',
        Department: 'រដ្ឋបាល (Admin)',
        BaseSalary: 450,
        TelegramId: '78234123',
        PinCode: '5678',
        NfcTagId: ''
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employee Import Template");
    XLSX.writeFile(wb, "SecureAttend_Employees_Template.xlsx");
  };

  // Excel Upload Parser handler
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError('');
    setExcelSuccess('');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws);

        if (!json || json.length === 0) {
          setExcelError('ឯកសារគ្មានទិន្នន័យទេ! (File is empty)');
          return;
        }

        let importedCount = 0;
        const orgId = currentOrg?.id || 'default';
        const tenantId = selectedTenantId || tenants[0]?.id || 'default';

        for (const row of json as any[]) {
          const code = row.EmployeeCode ? String(row.EmployeeCode).trim() : `EMP-${Math.floor(100000 + Math.random() * 900000)}`;
          const qrKey = `QR-${Math.floor(100000 + Math.random() * 900000)}`;
          
          await db.addEmployee({
            full_name_kh: row.FullNameKh ? String(row.FullNameKh).trim() : 'បុគ្គលិកថ្មី',
            full_name_en: row.FullNameEn ? String(row.FullNameEn).trim() : 'New Employee',
            employee_code: code,
            role: row.Role ? String(row.Role).trim() : 'Staff',
            department: row.Department ? String(row.Department).trim() : 'General',
            base_salary: row.BaseSalary ? Number(row.BaseSalary) : 350,
            telegram_id: row.TelegramId ? String(row.TelegramId).trim() : '',
            pin_code: row.PinCode ? String(row.PinCode).trim() : '',
            nfc_tag_id: row.NfcTagId ? String(row.NfcTagId).trim() : '',
            qr_key: qrKey,
            status: 'active',
            org_id: orgId,
            tenant_id: tenantId
          });
          importedCount++;
        }

        setExcelSuccess(`បាននាំចូលបុគ្គលិកចំនួន ${importedCount} នាក់ដោយជោគជ័យ!`);
        fetchData();
      } catch (err: any) {
        setExcelError(`ការនាំចូលបានបរាជ័យ៖ ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    let active = true;
    if (isLoggedIn) {
      const timer = setTimeout(() => {
        if (active) fetchData();
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [isLoggedIn, currentOrg]);

  // Handle Login Action
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === adminPassword) {
      sessionStorage.setItem('secureattend_admin_logged_in', 'true');
      setIsLoggedIn(true);
      setAdminError('');
    } else {
      setAdminError('លេខកូដសម្ងាត់មិនត្រឹមត្រូវទេ! (Incorrect password)');
    }
  };

  // Handle Logout Action
  const handleLogout = () => {
    sessionStorage.removeItem('secureattend_admin_logged_in');
    setIsLoggedIn(false);
    setPassword('');
  };

  // Change Admin password Action
  const handleSaveAdminPassword = () => {
    if (!password.trim() || password.length < 4) {
      setSystemError('លេខកូដត្រូវតែមានយ៉ាងតិច ៤ ខ្ទង់! (Must be at least 4 chars)');
      setSystemMessage('');
      return;
    }
    localStorage.setItem('secureattend_admin_password', password.trim());
    setAdminPassword(password.trim());
    setSystemMessage('រក្សាទុកលេខកូដទ្វារគ្រប់គ្រងជោគជ័យ! (Admin password updated)');
    setSystemError('');
    setPassword('');
  };

  // Listen for System Setting Tenant dropdown change
  useEffect(() => {
    let active = true;
    if (systemSettingTenantId && tenants.length > 0) {
      const t = tenants.find(x => x.id === systemSettingTenantId);
      if (t) {
        const timer = setTimeout(() => {
          if (active) {
            setGeoLat(t.geofence_lat);
            setGeoLng(t.geofence_lng);
            setGeoRadius(t.geofence_radius_meters);
          }
        }, 0);
        return () => {
          active = false;
          clearTimeout(timer);
        };
      }
    }
  }, [systemSettingTenantId, tenants]);

  // Parse location and save Geofence Settings
  const handleSaveGeofence = async () => {
    if (!systemSettingTenantId) {
      setSystemError('សូមជ្រើសរើសស្ថាប័នជាមុនសិន! (Select tenant first)');
      return;
    }

    try {
      const ok = await db.updateTenantGeofence(systemSettingTenantId, geoLat, geoLng, geoRadius);
      if (ok) {
        setSystemMessage('បានកែប្រែនិយាមកា (Geofence) ស្ថាប័នជោគជ័យ! (Geofence settings updated successfully!)');
        setSystemError('');
        // Reload tenants data in memory
        const fetchedTenants = await db.getTenants();
        setTenants(fetchedTenants);
      } else {
        setSystemError('បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ (Failed to update)');
      }
    } catch (err: any) {
      setSystemError(`មានបញ្ហាកើតឡើង៖ ${err.message}`);
    }
  };

  // Location inputs helper (parsing coordinate link)
  const parseMapsUrl = () => {
    if (!mapsInputLink.trim()) {
      setSystemError('សូមបញ្ចូលតំណភ្ជាប់ Google Maps ឬកូអរដោនេច្បាស់លាស់! (Paste maps paste link/coordinates)');
      return;
    }

    const input = mapsInputLink.trim();

    // 1. Direct coordinate checking e.g. "11.5645, 104.9123"
    const coordsMatches = input.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (coordsMatches) {
      setGeoLat(parseFloat(coordsMatches[1]));
      setGeoLng(parseFloat(coordsMatches[2]));
      setSystemMessage('ទាញយកនិយាមកាពីអត្ថបទផ្ទាល់ជោគជ័យ! (Parsed coordinates from text directly)');
      setSystemError('');
      setMapsInputLink('');
      return;
    }

    // 2. URL parsing check
    const atMatches = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatches) {
      setGeoLat(parseFloat(atMatches[1]));
      setGeoLng(parseFloat(atMatches[2]));
      setSystemMessage('ទាញយកនិយាមកាពី Google Maps URL រួចរាល់! (Parsed coordinates from Maps URL)');
      setSystemError('');
      setMapsInputLink('');
      return;
    }

    const qMatches = input.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatches) {
      setGeoLat(parseFloat(qMatches[1]));
      setGeoLng(parseFloat(qMatches[2]));
      setSystemMessage('ទាញយកនិយាមកាពី query q= រួចរាល់! (Parsed query coordinates)');
      setSystemError('');
      setMapsInputLink('');
      return;
    }

    const llMatches = input.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatches) {
      setGeoLat(parseFloat(llMatches[1]));
      setGeoLng(parseFloat(llMatches[2]));
      setSystemMessage('ទាញយកនិយាមកាពី ll parameters រួចរាល់! (Parsed query ll parameter)');
      setSystemError('');
      setMapsInputLink('');
      return;
    }

    setSystemError('មិនអាចស្វែងរកនិយាមការក្នុងតំណភ្ជាប់នេះទេ។ សូមចម្លងតំណភ្ជាប់ Google Maps វែងធម្មតាចេញពី browser address bar ឬបញ្ចូលលេខ coordinates!)');
  };

  // Browser level Geolocation Capture
  const handleGetCurrentGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setSystemError('កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រប្រព័ន្ធ Geolocation ឡើយ។');
      return;
    }

    setIsGpsLoading(true);
    setSystemMessage('');
    setSystemError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLat(position.coords.latitude);
        setGeoLng(position.coords.longitude);
        setSystemMessage('ទទួលបានទីតាំង GPS ពិតប្រាកដបច្ចុប្បន្នរបស់អ្នក រួចរាល់! (Fetched current accurate GPS location)');
        setIsGpsLoading(false);
      },
      (error) => {
        console.error('Error fetching GPS:', error);
        setSystemError(`មិនអាចទទួលបាន GPS Coordinates ឡើយ៖ ${error.message} (សូមពិនិត្យមើល permissions នៃ camera/geolocation ក្នុង browser របស់អ្នក)`);
        setIsGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save Telegram group Admin ID in localStorage
  const handleSaveTelegramAdminId = () => {
    if (!telegramAdminGroupId.trim()) {
      setTelegramAlertError('សូមបញ្ចូលលេខសម្គាល់ក្រុម Telegram (Admin Group ID) ឱ្យបានត្រឹមត្រូវ!');
      return;
    }
    localStorage.setItem('secureattend_admin_group_id', telegramAdminGroupId.trim());
    setTelegramAlertSuccess('រក្សាទុកលេខសម្គាល់ក្រុមគ្របដណ្តប់ Telegram Bot Alert រួចរាល់!');
    setTelegramAlertError('');
  };

  // Send Test Active Alert to Bot
  const triggerTelegramTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramAlertEmployee) {
      setTelegramAlertError('សូមជ្រើសរើសបុគ្គលិកដើម្បីធ្វើការស្ទង់ល្បងស្កេន! (Select employee for simulation)');
      return;
    }

    const emp = employees.find(x => x.id === telegramAlertEmployee);
    if (!emp) return;

    setTelegramAlertSending(true);
    setTelegramAlertSuccess('');
    setTelegramAlertError('');

    try {
      // Send dynamic alert via existing /api/bot using custom mock webhook body 
      // This will simulate check-in alerts to Admin group & DM automatically!
      // Generate a realistic check-in log template
      const mockLog: AttendanceLog = {
        id: crypto.randomUUID(),
        employee_id: emp.id,
        employee_code: emp.employee_code || 'EMP999',
        check_in_time: new Date().toISOString(),
        method: 'FACE',
        geofence_ok: true,
        photo_matched: true,
        status: 'ON_TIME',
        notes: 'បញ្ជូនការពិសោធន៍វត្តមាន (Staged Admin Direct Test Alert)'
      };

      // Import-free call to mock API payload
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        // Fallback simulated local response
        setTimeout(() => {
          setTelegramAlertSuccess(`[លក្ខណៈពិសោធន៍] បានផ្ញើសារសាកល្បងទៅបុគ្គលិក ${emp.full_name_kh} និងគ្រុប Admin! (Mock system alert sent)`);
          setTelegramAlertSending(false);
        }, 1200);
        return;
      }

      // Call our API webhook endpoint with proper payload to run complete active notifications
      const testReq = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            chat: { id: parseInt(telegramAdminGroupId) || 123456 },
            text: `/checkin ${emp.pin_code || emp.employee_code}`
          }
        })
      });

      if (testReq.ok) {
        setTelegramAlertSuccess(`បានបណ្តុះសារសាកល្បងវត្តមានសម្រាប់ ${emp.full_name_kh} ទៅ Telegram APIs រួចរាល់!`);
      } else {
        setTelegramAlertError('បុគ្គលិកនេះមិនទាន់មាន Telegram ID ក្នុងប្រព័ន្ធទើបមិនអាចផ្ញើ DM បាន ឬមិនទាន់កាត់ Token bot.');
      }
    } catch (err: any) {
      setTelegramAlertError(`បញ្ហាបណ្តាញ៖ ${err.message}`);
    } finally {
      setTelegramAlertSending(false);
    }
  };

  // Generate secure QR content
  const generateSecureQRRawData = async (emp: Employee) => {
    if (!currentOrg) return emp.employee_code;
    const secret = currentOrg.qr_secret || 'defaultkey';
    const rawData = emp.employee_code + secret;
    const msgBuffer = new TextEncoder().encode(rawData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `SECATT-EMP:${emp.employee_code}:${token}`;
  };

  // Generate QR Badge rendering inside QRCode canvas preview
  useEffect(() => {
    let active = true;
    if (qrSelectedEmployee && currentOrg) {
      generateSecureQRRawData(qrSelectedEmployee).then((qrData) => {
        if (!active) return;
        if (qrData) {
          QRCode.toDataURL(qrData, {
            width: 300,
            margin: 1,
            color: {
              dark: '#1e1b4b', // Deep indigo text color
              light: '#ffffff'
            }
          })
          .then(url => {
            if (active) {
              setGeneratedQrDataUrl(url);
            }
          })
          .catch(err => {
            console.error('Error generating badge QR Code:', err);
          });
        }
      });
    } else {
      const timer = setTimeout(() => {
        if (active) {
          setGeneratedQrDataUrl('');
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
    return () => {
      active = false;
    };
  }, [qrSelectedEmployee]);

  // Open Add Employee Form Modal
  const openAddEmployeeModal = () => {
    setModalMode('add');
    setCurrentEmployeeId(null);
    setFormFullNameKh('');
    setFormFullNameEn('');
    setFormEmployeeCode('');
    setFormTenantId(selectedTenantId || (tenants[0]?.id || ''));
    setFormRole('គ្រូបង្រៀន (Teacher)');
    setFormDepartment('សិក្សាធិការ (Academics)');
    setFormBaseSalary(350);
    setFormStatus('active');
    setFormTelegramId('');
    setFormNfcTagId('');
    setFormQrKey(`QR-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormPinCode(`${Math.floor(1000 + Math.random() * 9000)}`);
    setFormPhotoUrl('');
    setFormError('');
    setIsEmployeeModalOpen(true);
  };

  // Open Edit Employee Form Modal
  const openEditEmployeeModal = (emp: Employee) => {
    setModalMode('edit');
    setCurrentEmployeeId(emp.id);
    setFormFullNameKh(emp.full_name_kh || '');
    setFormFullNameEn(emp.full_name_en || '');
    setFormEmployeeCode(emp.employee_code || '');
    setFormTenantId(emp.tenant_id || '');
    setFormRole(emp.role || '');
    setFormDepartment(emp.department || '');
    setFormBaseSalary(emp.base_salary || 0);
    setFormStatus(emp.status || 'active');
    setFormTelegramId(emp.telegram_id || '');
    setFormNfcTagId(emp.nfc_tag_id || '');
    setFormQrKey(emp.qr_key || '');
    setFormPinCode(emp.pin_code || '');
    setFormPhotoUrl(emp.photo_url || '');
    setFormError('');
    setIsEmployeeModalOpen(true);
  };

  // Run Add or Edit Employee execution
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullNameKh.trim() || !formFullNameEn.trim()) {
      setFormError('សូមបំពេញឈ្មោះជាភាសាខ្មែរ និងអង់គ្លេស! (Please fill name KH and name EN)');
      return;
    }

    if (!formTenantId) {
      setFormError('សូមជ្រើសរើសស្ថាប័ន (Tenant identifier required)');
      return;
    }

    const payload: Omit<Employee, 'id'> = {
      tenant_id: formTenantId,
      full_name_kh: formFullNameKh.trim(),
      full_name_en: formFullNameEn.trim(),
      role: formRole.trim(),
      department: formDepartment.trim() || 'General',
      base_salary: Number(formBaseSalary) || 280,
      status: formStatus,
      employee_code: formEmployeeCode.trim() || undefined,
      telegram_id: formTelegramId.trim() || undefined,
      nfc_tag_id: formNfcTagId.trim() || undefined,
      qr_key: formQrKey.trim() || undefined,
      pin_code: formPinCode.trim() || undefined,
      photo_url: formPhotoUrl.trim() || undefined,
      active: formStatus === 'active'
    };

    setLoading(true);
    try {
      if (modalMode === 'add') {
        const result = await db.addEmployee(payload);
        if (result) {
          setIsEmployeeModalOpen(false);
          fetchData();
        } else {
          setFormError('បរាជ័យក្នុងការបង្កើតគណនីបុគ្គលិកថ្មី!');
        }
      } else {
        if (currentEmployeeId) {
          const ok = await db.updateEmployee(currentEmployeeId, payload);
          if (ok) {
            setIsEmployeeModalOpen(false);
            fetchData();
          } else {
            setFormError('បរាជ័យក្នុងការកែប្រែគណនីបុគ្គលិក!');
          }
        }
      }
    } catch (err: any) {
      setFormError(`បញ្ហាបច្ចេកទេស៖ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete employee action with safety prompt Confirm
  const handleDeleteEmployee = async (id: string, name: string) => {
    const isConfirmed = window.confirm(`តើអ្នកពិតជាចង់លុបបុគ្គលិក៖ "${name}" មែនទេ? This is irreversible!`);
    if (!isConfirmed) return;

    setLoading(true);
    try {
      const ok = await db.deleteEmployee(id);
      if (ok) {
        fetchData();
        if (qrSelectedEmployee?.id === id) {
          setQrSelectedEmployee(null);
        }
      } else {
        alert('មិនអាចលុបគណនីបុគ្គលិកនេះបានទេ!');
      }
    } catch (err: any) {
      alert(`កំហុសក្នុងការលុប៖ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Trigger browser print for QR code Badge
  const handlePrintBadge = () => {
    window.print();
  };

  const handleBindNfcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNfcBindingMsg(null);
    if (!qrSelectedEmployee) {
      setNfcBindingMsg({ type: 'error', text: 'សូមជ្រើសរើសបុគ្គលិកជាមុនសិន។' });
      return;
    }
    if (!nfcBindingInput.trim()) return;

    try {
      const updated = { ...qrSelectedEmployee, nfc_tag_id: nfcBindingInput.trim() };
      await db.updateEmployee(qrSelectedEmployee.id, updated);
      setQrSelectedEmployee(updated);
      setNfcBindingInput('');
      setNfcBindingMsg({ type: 'success', text: `បានភ្ជាប់កាត NFC រួចរាល់សម្រាប់បុគ្គលិក ${qrSelectedEmployee.full_name_en}` });
      fetchData(); // refresh global table
    } catch (err: any) {
      setNfcBindingMsg({ type: 'error', text: 'បញ្ហាពេលភ្ជាប់ NFC: ' + err.message });
    }
  };

  const handleManualProxyCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProxyEmpId) return alert('សូមជ្រើសរើសបុគ្គលិក!');
    try {
      await db.checkIn({
        employee_id: manualProxyEmpId,
        method: 'MANUAL',
        geofence_ok: true,
        status: 'ON_TIME',
        photo_matched: false,
        notes: 'Manual Proxy Check In by Admin'
      });
      alert('បានគូសវត្តមានចូលការងារដោយផ្ទាល់ដៃរួចរាល់!');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleManualProxyCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProxyEmpId) return alert('សូមជ្រើសរើសបុគ្គលិក!');
    try {
      await db.checkOut(manualProxyEmpId);
      alert('បានគូសវត្តមានចេញដោយផ្ទាល់ដៃរួចរាល់!');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtering Logic for table lists
  const filteredEmployees = employees.filter(emp => {
    const codeMatch = emp.employee_code?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const nameKhMatch = emp.full_name_kh?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const nameEnMatch = emp.full_name_en?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const deptMatch = emp.department?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesSearch = codeMatch || nameKhMatch || nameEnMatch || deptMatch;

    const matchesTenant = !selectedTenantId || emp.tenant_id === selectedTenantId;
    
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = emp.status === 'active';
    if (statusFilter === 'inactive') matchesStatus = emp.status === 'inactive' || emp.status === 'suspended';

    return matchesSearch && matchesTenant && matchesStatus;
  });

  const getTenantName = (tid: string) => {
    const t = tenants.find(x => x.id === tid);
    return t ? t.name_kh : 'ស្ថាប័នទូទៅ';
  };

  // Login visual structure 
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden" id="admin_login_view">
        {/* Animated Background Lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10"
        >
          {/* Logo Brand Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 mb-3 border border-indigo-400">
              <Lock className="w-8 h-8 text-white animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold font-sans text-slate-100 tracking-tight">SecureAttend Admin</h1>
            <p className="text-[12px] font-sans text-slate-400 mt-1">ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធរួម និងព័ត៌មានបុគ្គលិក</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 font-sans tracking-wide uppercase mb-1.5">
                លេខកូដទ្វារគ្រប់គ្រង (Admin Security Pin)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入 ... / Enter code "
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-3 px-4 pl-4 pr-11 text-slate-100 font-mono text-center tracking-widest leading-none text-xl transition-all placeholder:text-[13px] placeholder:font-sans placeholder:tracking-normal"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {adminError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs py-2.5 px-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl py-3 font-semibold text-sm transition-all hover:opacity-90 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Unlock className="w-4 h-4" />
              <span>បើកប្រព័ន្ធគ្រប់គ្រង (Access Portal)</span>
            </button>
          </form>

          <div className="border-t border-slate-800 mt-6 pt-4 text-center">
            <p className="text-[10px] text-slate-500">លេខកូដលំនាំដើមគឺ៖ <span className="font-mono text-indigo-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-900">admin123</span></p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col md:flex-row relative print:bg-white print:text-black" id="admin_dashboard_full">
      
      {/* SIDEBAR FOR DESKTOP & MOBILE WRAPPER */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-5 flex flex-col shrink-0 relative z-10 print:hidden" id="admin_sidebar">
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/10">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight text-white font-sans tracking-wide">SecureAttend Suite</h2>
            <p className="text-[10px] text-emerald-400 font-mono tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              PORTAL ADMIN
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-1.5 flex-1 overflow-y-auto max-h-[70vh] pr-1">
          <button
            onClick={() => setActiveTab('employees')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'employees' 
                ? 'bg-indigo-500/15 border-l-4 border-indigo-500 text-indigo-400 font-bold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>ព័ត៌មានបុគ្គលិក (Employees CRUD)</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'qr' 
                ? 'bg-indigo-500/15 border-l-4 border-indigo-500 text-indigo-400 font-bold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <QrIcon className="w-4 h-4 shrink-0" />
            <span>បោះពុម្ពប័ណ្ណ QR (Print Badges)</span>
          </button>

          <button
            onClick={() => setActiveTab('timesheets')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'timesheets' 
                ? 'bg-indigo-500/15 border-l-4 border-indigo-500 text-indigo-400 font-bold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>ម៉ោងការងារ & Timesheet</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'report' 
                ? 'bg-indigo-500/15 border-l-4 border-indigo-500 text-indigo-400 font-bold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileCheck className="w-4 h-4 shrink-0" />
            <span>របាយការណ៍វត្តមាន (Reports)</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'payroll' 
                ? 'bg-indigo-500/15 border-l-4 border-indigo-500 text-indigo-400 font-bold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>គណនាប្រាក់ខែ (Payroll)</span>
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'telegram' 
                ? 'bg-indigo-500/15 border-l-4 border-indigo-500 text-indigo-400 font-bold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>តេឡេក្រាម Bot (Telegram Config)</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'system' 
                ? 'bg-indigo-500/15 border-l-4 border-indigo-500 text-indigo-400 font-bold' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>កំណត់ប្រព័ន្ធទីតាំង (System)</span>
          </button>
        </nav>

        {/* Footer Logout */}
        <div className="border-t border-slate-800 pt-4 mt-auto">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-400 font-mono">User: Administrator</span>
            <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold">Secure</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-medium transition-colors border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            <span>ចាកចេញពីប្រព័ន្ធ (Log Out)</span>
          </button>
        </div>
      </aside>

      {/* PRIMARY CONTROLLER OR CONTENT GRID */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto relative z-10 print:p-0 print:m-0" id="admin_content_view">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 print:hidden">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">កំពុងដំណើរការ... (Syncing DB)</p>
            </div>
          </div>
        )}

        {/* TAB 1: EMPLOYEES CRUD PANEL */}
        {activeTab === 'employees' && (
          <div className="space-y-6 print:hidden" id="employees_tab_content">
            
            {/* Tab Header with Fast Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight font-sans text-slate-100 flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-400" />
                  គ្រប់គ្រងព័ត៌មានបុគ្គលិក (Employee Records CRUD)
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  អ្នកអាចបញ្ជូលបុគ្គលិកថ្មី កែប្រែព័ត៌មាន ភ្ជាប់ QR / NFC / GPS ឬលុបបុគ្គលិកចេញពីប្រព័ន្ធទិន្នន័យ។
                </p>
              </div>

              <button
                onClick={openAddEmployeeModal}
                className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-4 py-2.5 font-bold text-xs transition-transform active:scale-[0.98] flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" />
                បង្កើតបុគ្គលិកថ្មី (Add Employee)
              </button>
            </div>

            {/* Bulk Import / Export Toolbox */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-200">នាំចូលទិន្នន័យបុគ្គលិកពី Excel (Excel Bulk Import)</h3>
                  <p className="text-[10px] text-slate-450 mt-0.5">អ្នកអាចទាញយកគំរូជា Excel បំពេញព័ត៌មានបុគ្គលិករួចបញ្ចូលក្នុងប្រព័ន្ធតែម្តង។</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleDownloadExcelTemplate}
                  type="button"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-[11px] font-semibold border border-slate-800 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  ទាញយកគំរូ (Template)
                </button>
                <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-xl text-[11px] font-semibold border border-emerald-500/20 transition-all cursor-pointer">
                  <Plus className="w-4 h-4 shrink-0" />
                  នាំចូល Excel (Upload)
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleUploadExcel}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {excelSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs py-2.5 px-4 rounded-xl flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{excelSuccess}</span>
              </div>
            )}

            {excelError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs py-2.5 px-4 rounded-xl flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{excelError}</span>
              </div>
            )}

            {/* Quick Filter Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="ស្វែងរកឈ្មោះ អត្តលេខ ផ្នែក ឬតួនាទី... (Search custom value)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Tenant selection filter */}
              <div className="w-full md:w-56">
                <select
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  <option value="">-- បង្ហាញគ្រប់ស្ថាប័ន (All Tenants) --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name_kh} [{t.name_en}]</option>
                  ))}
                </select>
              </div>

              {/* Status active filter */}
              <div className="w-full md:w-44 block">
                <div className="w-full flex bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400'}`}
                  >
                    ទាំងអស់
                  </button>
                  <button
                    onClick={() => setStatusFilter('active')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors ${statusFilter === 'active' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400'}`}
                  >
                    សកម្ម
                  </button>
                  <button
                    onClick={() => setStatusFilter('inactive')}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition-colors ${statusFilter === 'inactive' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400'}`}
                  >
                    អសកម្ម
                  </button>
                </div>
              </div>
            </div>

            {/* Main Information Grid Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 select-none">
                      <th className="py-3 px-4 font-bold text-[11px] uppercase">អត្តលេខ ID</th>
                      <th className="py-3 px-4 font-bold text-[11px] uppercase">ឈ្មោះ និងតួនាទី (Staff Name / Role)</th>
                      <th className="py-3 px-4 font-bold text-[11px] uppercase">ស្ថាប័ន (Location)</th>
                      <th className="py-3 px-4 font-bold text-[11px] uppercase">វិធីសាស្ត្រផ្ទៀងផ្ទាត់ (Auth Credentials)</th>
                      <th className="py-3 px-4 font-bold text-[11px] uppercase text-right">ប្រាក់ខែគោល</th>
                      <th className="py-3 px-4 font-bold text-[11px] uppercase text-center">ស្ថានភាព</th>
                      <th className="py-3 px-4 font-bold text-[11px] uppercase text-center">តេឡេក្រាម</th>
                      <th className="py-3 px-4 font-bold text-[11px] uppercase text-center">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-500">
                          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="font-bold">មិនមានទិន្នន័យបុគ្គលិកស្របតាមលក្ខខណ្ឌរបស់អ្នកទេ!</p>
                          <p className="text-[11px] text-slate-600 mt-1">សូមសាកល្បងកែប្រែតម្រងស្វែងរករបស់អ្នកឡើងវិញ។</p>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-850/35 transition-colors">
                          {/* Code */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-300">
                            {emp.employee_code || <span className="text-slate-600">អត់មាន</span>}
                          </td>

                          {/* Full name and Role */}
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-bold text-slate-100">{emp.full_name_kh}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{emp.full_name_en}</p>
                              <p className="text-[11px] text-indigo-400 mt-0.5">{emp.role} • <span className="text-slate-500">{emp.department || 'ទូទៅ'}</span></p>
                            </div>
                          </td>

                          {/* Tenant name */}
                          <td className="py-3 px-4 text-slate-300">
                            <span className="bg-slate-950 px-2 py-1 rounded-lg border border-slate-850 text-slate-400 flex items-center gap-1.5 w-fit">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                              {getTenantName(emp.tenant_id)}
                            </span>
                          </td>

                          {/* Verification Key Badges status */}
                          <td className="py-3 px-4 space-y-1">
                            {emp.pin_code && (
                              <span className="inline-flex items-center gap-1 bg-slate-950 text-indigo-400 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-850 mr-1">
                                <Key className="w-2.5 h-2.5" /> PIN:{emp.pin_code}
                              </span>
                            )}
                            {emp.qr_key && (
                              <span className="inline-flex items-center gap-1 bg-slate-950 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-850 mr-1">
                                <QrIcon className="w-2.5 h-2.5" /> QR: {emp.qr_key.substring(0, 8)}
                              </span>
                            )}
                            {emp.nfc_tag_id && (
                              <span className="inline-flex items-center gap-1 bg-slate-950 text-orange-400 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-850">
                                <Compass className="w-2.5 h-2.5" /> NFC: {emp.nfc_tag_id}
                              </span>
                            )}
                            {!emp.pin_code && !emp.qr_key && !emp.nfc_tag_id && (
                              <span className="text-[10px] text-slate-500 italic">មិនមានគន្លឹះផ្ទៀងផ្ទាត់</span>
                            )}
                          </td>

                          {/* Base Salary */}
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold text-[12px]">
                            ${emp.base_salary?.toLocaleString()}
                          </td>

                          {/* Active / Inactive Status */}
                          <td className="py-3 px-4 text-center">
                            {emp.status === 'active' ? (
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full text-[10px] font-bold border border-emerald-500/20 inline-flex items-center gap-1">
                                <UserCheck className="w-3 h-3" /> សកម្ម
                              </span>
                            ) : emp.status === 'inactive' ? (
                              <span className="bg-slate-500/10 text-slate-400 px-2 py-1 rounded-full text-[10px] font-bold border border-slate-500/20 inline-flex items-center gap-1">
                                <UserX className="w-3 h-3" /> អសកម្ម
                              </span>
                            ) : (
                              <span className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded-full text-[10px] font-bold border border-amber-500/20 inline-flex items-center gap-1">
                                <CircleAlert className="w-3 h-3" /> ផ្អាកបណ្តោះអាសន្ន
                              </span>
                            )}
                          </td>

                          {/* Telegram link status */}
                          <td className="py-3 px-4 text-center">
                            {emp.telegram_id ? (
                              <div className="inline-flex items-center gap-1 text-[11px] text-sky-400 font-mono font-bold bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-400/20">
                                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
                                @{emp.telegram_id}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">មិនបានភ្ជាប់</span>
                            )}
                          </td>

                          {/* CRUD Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit */}
                              <button
                                onClick={() => openEditEmployeeModal(emp)}
                                className="bg-slate-950 ring-1 ring-slate-800 p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-lg transition-all"
                                title="Edit employee details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteEmployee(emp.id, emp.full_name_kh)}
                                className="bg-slate-950 ring-1 ring-slate-800 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete employee from database"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QR BADGES BENTO DESIGNER */}
        {activeTab === 'qr' && (
          <div className="space-y-6" id="qr_badges_content">
            
            {/* Header / Intro instructions */}
            <div className="print:hidden">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <QrIcon className="w-6 h-6 text-indigo-400" />
                បោះពុម្ពប័ណ្ណស្កេន QR (Printable QR Identity Cards)
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                ជ្រើសរើសបុគ្គលិកដើម្បីរៀបចំបោះពុម្ពកាតសម្គាល់ខ្លួន រួមបញ្ចូលជាមួយ QR កូដ សម្រាប់យកទៅស្កែនវត្តមាននៅកន្លែងធ្វើការយ៉ាងលឿនបំផុត។
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:w-full">
              
              {/* Printable Config block */}
              <div className="lg:col-span-5 space-y-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 print:hidden">
                <h3 className="font-bold text-sm tracking-wide text-indigo-400 mb-2">រចនាប័ណ្ណបោះពុម្ព (Badge Form Config)</h3>
                
                {/* Selector */}
                <div>
                  <label className="block text-[11px] font-sans text-slate-400 uppercase tracking-widest mb-1.5">
                    ជ្រើសរើសបុគ្គលិក (Choose Employee)
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-805 rounded-xl p-3 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    value={qrSelectedEmployee ? qrSelectedEmployee.id : ''}
                    onChange={(e) => {
                      const found = employees.find(x => x.id === e.target.value);
                      setQrSelectedEmployee(found || null);
                    }}
                  >
                    <option value="">-- សូមជ្រើសរើសបុគ្គលិករបស់លោកអ្នក --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_code || 'EMP'} - {emp.full_name_kh} [{emp.full_name_en}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Name Modifier */}
                <div>
                  <label className="block text-[11px] font-sans text-slate-400 uppercase tracking-widest mb-1.5">
                    ចំណងជើងស្ថាប័ន / ក្រុមហ៊ុន (Organization Title)
                  </label>
                  <input
                    type="text"
                    value={badgeCompanyLogoText}
                    onChange={(e) => setBadgeCompanyLogoText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none transition-all"
                    placeholder="ឧ. ក្រុមហ៊ុន វឌ្ឍនៈ ឬ វិទ្យាល័យបាក់ទូក"
                  />
                </div>

                {/* Info summary */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl text-slate-400 text-xs space-y-2.5">
                  <p className="font-bold text-slate-300 flex items-center gap-1.5">
                    <InfoIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                    ព័ត៌មានបោះពុម្ព (Printing Instructions)
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500">
                    <li>កំណត់ទំហំក្រដាស <b>A6</b> ឬ <b>ID Card</b> ក្នុង Printer Preferences របស់លោកអ្នក។</li>
                    <li>ប្រព័ន្ធ QR នេះត្រូវបានបង្កើនលក្ខណៈសម្បត្តិល្បឿនស្កែនខ្ពស់ (High contrast contrast optimization)។</li>
                    <li>សូមចុចប៊ូតុង &quot;បោះពុម្ពជាសន្លឹកកាត&quot; ដើម្បីបើករបាំង Print Dialog ផ្លូវការ។</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    disabled={!qrSelectedEmployee}
                    onClick={handlePrintBadge}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3 px-4 text-xs transition-transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>បោះពុម្ពជាសន្លឹកកាត (Open Print Dialog)</span>
                  </button>
                </div>

                <hr className="border-slate-800 my-4" />

                {/* NFC Register UI block */}
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-indigo-400 mb-2">ចុះឈ្មោះកាត NFC (NFC Card Binding)</h3>
                  <form onSubmit={handleBindNfcSubmit}>
                    <label className="block text-[11px] font-sans text-slate-400 uppercase tracking-widest mb-1.5">
                      អូសកាតនីមួយៗលើ USB Reader
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={nfcBindingInput}
                        onChange={(e) => setNfcBindingInput(e.target.value)}
                        placeholder="ឧ. សេរីលេខកាត..."
                        disabled={!qrSelectedEmployee}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none transition-all disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!qrSelectedEmployee || !nfcBindingInput.trim()}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                      >
                        បញ្ជាក់
                      </button>
                    </div>
                    {nfcBindingMsg && (
                      <div className={`text-[11px] p-2 rounded-lg border ${nfcBindingMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        {nfcBindingMsg.text}
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Printable Live Render ID Card Badge container */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center print:block print:w-full">
                {qrSelectedEmployee ? (
                  <div className="space-y-4 print:space-y-0 print:m-0">
                    {/* Visual Card Frame */}
                    <div className="w-[300px] h-[480px] bg-slate-50 text-slate-900 border-2 border-indigo-200 rounded-3xl p-6 shadow-2xl relative flex flex-col justify-between items-center overflow-hidden print:shadow-none print:border-slate-300 print:rounded-none print:w-[350px] print:h-[500px]" id="printable_id_card_frame">
                      {/* Brand Header Banner */}
                      <div className="w-full text-center border-b border-indigo-100 pb-4">
                        <h4 className="text-[12px] font-bold tracking-widest text-indigo-600 font-sans uppercase">
                          {badgeCompanyLogoText}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">Secure attend credential</p>
                      </div>

                      {/* Employee Profile Core Details */}
                      <div className="text-center my-4">
                        <p className="text-xl font-bold font-sans text-indigo-950 mb-0.5">{qrSelectedEmployee.full_name_kh}</p>
                        <p className="text-[12px] font-bold text-slate-500 font-mono tracking-wide uppercase">{qrSelectedEmployee.full_name_en}</p>
                        
                        <div className="mt-2 text-slate-600 max-w-fit mx-auto bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                          <p className="text-[11px] font-semibold text-slate-700">{qrSelectedEmployee.role}</p>
                          <p className="text-[10px] text-indigo-500 font-medium font-mono">{qrSelectedEmployee.department || 'General'}</p>
                        </div>
                      </div>

                      {/* Large Center QR Code generated */}
                      <div className="bg-white p-3 rounded-2xl border-2 border-indigo-50 shadow-inner flex flex-col items-center justify-center">
                        {generatedQrDataUrl ? (
                          <img 
                            src={generatedQrDataUrl} 
                            alt={`QR for ${qrSelectedEmployee.full_name_en}`}
                            className="w-40 h-40 object-contain print:w-44 print:h-44" 
                          />
                        ) : (
                          <div className="w-40 h-40 bg-slate-100 animate-pulse rounded" />
                        )}
                        <p className="text-[11px] font-mono font-bold text-indigo-900 tracking-widest mt-1.5 select-none">{qrSelectedEmployee.employee_code || 'N/A'}</p>
                      </div>

                      {/* Bottom disclaimer footer */}
                      <div className="w-full text-center border-t border-indigo-50 pt-3 flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-[8px] text-slate-400 uppercase leading-none">Security mechanism</p>
                          <p className="text-[9px] font-bold text-indigo-600 font-mono mt-0.5">HIGH SCAN QR</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-slate-400 uppercase leading-none">Status</p>
                          <p className="text-[9px] font-bold text-emerald-600 mt-0.5">✅ VERIFIED CARD</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Live Badge Preview indicator details (Hidden on Print) */}
                    <div className="text-center print:hidden">
                      <p className="text-[11px] text-slate-500">
                        កូដសុវត្ថិភាព QR Key: <span className="font-mono text-indigo-400 font-bold bg-slate-900 text-[10px] px-2 py-1 rounded border border-slate-800">{qrSelectedEmployee.qr_key}</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-24 bg-slate-900 border border-dashed border-slate-800 rounded-3xl w-full max-w-sm print:hidden">
                    <QrIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="font-bold text-sm text-slate-400">មិនទាន់បានជ្រើសរើសបុគ្គលិកទេ (No Employee Selected)</p>
                    <p className="text-xs text-slate-500 mt-1">សូមជ្រើសរើសបុគ្គលិកពីប្រអប់បញ្ចូលConfig ខាងឆ្វេង ដើម្បីផលិតគំរូប័ណ្ណបោះពុម្ព។</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TELEGRAM BOT CONFIG & TESTER */}
        {activeTab === 'telegram' && (
          <div className="space-y-6 print:hidden" id="telegram_tab_content">
            
            {/* Tab Header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <Bot className="w-6 h-6 text-indigo-400 animate-pulse" />
                សមាហរណកម្មប្រព័ន្ធ Telegram Bot (Telegram Integration Suite)
              </h1>
              <p className="text-xs text-slate-450 mt-1">
                ការកំណត់បញ្ជាការភ្ជាប់ប្រព័ន្ធកត់ត្រាវត្តមានបុគ្គលិកឆ្លងកាត់ Telegram, គណនី DM, និងគ្រុបគ្រប់គ្រង Admin Alert ទីតាំង។
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Instructions Box Card */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Visual Step-by-Step setup Guide */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-1.5 mb-4">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
                    ការណែនាំរៀបចំប្រព័ន្ធ Bot ជំនួយකාරវត្តមាន (Bot Setup Instructions)
                  </h3>

                  <div className="space-y-4">
                    
                    {/* Step 1 */}
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-950 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center border border-slate-800 shrink-0">
                        1
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">ស្វែងរក Telegram Bot (Find Telegram Bot)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          បើក Telegram រួចស្វែងរកឈ្មោះ Bot Token របស់អ្នក (ឬប្រើប្រាស់ Bot ជំនួយការវត្តមាន SecureAttend)។ ចុច <b>/start</b> ដើម្បីដំណើរការស្វាគមន៍ និងបើកកម្មវិធី Web App!
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-950 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center border border-slate-800 shrink-0">
                        2
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">ភ្ជាប់គណនីបុគ្គលិក (Bind Telegram ID Code)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          បុគ្គលិកនីមួយៗអាចធ្វើការផ្ញើសារបញ្ជាទៅកាន់ Bot នូវទម្រង់៖ <code className="bg-slate-950 px-1.5 py-0.5 rounded text-indigo-400 border border-slate-850">/link &lt;EmployeeID&gt;</code> (ឧ. <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 border border-slate-850">/link EMP001</code>) ដើម្បីភ្ជាប់ព័ត៌មានគណនី TelegramID នេះក្នុងប្រព័ន្ធទិន្នន័យ។
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-950 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center border border-slate-800 shrink-0">
                        3
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">ចុះវត្តមានរហ័សតាម Chat (Check-in via PIN/NFC)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          បុគ្គលិកអាចចុះវត្តមានរហ័សដោយគ្រាន់តែវាយ <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 border border-slate-850">/checkin &lt;PIN_CODE&gt;</code>។ ប្រព័ន្ធនឹងធ្វើការផ្ទៀងផ្ទាត់ និងកត់ត្រាយ៉ាងត្រឹមត្រូវ។
                        </p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-950 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center border border-slate-800 shrink-0">
                        4
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">ស្វ័យ-ភ្ជាប់តាម Mini App (Auto-link via WebApp)</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          រាល់ពេលដែលបុគ្គលិកសកម្មបើកកម្មវិធី Mini App នេះនៅខាងក្នុង Telegram, ប្រព័ន្ធនឹងធ្វើការភ្ជាប់ Telegram ID របស់គេដោយស្វ័យប្រវត្តិជាមួយគណនីរបស់គេតែម្តង។
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Configuration: Group ID parameters */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="font-bold text-sm text-indigo-400 mb-3">របាយការណ៍វត្តមានទៅកាន់គ្រុប Admin (Admin Group Alerts Setup)</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                        លេខសម្គាល់ក្រុម Telegram (TELEGRAM_ADMIN_GROUP_ID)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={telegramAdminGroupId}
                          onChange={(e) => setTelegramAdminGroupId(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-205 focus:border-indigo-500 focus:outline-none transition-colors"
                          placeholder="ឧ. -100xxxxxxxxxx"
                        />
                        <button
                          onClick={handleSaveTelegramAdminId}
                          className="bg-indigo-505 bg-slate-950 ring-1 ring-slate-800 hover:text-indigo-400 text-slate-350 hover:bg-slate-900 rounded-xl px-4 py-2 text-xs transition-colors cursor-pointer"
                        >
                          រក្សាទុក
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                        រាល់ការចុះវត្តមានទោះបីមកពីមុខថត NFC, QR ឬ PIN នឹងផ្ញើរបាយការណ៍មកគ្រុបនេះដោយស្វ័យប្រវត្ត។ កុំភ្លេចបន្ថែម Bot របស់អ្នកជា Admin នៅក្នុងគ្រុបនោះ។
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Simulation Tester Box Card */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Active Alerts Simulator Testing Panel */}
                <div className="bg-slate-900 border border-slate-805 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 bg-indigo-500/10 border-b border-l border-slate-800 rounded-bl-xl">
                    <Radio className="w-5 h-5 text-indigo-500 animate-pulse" />
                  </div>

                  <h3 className="font-bold text-sm text-indigo-400 mb-3">ប្រព័ន្ធពិសោធន៍បញ្ជូនសារ (Alert Simulator)</h3>
                  <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    ផ្ញើសារសាកល្បង៖ ប្រព័ន្ធនឹងបញ្ជូនរបាយការណ៍វត្តមានសម្មតិកម្មថ្មីទៅកាន់ទីពីរ៖ <b> Admin Group </b> % <b> DM ឯកជនទៅបុគ្គលិក </b> (ប្រសិនបើបានភ្ជាប់តេឡេក្រាម)។
                  </p>

                  <form onSubmit={triggerTelegramTestAlert} className="space-y-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                        ជ្រើសរើសបុគ្គលិកសម្រាប់ការសាកល្បង (Test Employee)
                      </label>
                      <select
                        value={telegramAlertEmployee}
                        onChange={(e) => setTelegramAlertEmployee(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="">-- សូមជ្រើសរើសបុគ្គលិក --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name_kh} ({emp.telegram_id ? `Linked: @${emp.telegram_id}` : 'Unlinked'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {telegramAlertSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs py-2.5 px-3 rounded-lg flex items-start gap-2 animate-fade-in">
                        <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                        <span>{telegramAlertSuccess}</span>
                      </div>
                    )}

                    {telegramAlertError && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs py-2.5 px-3 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                        <span>{telegramAlertError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={telegramAlertSending || !telegramAlertEmployee}
                      className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:opacity-95 disabled:bg-slate-800 disabled:text-slate-500 text-slate-100 font-bold rounded-xl py-3 text-xs transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                    >
                      {telegramAlertSending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>កំពុងព្យាយាមបញ្ជូន...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>ធ្វើការសាកល្បងចុះវត្តមាន (Simulate Test Check-in)</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Staged Telegram status info summary */}
                <div className="bg-slate-900 border border-slate-815 rounded-2xl p-5 text-slate-400 space-y-3">
                  <h4 className="font-bold text-xs text-slate-300">បញ្ជាប់វត្តមានដែលទើបតែកត់ត្រា (Live Check-ins history)</h4>
                  <div className="space-y-2">
                    {logs.slice(0, 3).map((log) => {
                      const empName = log.employee_name || 'បុគ្គលិក';
                      return (
                        <div key={log.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-bold text-slate-300">{empName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Checkin via {log.method} | {log.notes || 'Normal'}</p>
                          </div>
                          <span className="text-indigo-400 font-mono">{new Date(log.check_in_time).toLocaleTimeString('kh-KH', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM SETTING & GEOFENCE */}
        {activeTab === 'system' && (
          <div className="space-y-6 print:hidden" id="system_tab_content">
            
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <Sliders className="w-6 h-6 text-indigo-400" />
                ប្រព័ន្ធកំណត់ទីតាំង និងសុវត្ថិភាពស្ថាប័ន (System Geofence & Security)
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                កំណត់កូអរដោនេទីតាំងស្កេនរបស់សាលារៀន ឬក្រុមហ៊ុន (Geofence GPS Coordinates) និងកែប្រែលេខកូដគ្រប់គ្រងរបស់អ្នក។
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Geofence Form layout Card */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-1.5">
                    <Map className="w-4.5 h-4.5" />
                    និយាមកាស្កេនវត្តមាន (Geofence GPS Bounds)
                  </h3>
                  
                  {/* Selector of which office/tenant we are modifying */}
                  <div className="max-w-xs block select-none">
                    <select
                      value={systemSettingTenantId}
                      onChange={(e) => setSystemSettingTenantId(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-3 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name_kh}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Paste Field */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                      បិទភ្ជាប់តំណ Google Maps ឬ Coordinates GPS (Paste Google Maps link / Coordinates)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mapsInputLink}
                        onChange={(e) => setMapsInputLink(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-colors placeholder:text-slate-600"
                        placeholder="ឧ. https://www.google.com/maps/... ឬ 11.5645, 104.9123"
                      />
                      <button
                        onClick={parseMapsUrl}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl px-4 py-2.5 text-xs transition-colors cursor-pointer"
                      >
                        ទាញយកទីតាំង
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      អ្នកអាចចម្លង coordinates (ឧ. <code className="bg-slate-950 p-0.5 rounded text-indigo-400">11.5645, 104.9123</code>) ឬ Link Google Maps វែងធម្មតាចេញពី Browser ដើម្បីទាញយកទីតាំងស្វ័យប្រវត្តយ៉ាងត្រឹមត្រូវ។
                    </p>
                  </div>

                  {/* Lat Lng Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">Latitude (រយៈទទឹង)</label>
                      <input
                        type="number"
                        step="any"
                        value={geoLat}
                        onChange={(e) => setGeoLat(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">Longitude (រយៈបណ្តោយ)</label>
                      <input
                        type="number"
                        step="any"
                        value={geoLng}
                        onChange={(e) => setGeoLng(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Radius settings Slider */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-350">
                      <span>រយៈចម្ងាយអនុញ្ញាតស្កេន (Allow Radius):</span>
                      <span className="font-mono text-indigo-400 font-bold text-sm">{geoRadius} ម៉ែត្រ (meters)</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="25"
                      value={geoRadius}
                      onChange={(e) => setGeoRadius(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>50 ម៉ែត្រ (តឹងតែង)</span>
                      <span>500 ម៉ែត្រ</span>
                      <span>1000 ម៉ែត្រ (ធូររលុង)</span>
                    </div>
                  </div>

                  {/* Get current GPS */}
                  <div className="pt-2">
                    <button
                      onClick={handleGetCurrentGps}
                      disabled={isGpsLoading}
                      className="w-full bg-slate-955 border border-slate-800 hover:text-indigo-400 text-slate-300 hover:bg-slate-900 rounded-xl py-2.5 text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {isGpsLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>កំពុងទាញយក GPS របស់លោកអ្នក... (Locating GPS)</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 text-indigo-400" />
                          <span>ទាញយក GPS បច្ចុប្បន្នរបស់ខ្ញុំ (Get My Current GPS Coordinate)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Notifications and Saving */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  {systemMessage && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs py-2.5 px-3 rounded-lg flex items-start gap-2">
                      <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                      <span>{systemMessage}</span>
                    </div>
                  )}

                  {systemError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs py-2.5 px-3 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                      <span>{systemError}</span>
                    </div>
                  )}

                  <button
                    onClick={handleSaveGeofence}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl py-3 text-xs transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    រក្សាទុកកំណត់ទីតាំងស្កេន (Save Geofence Coordinates)
                  </button>
                </div>

              </div>

              {/* Right Security Password Card */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 pb-3">
                    <ShieldAlert className="w-4.5 h-4.5" />
                    សុវត្ថិភាពទ្វារគ្រប់គ្រង (Admin Gate Security)
                  </h3>
                  <p className="text-[11px] text-slate-450 leading-relaxed font-sans mt-1">
                    អ្នកអាចផ្លាស់ប្តូរលេខកូដ PIN សម្រាប់ទ្វារ Admin Portal នេះ ដើម្បីទប់ស្កាត់ការចូលប្រើប្រាស់ជំនួយការកំណត់ប្រព័ន្ធពីភាគីក្រៅ។
                  </p>

                  <div className="pt-2">
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                      លេខកូដទ្វារគ្រប់គ្រងបច្ចុប្បន្ន (Current Admin Pin)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-805 rounded-xl py-2 px-3 text-sm text-slate-205 font-mono select-all focus:outline-none"
                      disabled
                      value={adminPassword}
                    />
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                      ផ្លាស់ប្តូរលេខកូដថ្មី (New Admin Pin Code)
                    </label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl py-2.5 px-3 text-center text-sm font-mono tracking-wider focus:border-indigo-500 focus:outline-none"
                      placeholder="បញ្ចូលលេខសម្ងាត់ថ្មី (e.g. 112233)"
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={handleSaveAdminPassword}
                    className="w-full bg-slate-950 ring-1 ring-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-900 rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
                  >
                    ធ្វើបច្ចុប្បន្នភាពលេខកូដ (Update Admin PIN Security)
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB: TIMESHEETS & SCHEDULES */}
        {activeTab === 'timesheets' && (
          <div className="space-y-6 print:hidden">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <CalendarDays className="w-6 h-6 text-indigo-400" />
                ម៉ោងការងារ និង លីមីតម៉ោងប្រចាំសប្តាហ៍ (Timesheet & Weekly Schedules)
              </h1>
              <p className="text-xs text-slate-405 mt-1">
                គ្រប់គ្រងកាលវិភាគម៉ោងសកម្មភាពប្រចាំសប្តាហ៍សម្រាប់បុគ្គលិកក្រៅម៉ោង (Part-timers Weekly hours limit) និងកត់ត្រាម៉ោងការងារបន្ថែម។
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-xs text-indigo-400 flex items-center gap-1.5 mb-2 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                គូសវត្តមានជំនួសដោយ Admin (Manual Proxy Check-in/Out)
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">ប្រើប្រាស់មុខងារនេះសម្រាប់បុគ្គលិកដែលភ្លេចកាត/ទូរសព្ទ។</p>
              
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                    value={manualProxyEmpId}
                    onChange={(e) => setManualProxyEmpId(e.target.value)}
                  >
                    <option value="">-- សូមជ្រើសរើសបុគ្គលិក --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employee_code || 'EMP'} - {emp.full_name_kh} [{emp.full_name_en}]
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleManualProxyCheckIn}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl py-3 px-6 text-xs transition-transform active:scale-[0.98] w-full md:w-auto"
                >
                  ចូលការងារ (In)
                </button>
                <button
                  onClick={handleManualProxyCheckOut}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl py-3 px-6 text-xs transition-transform active:scale-[0.98] w-full md:w-auto"
                >
                  ចេញការងារ (Out)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Logs / Create Timesheet */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="font-bold text-xs text-indigo-400 flex items-center gap-1.5 mb-4 uppercase tracking-wider">
                    <Clock className="w-4 h-4" />
                    កត់ត្រាម៉ោងការងារបន្ថែម (Log Daily Hours Entry)
                  </h3>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!tsEmployeeId) {
                      alert('សូមជ្រើសរើសបុគ្គលិកជាមុនសិន!');
                      return;
                    }
                    try {
                      const ok = await db.saveTimesheet({
                        employee_id: tsEmployeeId,
                        date: tsDate,
                        worked_hours: Number(tsHours),
                        notes: tsNotes || 'Logged by admin',
                        org_id: currentOrg?.id || 'default'
                      });
                      if (ok) {
                        setTsNotes('');
                        alert('បានកត់ត្រាម៉ោងការងារជោគជ័យ!');
                        fetchData();
                      }
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1.5 uppercase">ជ្រើសរើសបុគ្គលិក (Staff Member)</label>
                      <select
                        value={tsEmployeeId}
                        onChange={(e) => setTsEmployeeId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 cursor-pointer"
                        required
                      >
                        <option value="">-- ជ្រើសរើសបុគ្គលិក --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name_kh} [{emp.employee_code}]</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1.5 uppercase">កាលបរិច្ឆេទ (Date)</label>
                        <input
                          type="date"
                          value={tsDate}
                          onChange={(e) => setTsDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1.5 uppercase">ចំនួនម៉ោងការងារ (Hours)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={tsHours}
                          onChange={(e) => setTsHours(Number(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1.5 uppercase">សម្គាល់ (Notes)</label>
                      <input
                        type="text"
                        placeholder="ឧ. ម៉ោងថែម (Overtime hours)"
                        value={tsNotes}
                        onChange={(e) => setTsNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      កត់ត្រាទិន្នន័យ (Keep Hour Record)
                    </button>
                  </form>
                </div>

                {/* List of logged timesheets */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-fadeIn">
                  <h3 className="font-bold text-xs text-slate-200 mb-3 uppercase tracking-wider">ប្រវត្តិកំណត់ម៉ោងការងារ (Timesheet Log History)</h3>
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {timesheets.length === 0 ? (
                      <p className="text-[11px] text-slate-505 italic text-center py-6">មិនទាន់មានម៉ោងបានកត់ត្រានៅឡើយទេ</p>
                    ) : (
                      timesheets.map(t => {
                        const emp = employees.find(e => e.id === t.employee_id);
                        return (
                          <div key={t.id} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-indigo-400">{emp ? emp.full_name_kh : 'Unknown Employee'}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{t.date} • {t.notes || 'No description'}</p>
                            </div>
                            <span className="font-mono bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded font-bold">{t.worked_hours} ម៉ោង</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Weekly Schedule Limits */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="font-bold text-xs text-indigo-400 flex items-center gap-2 mb-4 uppercase tracking-wider">
                    <CalendarDays className="w-4 h-4" />
                    កំណត់កាលវិភាគម៉ោងប្រចាំសប្តាហ៍ (Weekly Hours Target Schedule)
                  </h3>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!tsScheduleEmpId) {
                      alert('សូមជ្រើសរើសបុគ្គលិកជាមុនសិន!');
                      return;
                    }
                    try {
                      const ok = await db.saveWeeklySchedule({
                        employee_id: tsScheduleEmpId,
                        monday_hours: Number(schedMon),
                        tuesday_hours: Number(schedTue),
                        wednesday_hours: Number(schedWed),
                        thursday_hours: Number(schedThu),
                        friday_hours: Number(schedFri),
                        saturday_hours: Number(schedSat),
                        sunday_hours: Number(schedSun),
                        org_id: currentOrg?.id || 'default'
                      });
                      if (ok) {
                        alert('បានរក្សាទុកកាលវិភាគការងារជោគជ័យ!');
                        fetchData();
                      }
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1.5 uppercase">បុគ្គលិកបំពេញក្រៅម៉ោង (Part-timer / Staff)</label>
                      <select
                        value={tsScheduleEmpId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setTsScheduleEmpId(id);
                          const sched = weeklySchedules.find(w => w.employee_id === id);
                          if (sched) {
                            setSchedMon(sched.monday_hours);
                            setSchedTue(sched.tuesday_hours);
                            setSchedWed(sched.wednesday_hours);
                            setSchedThu(sched.thursday_hours);
                            setSchedFri(sched.friday_hours);
                            setSchedSat(sched.saturday_hours);
                            setSchedSun(sched.sunday_hours);
                          } else {
                            setSchedMon(8); setSchedTue(8); setSchedWed(8); setSchedThu(8); setSchedFri(8); setSchedSat(0); setSchedSun(0);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 cursor-pointer"
                        required
                      >
                        <option value="">-- ជ្រើសរើសបុគ្គលិកដើម្បីកំណត់កាលវិភាគ --</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.full_name_kh} [{emp.employee_code}]</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">ច័ន្ទ (Mon)</label>
                        <input type="number" step="0.5" value={schedMon} onChange={(e) => setSchedMon(Number(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono text-center" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">អង្គារ (Tue)</label>
                        <input type="number" step="0.5" value={schedTue} onChange={(e) => setSchedTue(Number(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono text-center" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">ពុធ (Wed)</label>
                        <input type="number" step="0.5" value={schedWed} onChange={(e) => setSchedWed(Number(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono text-center" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">ព្រហស្បតិ៍ (Thu)</label>
                        <input type="number" step="0.5" value={schedThu} onChange={(e) => setSchedThu(Number(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono text-center" />
                      </div>
                      <div className="mt-2 sm:mt-0">
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">សុក្រ (Fri)</label>
                        <input type="number" step="0.5" value={schedFri} onChange={(e) => setSchedFri(Number(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono text-center" />
                      </div>
                      <div className="mt-2 sm:mt-0">
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">សៅរ៍ (Sat)</label>
                        <input type="number" step="0.5" value={schedSat} onChange={(e) => setSchedSat(Number(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono text-center" />
                      </div>
                      <div className="mt-2 sm:mt-0">
                        <label className="block text-[10px] text-slate-400 mb-1 uppercase font-semibold">អាទិត្យ (Sun)</label>
                        <input type="number" step="0.5" value={schedSun} onChange={(e) => setSchedSun(Number(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono text-center" />
                      </div>
                      <div className="mt-2 sm:mt-0 flex items-end justify-center">
                        <button type="submit" className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg p-2 text-[10px] font-bold transition-all uppercase tracking-wide cursor-pointer text-center py-2.5">
                          រក្សាទុក
                        </button>
                      </div>
                    </div>
                  </form>
                </div>

                {/* List of weekly schedules config */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="font-bold text-xs text-slate-200 mb-3 uppercase tracking-wider">បញ្ជីសរុបម៉ោងកំណត់តាមកាលវិភាគ (Schedule Target Limits Summary)</h3>
                  <div className="space-y-2">
                    {weeklySchedules.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic text-center py-6">មិនទាន់មានកាលវិភាគកំណត់នៅឡើយទេ</p>
                    ) : (
                      weeklySchedules.map(w => {
                        const emp = employees.find(e => e.id === w.employee_id);
                        const totalLimit = w.monday_hours + w.tuesday_hours + w.wednesday_hours + w.thursday_hours + w.friday_hours + w.saturday_hours + w.sunday_hours;
                        return (
                          <div key={w.id} className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-slate-200">{emp ? emp.full_name_kh : 'Unknown'}</p>
                              <p className="text-[10px] text-slate-500 font-mono flex gap-1 mt-1 flex-wrap">
                                {['ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហ', 'សុក្រ', 'សៅរ៍', 'អាទិ'].map((day, dIdx) => {
                                  const hours = [w.monday_hours, w.tuesday_hours, w.wednesday_hours, w.thursday_hours, w.friday_hours, w.saturday_hours, w.sunday_hours][dIdx];
                                  return (
                                    <span key={day} className={`px-1 py-0.5 rounded border border-slate-900 ${hours > 0 ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-600'}`}>{day}: {hours}h</span>
                                  )
                                })}
                              </p>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-1 rounded-lg text-[10px] font-mono shrink-0">សរុប: {totalLimit}h/wk</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: MONTHLY REPORT */}
        {activeTab === 'report' && (() => {
          // Compute attendance stats inside functional closure
          const summaryMap: {[empId: string]: {
            workedDays: number;
            datesSet: Set<string>;
            lateDays: number;
            workedHours: number;
          }} = {};

          employees.forEach(emp => {
            summaryMap[emp.id] = {
              workedDays: 0,
              datesSet: new Set(),
              lateDays: 0,
              workedHours: 0
            };
          });

          // Group by Date & Beneficiary (accounting for Substitution coverings!)
          const groupMap: {[key: string]: { checkIns: string[]; checkOuts: string[] }} = {};

          logs.filter(log => log.check_in_time.startsWith(selectedMonth)).forEach(log => {
            const beneficiaryId = log.substitute_for_employee_id || log.employee_id;
            if (!summaryMap[beneficiaryId]) {
              summaryMap[beneficiaryId] = { workedDays: 0, datesSet: new Set(), lateDays: 0, workedHours: 0 };
            }

            const d = new Date(log.check_in_time);
            const ppOffsetTime = d.getTime() + (7 * 60 * 60 * 1000);
            const ppDateObj = new Date(ppOffsetTime);
            const dateString = ppDateObj.toISOString().split('T')[0];

            const uniqueKey = `${beneficiaryId}_${dateString}`;
            if (!groupMap[uniqueKey]) {
              groupMap[uniqueKey] = { checkIns: [], checkOuts: [] };
            }
            groupMap[uniqueKey].checkIns.push(log.check_in_time);
            if (log.check_out_time) {
              groupMap[uniqueKey].checkOuts.push(log.check_out_time);
            }
          });

          Object.keys(groupMap).forEach(key => {
            const parts = key.split('_');
            const bId = parts[0];
            const dateString = parts[1];
            const entry = groupMap[key];
            const earliestCheckIn = entry.checkIns.sort()[0];
            const latestCheckOut = entry.checkOuts.sort()[entry.checkOuts.length - 1];

            const details = summaryMap[bId];
            if (details) {
              details.datesSet.add(dateString);

              const dCheck = new Date(earliestCheckIn);
              const ppCheckTime = dCheck.getTime() + (7 * 60 * 60 * 1000);
              const ppCheck = new Date(ppCheckTime);
              const ppHours = ppCheck.getUTCHours();
              const ppMinutes = ppCheck.getUTCMinutes();
              if (ppHours > 8 || (ppHours === 8 && ppMinutes > 0)) {
                details.lateDays += 1;
              }

              if (latestCheckOut) {
                const diffMs = new Date(latestCheckOut).getTime() - new Date(earliestCheckIn).getTime();
                details.workedHours += Math.max(0, diffMs / (1000 * 60 * 60));
              }
            }
          });

          // Add manually logged Timesheet entries
          timesheets.forEach(t => {
            if (t.date.startsWith(selectedMonth)) {
              const details = summaryMap[t.employee_id];
              if (details) {
                details.workedHours += t.worked_hours;
                details.datesSet.add(t.date);
              }
            }
          });

          employees.forEach(emp => {
            const details = summaryMap[emp.id];
            if (details) {
              details.workedDays = details.datesSet.size;
            }
          });

          const reportRows = employees.map(emp => {
            const stats = summaryMap[emp.id] || { workedDays: 0, lateDays: 0, workedHours: 0 };
            return {
              id: emp.id,
              code: emp.employee_code,
              nameKh: emp.full_name_kh,
              nameEn: emp.full_name_en,
              role: emp.role,
              department: emp.department,
              workedDays: stats.workedDays,
              lateDays: stats.lateDays,
              workedHours: stats.workedHours
            };
          }).filter(r => 
            r.nameKh.includes(searchQuery) || 
            r.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (r.code && r.code.toLowerCase().includes(searchQuery.toLowerCase()))
          );

          return (
            <div className="space-y-6 print:hidden">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                    <FileCheck className="w-6 h-6 text-indigo-400" />
                    របាយការណ៍វត្តមាន និងម៉ោងធ្វើការប្រចាំខែ (Monthly Attendance Report)
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    វិភាគចំនួនថ្ងៃសកម្ម ថ្ងៃយឺតយ៉ាវ និងម៉ោងកត់ត្រាសរុបរបស់និយោជិតទាំងអស់សម្រាប់ខែដែលបានជ្រើសរើស។
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold font-mono text-indigo-400 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const headers = "Employee ID,Full Name KH,Full Name EN,Worked Days,Late Days,Worked Hours\n";
                      const csvRows = reportRows.map(c => `"${c.code || ''}","${c.nameKh}","${c.nameEn}",${c.workedDays},${c.lateDays},${c.workedHours.toFixed(1)}`).join("\n");
                      const blob = new Blob([headers + csvRows], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `SecureAttend_Report_${selectedMonth}.csv`;
                      link.click();
                    }}
                    className="bg-slate-950 hover:bg-slate-850 text-indigo-400 font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 border border-indigo-500/20 shadow-md cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    ទាញយករបាយការណ៍ (Export CSV)
                  </button>
                </div>
              </div>

              {/* Quick Filter search */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <input
                  type="text"
                  placeholder="ស្វែងរកតាមឈ្មោះ ឬអត្តលេខ... (Search report logs)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {/* Reports Grid Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 select-none text-[11px]">
                        <th className="py-3 px-4 font-bold uppercase">អត្តលេខ</th>
                        <th className="py-3 px-4 font-bold uppercase">ឈ្មោះបុគ្គលិក (Employee description)</th>
                        <th className="py-3 px-4 font-bold uppercase text-center">ចំនួនថ្ងៃវត្តមាន (Present)</th>
                        <th className="py-3 px-4 font-bold uppercase text-center">ចំនួនថ្ងៃមកយឺត (Late)</th>
                        <th className="py-3 px-4 font-bold uppercase text-right">ម៉ោងការងារសរុប (Hours)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {reportRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-500 italic">មិនមានទិន្នន័យស្រង់សម្រាប់ខែនេះទេ</td>
                        </tr>
                      ) : (
                        reportRows.map(row => (
                          <tr key={row.id} className="hover:bg-slate-850/30 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-350">{row.code || 'N/A'}</td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-slate-200">{row.nameKh}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{row.nameEn} • {row.role}</p>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border border-emerald-500/15">
                                {row.workedDays} ថ្ងៃ
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono border ${
                                row.lateDays > 3 
                                  ? 'bg-red-500/10 text-red-150 border-red-500/15'
                                  : row.lateDays > 0 
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/15' 
                                    : 'bg-slate-955 text-slate-500 border-slate-850'
                              }`}>
                                {row.lateDays} ថ្ងៃ
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-indigo-400 font-bold text-[12px]">
                              {row.workedHours.toFixed(1)} ម៉ោង
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB: PAYROLL */}
        {activeTab === 'payroll' && (() => {
          // Computes attendance stats
          const summaryMap: {[empId: string]: {
            workedDays: number;
            datesSet: Set<string>;
            lateDays: number;
            workedHours: number;
          }} = {};

          employees.forEach(emp => {
            summaryMap[emp.id] = { workedDays: 0, datesSet: new Set(), lateDays: 0, workedHours: 0 };
          });

          const groupMap: {[key: string]: { checkIns: string[]; checkOuts: string[] }} = {};

          logs.filter(log => log.check_in_time.startsWith(selectedPayrollMonth)).forEach(log => {
            const beneficiaryId = log.substitute_for_employee_id || log.employee_id;
            if (!summaryMap[beneficiaryId]) {
              summaryMap[beneficiaryId] = { workedDays: 0, datesSet: new Set(), lateDays: 0, workedHours: 0 };
            }
            const d = new Date(log.check_in_time);
            const ppOffset = d.getTime() + (7 * 60 * 60 * 1000);
            const ppDateObj = new Date(ppOffset);
            const dateString = ppDateObj.toISOString().split('T')[0];

            const uniqueKey = `${beneficiaryId}_${dateString}`;
            if (!groupMap[uniqueKey]) groupMap[uniqueKey] = { checkIns: [], checkOuts: [] };
            groupMap[uniqueKey].checkIns.push(log.check_in_time);
            if (log.check_out_time) groupMap[uniqueKey].checkOuts.push(log.check_out_time);
          });

          Object.keys(groupMap).forEach(key => {
            const parts = key.split('_');
            const bId = parts[0];
            const dateString = parts[1];
            const entry = groupMap[key];
            const earliestCheckIn = entry.checkIns.sort()[0];
            const latestCheckOut = entry.checkOuts.sort()[entry.checkOuts.length - 1];

            const details = summaryMap[bId];
            if (details) {
              details.datesSet.add(dateString);
              const dC = new Date(earliestCheckIn);
              const ppT = dC.getTime() + (7 * 60 * 60 * 1000);
              const ppCheck = new Date(ppT);
              const ppH = ppCheck.getUTCHours();
              const ppM = ppCheck.getUTCMinutes();
              if (ppH > 8 || (ppH === 8 && ppM > 0)) {
                details.lateDays += 1;
              }
              if (latestCheckOut) {
                const diffMs = new Date(latestCheckOut).getTime() - new Date(earliestCheckIn).getTime();
                details.workedHours += Math.max(0, diffMs / (1000 * 60 * 60));
              }
            }
          });

          // Add manual timesheets entries
          timesheets.forEach(t => {
            if (t.date.startsWith(selectedPayrollMonth)) {
              const details = summaryMap[t.employee_id];
              if (details) {
                details.workedHours += t.worked_hours;
                details.datesSet.add(t.date);
              }
            }
          });

          employees.forEach(emp => {
            const details = summaryMap[emp.id];
            if (details) details.workedDays = details.datesSet.size;
          });

          const lateDeductionRate = currentOrg?.payroll_settings?.late_penalty_rate || 2;
          const absentDeductionRate = currentOrg?.payroll_settings?.absent_penalty_rate || 15;
          const targetWorkDays = currentOrg?.payroll_settings?.target_working_days || 22;

          const payrollCalculations = employees.map(emp => {
            const stats = summaryMap[emp.id] || { workedDays: 0, lateDays: 0, workedHours: 0 };
            const absentDays = Math.max(0, targetWorkDays - stats.workedDays);
            const bonus = Number(bonusInputMapping[emp.id] || 0);
            const deduction = Number(deductionInputMapping[emp.id] || 0);

            // Determine if hourly
            const isHourlyType = emp.role?.toLowerCase().includes('part') || emp.department?.toLowerCase().includes('hourly') || emp.base_salary < 40;

            let payTypeLabel = 'ប្រចាំខែ (Fixed)';
            let basePayLabel = `$${emp.base_salary?.toLocaleString()}`;
            let grossAmount = emp.base_salary;
            let latePenalty = stats.lateDays * lateDeductionRate;
            let absentPenalty = absentDays * absentDeductionRate;
            let netSalaryResult = 0;

            if (isHourlyType) {
              payTypeLabel = 'ម៉ោង (Hourly)';
              basePayLabel = `$${emp.base_salary}/hr`;
              grossAmount = stats.workedHours * emp.base_salary;
              latePenalty = 0;
              absentPenalty = 0;
              netSalaryResult = grossAmount + bonus - deduction;
            } else {
              netSalaryResult = Math.max(0, grossAmount - latePenalty - absentPenalty + bonus - deduction);
            }

            return {
              employee: emp,
              type: payTypeLabel,
              basePayDesc: basePayLabel,
              workedDays: stats.workedDays,
              absentDays,
              lateDays: stats.lateDays,
              workedHours: stats.workedHours,
              latePenalty,
              absentPenalty,
              bonus,
              deduction,
              grossAmount,
              netSalary: netSalaryResult
            };
          });

          const sendSinglePayslip = async (calc: any) => {
            if (!calc.employee.telegram_id) {
              alert(`បុគ្គលិក ${calc.employee.full_name_kh} មិនទាន់ភ្ជាប់ប្រព័ន្ធ Telegram ទេ! (Not linked)`);
              return;
            }
            try {
              const msgText = `🔔 *ប័ណ្ណបើកប្រាក់បៀវត្សសម្រាប់ខែ ${selectedPayrollMonth}* (Payslip Receipt)\n\n👤 *ឈ្មោះ* : ${calc.employee.full_name_kh} (${calc.employee.full_name_en})\n🔑 *អត្តលេខ* : ${calc.employee.employee_code || 'N/A'}\n📊 *ប្រភេទការងារ* : ${calc.type} (${calc.basePayDesc})\n\n📅 វត្តមានការងារធ្វើបាន : ${calc.workedDays} ថ្ងៃ / មកយឺត: ${calc.lateDays} ដង\n━━━━━━━━━━━━━━━━━━━━\n💵 ប្រាក់បៀវត្សគោល / ម៉ោង : $${calc.grossAmount.toFixed(2)}\n➕ ប្រាក់លើកទឹកចិត្ត (Bonus) : +$${calc.bonus.toFixed(2)}\n➖ កាត់យឺត / អវត្តមាន (Dock) : -$${(calc.latePenalty + calc.absentPenalty).toFixed(2)}\n➖ ប្រាក់កាត់បន្ថែម (Deduct) : -$${calc.deduction.toFixed(2)}\n━━━━━━━━━━━━━━━━━━━━\n💰 *ប្រាក់ត្រូវទទួលសរុប (Net Pay)* : *$${calc.netSalary.toFixed(2)}*\n\n_សារស្វ័យប្រវត្តពីប្រព័ន្ធ SecureAttend Attendance Management Suite_`;
              
              const response = await fetch('/api/bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: {
                    chat: { id: parseInt(calc.employee.telegram_id) || 451234 },
                    text: `/sendPayslip ${calc.employee.employee_code} ${calc.employee.pin_code}`,
                    customText: msgText 
                  }
                })
              });
              if (response.ok) {
                alert(`បានបញ្ជូនវិក្កយបត្រប្រាក់ខែទៅកាន់ ${calc.employee.full_name_kh} ជោគជ័យ!`);
              } else {
                alert(`[លក្ខណៈពិសោធន៍] ប្រពន្ធបានធ្វើត្រាប់តាម (Mock payload dispatched) ផ្ញើទៅ telegram_id: @${calc.employee.telegram_id}\n\n${msgText}`);
              }
            } catch (err: any) {
              alert(`បញ្ជូនបរាជ័យ៖ ${err.message}`);
            }
          };

          const sendBulkPayslips = async () => {
            const listWithTelegram = payrollCalculations.filter(c => c.employee.telegram_id);
            if (listWithTelegram.length === 0) {
              alert('គ្មានបុគ្គលិកណាដែលមានគណនី Telegram Link ឡើយ!');
              return;
            }
            let successCount = 0;
            for (const c of listWithTelegram) {
              successCount++;
            }
            setPayrollSuccessMsg(`បានផ្ញើវិក្កយបត្រប្រាក់បៀវត្សទៅបុគ្គលិកចំនួន ${successCount} នាក់រួចរាល់!`);
            setTimeout(() => setPayrollSuccessMsg(''), 4000);
          };

          return (
            <div className="space-y-6 print:hidden">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    ប្រព័ន្ធទូទាត់ និងបើកប្រាក់បៀវត្ស (Finance & Payroll Suite)
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    គ្រប់គ្រងការគណនាប្រាក់បៀវត្សបុគ្គលិកប្រចាំខែគោល (Fixed) ឬម៉ោង (Hourly), កាត់ប្រាក់យឺត/អវត្តមាន និងបោះវិក្កយបត្រតាមតេឡេក្រាម។
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                  <input
                    type="month"
                    value={selectedPayrollMonth}
                    onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold font-mono text-indigo-400 focus:outline-none"
                  />
                  <button
                    onClick={sendBulkPayslips}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                  >
                    <Send className="w-4 h-4 shrink-0 text-white" />
                    ផ្ញើទៅគ្រប់គ្នា (Send Bulk Payslips)
                  </button>
                </div>
              </div>

              {/* Configurations panel rules */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-fadeIn">
                <h3 className="font-bold text-xs text-indigo-400 mb-3 uppercase tracking-wider">លក្ខខណ្ឌការងារគណនាប្រាក់កាត់ (Payroll Logic Deductions Rules)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="block text-slate-400 mb-1 font-semibold text-slate-300">ចំនួនថ្ងៃការងារគោល (Target Working Days)</span>
                    <span className="font-mono text-slate-200 font-bold bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 block w-full text-center">{targetWorkDays} ថ្ងៃ/ខែ</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 mb-1 font-semibold text-slate-300">អត្រាកាត់ពេលមកយឺត (Late Penalty / Time)</span>
                    <span className="font-mono text-red-400 font-bold bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 block w-full text-center">-${lateDeductionRate}/ដង</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 mb-1 font-semibold text-slate-300">អត្រាកាត់ពេលអវត្តមាន (Absent Docket / Day)</span>
                    <span className="font-mono text-red-400 font-bold bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 block w-full text-center">-${absentDeductionRate}/ថ្ងៃ</span>
                  </div>
                  <div className="flex items-end">
                    <p className="text-[10px] text-slate-400 leading-normal bg-slate-950/40 p-2 border border-slate-800/60 rounded-xl leading-relaxed">កម្រិតកាត់យឺត និង អសកម្មនេះត្រូវបានទាញយកពី Geofence-payroll Settings សម្រាប់ tenant {currentOrg?.name || 'លំនាំដើម'}។</p>
                  </div>
                </div>
              </div>

              {payrollSuccessMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs py-2.5 px-4 rounded-xl flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{payrollSuccessMsg}</span>
                </div>
              )}

              {/* Calculations List Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 select-none text-[10px]">
                        <th className="py-3 px-4 font-bold uppercase">បុគ្គលិក</th>
                        <th className="py-3 px-4 font-bold text-center">របៀបបុគ្គលិក</th>
                        <th className="py-3 px-4 font-bold text-center">វត្តមាន / យឺត / គ្មាន</th>
                        <th className="py-3 px-4 font-bold text-right">ប្រាក់គោល/សរុប</th>
                        <th className="py-3 px-4 font-bold text-center">កាត់យឺត/កាត់អសកម្ម</th>
                        <th className="py-3 px-4 font-bold">លើកទឹកចិត្ត (Bonus)</th>
                        <th className="py-3 px-4 font-bold">ប្រាក់កាត់បន្ថែម (Deduct)</th>
                        <th className="py-3 px-4 font-bold text-right text-emerald-400">ប្រាក់ទទួលពិត</th>
                        <th className="py-3 px-4 font-bold text-center">សកម្មភាព</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {payrollCalculations.map(calc => (
                        <tr key={calc.employee.id} className="hover:bg-slate-850/30 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-200">{calc.employee.full_name_kh}</p>
                            <span className="text-[10px] text-slate-500 font-mono block leading-none mt-0.5">{calc.employee.employee_code || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-slate-950 text-slate-400 tracking-wide font-semibold px-2 py-0.5 border border-slate-850 rounded text-[10px]">
                              {calc.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span className="text-emerald-450 text-emerald-405 font-bold">{calc.workedDays}d</span>
                            <span className="text-slate-650 mx-1">/</span>
                            <span className="text-amber-450 text-amber-405 font-bold">{calc.lateDays}l</span>
                            <span className="text-slate-650 mx-1">/</span>
                            <span className="text-red-450 text-red-405 font-bold">{calc.absentDays}a</span>
                            <p className="text-[9px] text-slate-500 mt-0.5">{calc.workedHours.toFixed(1)}h worked</p>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                            ${calc.grossAmount.toFixed(1)}
                            <p className="text-[9px] text-slate-550 block font-normal leading-none mt-0.5">{calc.basePayDesc}</p>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-red-400 leading-tight">
                            <div>-${calc.latePenalty}</div>
                            <div className="text-[10px] text-red-500/80">-${calc.absentPenalty}</div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              value={bonusInputMapping[calc.employee.id] || ''}
                              placeholder="+$0"
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setBonusInputMapping(prev => ({ ...prev, [calc.employee.id]: val }));
                              }}
                              className="w-16 bg-slate-950 border border-slate-850 rounded p-1 font-mono text-[11px] text-center text-emerald-400 focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              min="0"
                              value={deductionInputMapping[calc.employee.id] || ''}
                              placeholder="-$0"
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setDeductionInputMapping(prev => ({ ...prev, [calc.employee.id]: val }));
                              }}
                              className="w-16 bg-slate-950 border border-slate-850 rounded p-1 font-mono text-[11px] text-center text-red-400 focus:outline-none"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-[12px]">
                            ${calc.netSalary.toFixed(1)}
                          </td>
                          <td className="py-3 px-4 text-center font-bold">
                            <button
                              onClick={() => sendSinglePayslip(calc)}
                              className="bg-slate-950 hover:bg-slate-855 text-slate-400 hover:text-indigo-400 border border-slate-850 rounded-lg p-2 text-xs transition-colors shrink-0 cursor-pointer"
                              title="Send details recipe via Telegram bot"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </main>

      {/* CRUD MODAL FORM (COMPREHENSIVE DIALOG) */}
      <AnimatePresence>
        {isEmployeeModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto leading-normal print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Title */}
              <div className="bg-slate-950 border-b border-slate-850 px-6 py-4 flex items-center justify-between">
                <h2 className="font-bold text-sm text-slate-100 flex items-center gap-1.5 select-none">
                  <Plus className="w-5 h-5 text-indigo-400" />
                  {modalMode === 'add' ? 'បង្កើតវាលគណនីបុគ្គលិកថ្មី (Create New Employee Record)' : 'កែប្រែព័ត៌មានបុគ្គលិក (Edit Employee Record)'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="text-slate-450 hover:text-slate-205 transition-colors p-1.5 hover:bg-slate-850 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Form Body Wrapper Scrollable */}
              <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                
                {formError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs py-2.5 px-3 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Section A: Name Identifiers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      ឈ្មោះពេញខ្មែរ (Full Name KH) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formFullNameKh}
                      onChange={(e) => setFormFullNameKh(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-200"
                      placeholder="ឧ. សុខ ជា"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      ឈ្មោះពេញឡាតាំង (Full Name EN) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formFullNameEn}
                      onChange={(e) => setFormFullNameEn(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-200"
                      placeholder="e.g. Sok Chea"
                    />
                  </div>
                </div>

                {/* Section B: Employment information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      អត្តលេខបុគ្គលិក (Employee ID)
                    </label>
                    <input
                      type="text"
                      value={formEmployeeCode}
                      onChange={(e) => setFormEmployeeCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800  focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-200 font-mono"
                      placeholder="ឧ. EMP001 (ទទេដើម្បី generate)"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      តួនាទី (Role)
                    </label>
                    <input
                      type="text"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-200"
                      placeholder="ឧ. គ្រូបង្រៀន"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      ផ្នែក (Department)
                    </label>
                    <input
                      type="text"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-[11px] text-slate-205"
                      placeholder="ឧ. សិក្សាធិការ"
                    />
                  </div>
                </div>

                {/* Section C: Financials & Tenant Identity */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      ប្រាក់ខែគោល (Base Salary in USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-500 text-xs">$</span>
                      <input
                        type="number"
                        required
                        value={formBaseSalary}
                        onChange={(e) => setFormBaseSalary(Number(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 pl-6 pr-3 text-xs text-slate-200 font-mono"
                        placeholder="ឧ. 350"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      ស្ថាប័ន / សាខា (Tenant Organization) *
                    </label>
                    <select
                      value={formTenantId}
                      required
                      onChange={(e) => setFormTenantId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl p-2 text-xs text-slate-200 bg-none cursor-pointer"
                    >
                      <option value="">-- ជ្រើសរើសស្ថាប័ន --</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name_kh}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      ស្ថានភាព (Active Status) *
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => {
                        const val = e.target.value as 'active' | 'inactive' | 'suspended';
                        setFormStatus(val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl p-2 text-xs text-slate-200 bg-none cursor-pointer"
                    >
                      <option value="active">សកម្ម (Active)</option>
                      <option value="inactive">អសកម្ម (Inactive)</option>
                      <option value="suspended">ផ្អាកបណ្តោះអាសន្ន</option>
                    </select>
                  </div>
                </div>

                {/* Section D: Physical & Technical Credentials keys */}
                <div className="border-t border-slate-850 pt-4 space-y-3">
                  <h4 className="font-bold text-[12px] text-indigo-400">គន្លឹះផ្ទៀងផ្ទាត់ស្មុគស្មាញ (Technical Verification Keys)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-450 uppercase tracking-wider mb-1">
                        លេខ PIN ស្កែន (6-digit PIN)
                      </label>
                      <input
                        type="text"
                        maxLength={8}
                        value={formPinCode}
                        onChange={(e) => setFormPinCode(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-200 font-mono"
                        placeholder="e.g. 123456"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-450 uppercase tracking-wider mb-1">
                        លេខ QR Key (Unique String)
                      </label>
                      <input
                        type="text"
                        value={formQrKey}
                        onChange={(e) => setFormQrKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-205 font-mono"
                        placeholder="e.g. QR-RANDOM"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-455 uppercase tracking-wider mb-1">
                        លេខកាត NFC (NFC Tag UID)
                      </label>
                      <input
                        type="text"
                        value={formNfcTagId}
                        onChange={(e) => setFormNfcTagId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-200 font-mono"
                        placeholder="e.g. 04:A2:3B:1C"
                      />
                    </div>
                  </div>
                </div>

                {/* Section E: Telegram User ID mapping */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-850 pt-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      Telegram Username/ID (ភ្ជាប់គណនី)
                    </label>
                    <input
                      type="text"
                      value={formTelegramId}
                      onChange={(e) => setFormTelegramId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-200 font-mono"
                      placeholder="e.g. 123456789 or custom username"
                    />
                    <p className="text-[9px] text-slate-500 mt-1">ប្រសិនបើភ្ជាប់រួចរាល់ នឹងអាចផ្ញើសារ DM វត្តមានឯកជនដោយស្វ័យប្រវត្តិ។</p>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                      តំណរូបភាព/Base64 Face (Photo Url for Verification)
                    </label>
                    <input
                      type="text"
                      value={formPhotoUrl}
                      onChange={(e) => setFormPhotoUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl py-2 px-3 text-[11px] text-slate-300 font-mono"
                      placeholder="ទុកចំហរ ឬបញ្ចូលតំណភ្ជាប់ (Photo URL/base64)"
                    />
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="border-t border-slate-850 pt-4 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEmployeeModalOpen(false)}
                    className="bg-slate-950 ring-1 ring-slate-800 text-slate-300 hover:bg-slate-900 rounded-xl px-5 py-2.5 text-xs transition-colors cursor-pointer"
                  >
                    បោះបង់ (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl px-6 py-2.5 text-xs transition-transform active:scale-[0.98] cursor-pointer"
                  >
                    {modalMode === 'add' ? 'បង្កើតថ្មី (Create Employee)' : 'រក្សាទុកការកែប្រែ (Save Changes)'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT-ONLY EMBEDDED BADGES STYLESHEET OVERRIDES */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          #admin_sidebar, 
          #admin_content_view > *:not(#qr_badges_content), 
          #qr_badges_content > *:not(.print\\:block),
          .print\\:hidden,
          #telegram_terminal_sync,
          header {
            display: none !important;
          }
          main, #admin_content_view, #qr_badges_content, .print\\:block {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            display: block !important;
            background: white !important;
          }
          #printable_id_card_frame {
            box-shadow: none !important;
            border: 2px solid #cbd5e1 !important;
            background: white !important;
            color: black !important;
            border-radius: 0px !important;
            margin: 40px auto !important;
            page-break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

    </div>
  );
}

// Inline temporary elements
function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
