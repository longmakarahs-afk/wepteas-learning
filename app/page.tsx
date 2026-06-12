/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { Scanner } from '@yudiel/react-qr-scanner';
import { 
  Building2, School, Users, CheckCircle2, AlertTriangle, Clock, XCircle, 
  MapPin, ScanFace, QrCode, CreditCard, Send, PlusCircle, Trash2, 
  FileSpreadsheet, RefreshCw, Landmark, Camera, Bot, HelpCircle, 
  ChevronRight, Calendar, UserPlus, Fingerprint, Search, ShieldCheck, UserCheck,
  TrendingUp, Award, DollarSign, ArrowUpRight, Check, CheckSquare, MessageSquare, Briefcase
} from 'lucide-react';
import { db, Tenant, Employee, AttendanceLog, LeaveRequest, Payroll, FaceEnrollment, forceResetDatabase } from '@/lib/supabase';

const getFaceApi = () => typeof window !== 'undefined' ? (window as any).faceapi : null;

export default function SecureAttendPage() {
  // --- DATABASE & TENANT STATE ---
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // USER ADDITIONS: Employee Activation States
  const [activatedEmployeeCode, setActivatedEmployeeCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('secureattend_activated_employee_code') || null;
    }
    return null;
  });
  const [activatedEmployee, setActivatedEmployee] = useState<Employee | null>(null);
  const [activationInputCode, setActivationInputCode] = useState('');
  const [activationError, setActivationError] = useState('');
  const [substituteForEmployeeId, setSubstituteForEmployeeId] = useState<string>('');

  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  
  // Interface toggles and tabs
  const [activeTab, setActiveTab] = useState<'GPS' | 'FACE' | 'QR' | 'NFC'>('GPS');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hrActiveTab, setHrActiveTab] = useState<'OVERVIEW' | 'LOGS' | 'LEAVES' | 'PAYROLL' | 'OFFICE_QR'>('OVERVIEW');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [officeQrDataUrl, setOfficeQrDataUrl] = useState<string>('');

  // --- REGISTRATION / CREATE MODAL STATE ---
  const [showRegModal, setShowRegModal] = useState(false);
  const [showFaceEnrollModal, setShowFaceEnrollModal] = useState(false);
  const [faceEnrollStatus, setFaceEnrollStatus] = useState<string | null>(null);
  const [newEmpKh, setNewEmpKh] = useState('');
  const [newEmpEn, setNewEmpEn] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Staff');
  const [newEmpDept, setNewEmpDept] = useState('General');
  const [newEmpSalary, setNewEmpSalary] = useState(300);
  const [newEmpPhoto, setNewEmpPhoto] = useState<string>(''); // base64 payload
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpTelegramId, setNewEmpTelegramId] = useState('');
  const [newEmpActive, setNewEmpActive] = useState(true);

  // --- LEAVE STATE ---
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState<'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY'>('ANNUAL');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // --- SIMULATION STATES ---
  // GPS
  const [gpsLatitude, setGpsLatitude] = useState(11.5645);
  const [gpsLongitude, setGpsLongitude] = useState(104.9123);
  const [gpsDistance, setGpsDistance] = useState(0); // in meters from tenant center
  // Camera/Face Match
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const enrollVideoRef = useRef<HTMLVideoElement | null>(null);
  const enrollCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isMatchingFace, setIsMatchingFace] = useState(false);
  const [faceMatchResult, setFaceMatchResult] = useState<{
    matched: boolean;
    score: number;
    notes: string;
  } | null>(null);
  const [isFaceApiLoaded, setIsFaceApiLoaded] = useState(false);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    const loadModels = async () => {
      try {
        const faceapi = getFaceApi();
        if (faceapi) {
          await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
          await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
          await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
          setIsFaceApiLoaded(true);
        } else {
          // Poll every 500ms if script hasn't loaded yet
          checkInterval = setTimeout(loadModels, 500);
        }
      } catch (err) {
        console.error('Failed to load FaceAPI models:', err);
      }
    };
    loadModels();
    return () => clearTimeout(checkInterval);
  }, []);
  
  // NFC Key simulation
  const [scannedNfcId, setScannedNfcId] = useState('');
  // Check-in Response
  const [checkInStatus, setCheckInStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Telegram Mock
  const [telegramCommand, setTelegramCommand] = useState('');
  const [telegramLogs, setTelegramLogs] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'សូមស្វាគមន៍មកកាន់ SecureAttend Telegram Bot! 🔔 សូមវាយបញ្ជា /start ដើម្បីចាប់ផ្តើម។',
      time: '14:11:22'
    }
  ]);
  const [isTelegramSending, setIsTelegramSending] = useState(false);

  // Live timer state for terminal cockpit
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentTime(new Date());
    }, 0);
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // Wrap loadDatabase in useCallback to satisfy linter dependencies
  const loadDatabase = useCallback(async (tenantId?: string) => {
    setIsRefreshing(true);
    try {
      const allTenants = await db.getTenants();
      setTenants(allTenants);
      
      let t = selectedTenant;
      // If we provided a specific ID to load, find that one first
      if (tenantId) {
        t = allTenants.find(item => item.id === tenantId) || null;
      }
      
      if (!t && allTenants.length > 0) {
        t = allTenants[0];
        setSelectedTenant(allTenants[0]);
      }
      
      const activeTenantId = t ? t.id : undefined;
      const emps = await db.getEmployees(activeTenantId);
      setEmployees(emps);
      
      if (emps.length > 0) {
        // Automatically preselect a staff for simulation convenience if not set
        setSelectedEmployee(prev => {
          if (prev && emps.some(e => e.id === prev.id)) {
            return emps.find(e => e.id === prev.id) || emps[0];
          }
          return emps[0];
        });
      } else {
        setSelectedEmployee(null);
      }

      // Sync GPS slider to initial tenant location
      if (t) {
        setGpsLatitude(t.geofence_lat);
        setGpsLongitude(t.geofence_lng);
        setGpsDistance(0);
      }

      // Get activities & finances
      const attendance = await db.getAttendanceLogs(activeTenantId);
      setLogs(attendance);

      const requestLogs = await db.getLeaveRequests(activeTenantId);
      setLeaves(requestLogs);

      const payrollList = await db.getPayrolls(activeTenantId);
      setPayrolls(payrollList);

    } catch (error) {
      console.error('Error syncing database:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedTenant]);

  // USER ADDITIONS: Keep Track of Activation Storage & Sync State
  useEffect(() => {
    if (employees.length > 0) {
      if (activatedEmployeeCode) {
        const match = employees.find(e => e.employee_code?.trim().toUpperCase() === activatedEmployeeCode.trim().toUpperCase());
        if (match) {
          const timer = setTimeout(() => {
            setActivatedEmployee(match);
            setSelectedEmployee(match); // lock visual selector to active employee
          }, 0);
          return () => clearTimeout(timer);
        } else {
          const timer = setTimeout(() => {
            setActivatedEmployee(null);
          }, 0);
          return () => clearTimeout(timer);
        }
      } else {
        const timer = setTimeout(() => {
          setActivatedEmployee(null);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [activatedEmployeeCode, employees]);

  // USER ADDITIONS: Telegram Native Mini App Integration
  // 1. Auto-login if opened inside Telegram and the user telegram_id matches an existing employee
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (typeof window !== 'undefined' && employees.length > 0 && !activatedEmployeeCode) {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tg.ready?.();
          const tgUser = tg.initDataUnsafe?.user;
          if (tgUser && tgUser.id) {
            const tgIdStr = tgUser.id.toString();
            const matchedEmp = employees.find(e => e.telegram_id === tgIdStr);
            if (matchedEmp && matchedEmp.employee_code) {
              console.log(`Auto-authenticating from Telegram Mini App user ID: ${tgIdStr}`);
              localStorage.setItem('secureattend_activated_employee_code', matchedEmp.employee_code);
              timer = setTimeout(() => {
                setActivatedEmployeeCode(matchedEmp.employee_code || '');
                setActivatedEmployee(matchedEmp);
                setSelectedEmployee(matchedEmp);
              }, 0);
            }
          }
        }
      } catch (err) {
        console.error('Telegram WebApp parsing error on load:', err);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [employees, activatedEmployeeCode]);

  // 2. Auto-link telegram_id when the active employee opens the app inside Telegram
  useEffect(() => {
    if (typeof window !== 'undefined' && activatedEmployee) {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          tg.ready?.();
          const tgUser = tg.initDataUnsafe?.user;
          if (tgUser && tgUser.id) {
            const tgIdStr = tgUser.id.toString();
            if (activatedEmployee.telegram_id !== tgIdStr) {
              const doAutoLink = async () => {
                const ok = await db.updateEmployeeTelegramId(activatedEmployee.id, tgIdStr);
                if (ok) {
                  // update local state
                  const updatedEmp = { ...activatedEmployee, telegram_id: tgIdStr };
                  setActivatedEmployee(updatedEmp);
                  if (selectedEmployee?.id === activatedEmployee.id) {
                    setSelectedEmployee(updatedEmp);
                  }
                  // Force database reload so current lists are in sync
                  loadDatabase();
                  // record alert log in simulator
                  setTelegramLogs(prev => [
                    ...prev,
                    {
                      sender: 'bot',
                      text: `🔗 គណនី Telegram របស់លោកអ្នក (${tgUser.first_name || ''}) ត្រូវបានភ្ជាប់ដោយស្វ័យប្រវត្តិតាមរយៈ Mini App ជាមួយបុគ្គលិក ${activatedEmployee.full_name_kh}!`,
                      time: new Date().toLocaleTimeString('kh-KH')
                    }
                  ]);
                }
              };
              doAutoLink();
            }
          }
        }
      } catch (err) {
        console.error('Telegram WebApp auto-linking error:', err);
      }
    }
  }, [activatedEmployee, selectedEmployee, loadDatabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDatabase();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDatabase]); // Run on mount & when database loader changes

  // When changing tenant
  const handleTenantChange = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setCheckInStatus(null);
    setFaceMatchResult(null);
    setCapturedImage(null);
    stopCamera();
    
    // Set map geofence target
    setGpsLatitude(tenant.geofence_lat);
    setGpsLongitude(tenant.geofence_lng);
    setGpsDistance(0);

    // load related tables
    const emps = await db.getEmployees(tenant.id);
    setEmployees(emps);
    setSelectedEmployee(emps.length > 0 ? emps[0] : null);

    const attendance = await db.getAttendanceLogs(tenant.id);
    setLogs(attendance);

    const requestLogs = await db.getLeaveRequests(tenant.id);
    setLeaves(requestLogs);

    const payrollList = await db.getPayrolls(tenant.id);
    setPayrolls(payrollList);
  };

  // Distance calculator helper
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
  };

  // Mock distance slider update
  const handleDistanceSlider = (meters: number) => {
    setGpsDistance(meters);
    if (!selectedTenant) return;
    
    // Distort coordinates slightly based on radius
    const deltaLat = (meters / 111320) * Math.sqrt(0.5);
    const deltaLng = (meters / (111320 * Math.cos((selectedTenant.geofence_lat * Math.PI) / 180))) * Math.sqrt(0.5);
    
    setGpsLatitude(selectedTenant.geofence_lat + deltaLat);
    setGpsLongitude(selectedTenant.geofence_lng + deltaLng);
  };

  // Drag coordinates directly inside custom SVG Map Radar
  const handleRadarClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!selectedTenant) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // map click coordinate radius (max 120 pixels mapped to max 250m)
    const pxRadius = Math.sqrt(x*x + y*y);
    const maxPx = rect.width / 2;
    const ratio = Math.min(pxRadius / maxPx, 1);
    const mappedMeters = Math.round(ratio * 250);

    handleDistanceSlider(mappedMeters);
  };

  // --- CAMERA HANDLING ---
  const [enrollCameraActive, setEnrollCameraActive] = useState(false);

  const startEnrollCamera = async () => {
    setEnrollCameraActive(true);
    setFaceEnrollStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Enroll Webcam failed/denied.', err);
    }
  };

  const stopEnrollCamera = () => {
    if (enrollVideoRef.current && enrollVideoRef.current.srcObject) {
      const stream = enrollVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      enrollVideoRef.current.srcObject = null;
    }
    setEnrollCameraActive(false);
  };

  const captureAndEnrollFace = async () => {
    if (!selectedEmployee) return;
    if (enrollVideoRef.current && enrollCanvasRef.current) {
      const video = enrollVideoRef.current;
      const canvas = enrollCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        setFaceEnrollStatus('Computing 128-d descriptor...');
        // Compute descriptor
        try {
          const faceapi = getFaceApi();
          if (!faceapi) throw new Error("FaceAPI not loaded");
          const detections = await faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor();
          if (detections) {
            const descriptor = Array.from(detections.descriptor) as number[];
            await db.addFaceEnrollment({
              employee_id: selectedEmployee.id,
              descriptor
            });
            // Update the photo
            const dataUrl = canvas.toDataURL('image/jpeg');
            await db.updateEmployeePhoto(selectedEmployee.id, dataUrl);
            setFaceEnrollStatus('✅ Registration successful!');
            setTimeout(() => {
              stopEnrollCamera();
              setShowFaceEnrollModal(false);
            }, 2000);
          } else {
            setFaceEnrollStatus('❌ No face detected. Try again.');
          }
        } catch (err) {
          console.error(err);
          setFaceEnrollStatus('❌ Enrollment failed.');
        }
      }
    }
  };

  const startCamera = async () => {
    setCameraActive(true);
    setCapturedImage(null);
    setFaceMatchResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Webcam failed/denied. Fallback image state implemented.', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
      }
    } else {
      // Custom attractive SVG biometric reference fallback capture
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 400;
      mockCanvas.height = 400;
      const ctx = mockCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 400, 400);
        
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 40, 320, 320);

        // simulated face oval
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(200, 190, 80, 110, 0, 0, Math.PI * 2);
        ctx.stroke();

        // status text
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px Kantumruy_Pro, Inter, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BIOMETRIC REFERENCE CAPTURED', 200, 330);
        
        setCapturedImage(mockCanvas.toDataURL('image/jpeg'));
      }
    }
  };

  const [scannedQrSecret, setScannedQrSecret] = useState<string>('');
  const [isScanningQr, setIsScanningQr] = useState(false);
  const handleScanQr = (detectedCodes: any[]) => {
    if (detectedCodes[0] && detectedCodes[0].rawValue) {
      setScannedQrSecret(detectedCodes[0].rawValue);
      setIsScanningQr(false);
    }
  };

  // --- ACTIONS: CHECK IN / OUT ---
  const handleCheckIn = async () => {
    if (!selectedTenant || !selectedEmployee) return;

    setCheckInStatus(null);
    let geofenceOk = true;
    let photoMatched = false;
    let matchingScore = 0;
    let notesText = '';

    // Step 1: Check Geofence
    if (activeTab === 'GPS') {
      const calculatedMeters = calculateDistance(
        selectedTenant.geofence_lat,
        selectedTenant.geofence_lng,
        gpsLatitude,
        gpsLongitude
      );
      geofenceOk = calculatedMeters <= selectedTenant.geofence_radius_meters;
      notesText = `បានផ្ទៀងផ្ទាត់ GPS៖ ${Math.round(calculatedMeters)}ម៉ែត្រ ពីមជ្ឈមណ្ឌល (${geofenceOk ? 'ដណ្តប់សុវត្ថិភាព' : 'ក្រៅតំបន់'})`;
    }

    // Step 2: AI Face Match
    if (activeTab === 'FACE') {
      if (!capturedImage || !canvasRef.current) {
        alert('សូមថតរូបផ្ទៃមុខរបស់អ្នកជាមុនសិន! (Please capture face snapshot first)');
        return;
      }
      setIsMatchingFace(true);
      try {
        setFaceMatchResult({ matched: false, score: 0, notes: 'កំពុងទាញយកទិន្នន័យផ្ទៃមុខ... (Extracting...)' });
        
        // 1. Get Live descriptor
        const imgCanvas = document.createElement('canvas');
        const img = new Image();
        img.src = capturedImage;
        await new Promise((resolve) => { img.onload = resolve; });
        imgCanvas.width = img.width;
        imgCanvas.height = img.height;
        const ctx = imgCanvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        const faceapi = getFaceApi();
        if (!faceapi) throw new Error("FaceAPI not loaded");
        
        const detections = await faceapi.detectSingleFace(imgCanvas).withFaceLandmarks().withFaceDescriptor();
        
        if (!detections) {
          throw new Error('រកមិនឃើញផ្ទៃមុខ។ (No face detected)');
        }
        
        const liveDescriptor = Array.from(detections.descriptor) as number[];
        
        // 2. Fetch all enrollments (simulate Server Fetch)
        const enrollments = await db.getFaceEnrollments();
        
        // 3. Auto-match against ALL employees (Threshold 0.5)
        let bestDistance = 1.0;
        let matchedEmployeeId = null;

        for (const e of enrollments) {
          const distance = faceapi.euclideanDistance(new Float32Array(liveDescriptor), new Float32Array(e.descriptor));
          if (distance < bestDistance) {
            bestDistance = distance;
            matchedEmployeeId = e.employee_id;
          }
        }
        
        if (bestDistance <= 0.5 && matchedEmployeeId) {
          const matchedEmp = employees.find(e => e.id === matchedEmployeeId);
          if (matchedEmp) {
            photoMatched = true;
            matchingScore = (1 - bestDistance) * 100;
            notesText = `ស្កែនមុខស្គាល់ជោគជ័យ៖ ${matchedEmp.full_name_kh} (${matchedEmp.full_name_en}) (Matched standard threshold ${bestDistance.toFixed(2)})`;
            // USER REQUIRED: Face auto-match returns employee -> record attendance for them
            setSelectedEmployee(matchedEmp);
          } else {
            photoMatched = false;
            matchingScore = 0;
            notesText = `រកមិនឃើញគណនីបុគ្គលិកដែលត្រូវគ្នាឡើយ។ (Matched obsolete employee account)`;
          }
        } else {
          photoMatched = false;
          matchingScore = 0;
          notesText = `មិនមានទិន្នន័យផ្ទៀងផ្ទាត់សោះ! (No registered face matches > 0.5 threshold)`;
        }
        
        setFaceMatchResult({ matched: photoMatched, score: matchingScore, notes: notesText });

        if (!photoMatched) {
          alert('ការផ្ទៀងផ្ទាត់ផ្ទៃមុខបរាជ័យ (Face Match Failed)\n' + notesText);
          setIsMatchingFace(false);
          return; // Block submit
        }
        
      } catch (err: any) {
        console.error('AI Face Matching error:', err);
        alert(err.message || 'AI Face matching failed!');
        setIsMatchingFace(false);
        return;
      }
      setIsMatchingFace(false);
    }

    // NFC details mapping
    if (activeTab === 'NFC') {
      if (!scannedNfcId) {
        alert('សូមស្កែនកាត ឬជ្រើសរើស ID កាត NFC! (Please click on Simulate NFC Tap)');
        return;
      }
      geofenceOk = true;
      notesText = `បានប្រើប្រាស់ប្រព័ន្ធកាត NFC: ${scannedNfcId}`;
    }

    // QR Code Check
    if (activeTab === 'QR') {
      if (!scannedQrSecret) {
        alert('សូមស្កែនកូដ QR! (Please scan the Office QR Code)');
        return;
      }
      const tenantSecret = localStorage.getItem(`secureattend_office_qr_${selectedTenant.id}`);
      if (!tenantSecret || scannedQrSecret !== tenantSecret) {
        alert('កូដ QR មិនត្រឹមត្រូវ ឬហួសសុពលភាព! (Invalid or Expired QR Code)');
        return;
      }
      geofenceOk = true;
      notesText = `បានស្កែនស្វ័យប្រវត្ត QR កូដនៃការិយាល័យ`;
    }

    // Determine status (ON_TIME vs LATE based on current clock hour)
    const currentHour = new Date().getHours();
    const status: 'ON_TIME' | 'LATE' = currentHour >= 8 ? 'LATE' : 'ON_TIME';

    try {
      const logged = await db.checkIn({
        employee_id: selectedEmployee.id,
        substitute_for_employee_id: substituteForEmployeeId || undefined,
        method: activeTab,
        gps_lat: gpsLatitude,
        gps_lng: gpsLongitude,
        geofence_ok: geofenceOk,
        photo_matched: photoMatched,
        face_matching_score: matchingScore > 0 ? matchingScore : undefined,
        status: status,
        notes: notesText
      });

      setCheckInStatus({
        success: true,
        message: `✅ កត់ត្រាវត្តមានជោគជ័យ! បុគ្គលិក៖ ${selectedEmployee.full_name_kh} (${selectedEmployee.full_name_en}) វិធីសាស្ត្រ៖ ${activeTab} - ស្ថានភាព៖ ${status === 'ON_TIME' ? 'ទាន់ម៉ោង (ON TIME)' : 'មកយឺត (LATE)'}`
      });

      setSubstituteForEmployeeId('');

      // reload list records safely with new changes
      loadDatabase(selectedTenant.id);
    } catch (e) {
      console.error(e);
      setCheckInStatus({ success: false, message: 'បរាជ័យក្នុងការកត់ត្រាវត្តមាន (Database transaction failed)!' });
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmployee || !selectedTenant) return;
    setCheckInStatus(null);
    try {
      const success = await db.checkOut(selectedEmployee.id);
      if (success) {
        setCheckInStatus({ success: true, message: `👋 កត់ត្រាវត្តមាន "ចេញពីការងារ" ជោគជ័យ! និយោជិត៖ ${selectedEmployee.full_name_kh}` });
        loadDatabase(selectedTenant.id);
      } else {
        setCheckInStatus({ success: false, message: '❌ បរាជ័យ៖ មិនទាន់មានវត្តមាន "ចូល" សម្រាប់ថ្ងៃនេះទេ ឬក៏បានកត់ត្រាចេញរួចហើយ!' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- ACTIONS: HR ADMIN (LEAVE) ---
  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedTenant) return;
    try {
      await db.addLeaveRequest({
        employee_id: selectedEmployee.id,
        leave_type: leaveType,
        start_date: leaveStart || new Date().toISOString().split('T')[0],
        end_date: leaveEnd || new Date().toISOString().split('T')[0],
        reason: leaveReason || 'សម្រាកកិច្ចការផ្ទាល់ខ្លួន'
      });
      setShowLeaveModal(false);
      setLeaveReason('');
      setHrActiveTab('LEAVES');
      loadDatabase(selectedTenant.id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateLeave = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!selectedTenant) return;
    try {
      await db.updateLeaveStatus(id, status, 'រដ្ឋបាលកណ្តាល (HR Central Manager)');
      loadDatabase(selectedTenant.id);
    } catch (error) {
      console.error(error);
    }
  };

  // --- ACTION: DEVICE ACTIVATION FOR EMPLOYEE (USER REQUEST) ---
  const handleActivateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');
    if (!activationInputCode.trim()) {
      setActivationError('សូមបញ្ចូលអត្តលេខបុគ្គលិក! (Please enter Employee ID!)');
      return;
    }
    const match = employees.find(
      (emp) => emp.employee_code?.trim().toUpperCase() === activationInputCode.trim().toUpperCase()
    );
    if (!match) {
      setActivationError(`រកមិនឃើញគណនីបុគ្គលិក៖ "${activationInputCode}" ទេ! (Employee ID not found)`);
      return;
    }
    if (!match.active) {
      setActivationError(`គណនីបុគ្គលិកនេះអសកម្ម! (This employee account is inactive)`);
      return;
    }

    const codeValue = match.employee_code || '';
    localStorage.setItem('secureattend_activated_employee_code', codeValue);
    setActivatedEmployeeCode(codeValue);
    setActivatedEmployee(match);
    setSelectedEmployee(match);
    setActivationInputCode('');
  };

  const handleDeactivateDevice = () => {
    localStorage.removeItem('secureattend_activated_employee_code');
    setActivatedEmployeeCode(null);
    setActivatedEmployee(null);
    if (employees.length > 0) {
      setSelectedEmployee(employees[0]);
    }
  };

  // --- ACTION: NEW EMPLOYEE REGISTRATION ---
  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      await db.addEmployee({
        tenant_id: selectedTenant.id,
        full_name_kh: newEmpKh,
        full_name_en: newEmpEn,
        role: newEmpRole,
        department: newEmpDept,
        base_salary: Number(newEmpSalary),
        photo_url: newEmpPhoto || undefined,
        status: 'active',
        qr_key: `QR_${selectedTenant.name_en.substring(0,3).toUpperCase()}_${newEmpEn.replace(/\s+/g, '_').toUpperCase()}`,
        nfc_tag_id: `NFC_${selectedTenant.name_en.substring(0,3).toUpperCase()}_${newEmpEn.replace(/\s+/g, '_').toUpperCase()}`,
        pin_code: Math.floor(100000 + Math.random() * 900000).toString(),
        employee_code: newEmpCode.trim() || undefined,
        telegram_id: newEmpTelegramId.trim() || undefined,
        active: newEmpActive
      });

      setShowRegModal(false);
      setNewEmpKh('');
      setNewEmpEn('');
      setNewEmpPhoto('');
      setNewEmpCode('');
      setNewEmpTelegramId('');
      setNewEmpActive(true);
      setHrActiveTab('OVERVIEW');
      loadDatabase(selectedTenant.id);
    } catch (error) {
      console.error(error);
    }
  };

  // Trigger base64 placeholder photo simulation during registration
  const triggerRegistrationPhotoMock = () => {
    const mockProfileFaces = [
      'https://picsum.photos/seed/face1/300/300',
      'https://picsum.photos/seed/face2/300/300',
      'https://picsum.photos/seed/face3/300/300'
    ];
    const picked = mockProfileFaces[Math.floor(Math.random() * mockProfileFaces.length)];
    setNewEmpPhoto(picked);
  };

  const generateOfficeQr = async (tenantId: string, forceNew = false) => {
    let secret = localStorage.getItem(`secureattend_office_qr_${tenantId}`);
    if (!secret || forceNew) {
      secret = `SA_OFFICE_${tenantId}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(`secureattend_office_qr_${tenantId}`, secret);
    }
    try {
      const url = await QRCode.toDataURL(secret, { width: 400, color: { dark: '#0F172A', light: '#FFFFFF' } });
      setOfficeQrDataUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedTenant && hrActiveTab === 'OFFICE_QR') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      generateOfficeQr(selectedTenant.id);
    }
   
  }, [selectedTenant, hrActiveTab]);

  // --- ACTION: PAYROLL CALCULATION ---
  const handleCalculatePayroll = async () => {
    if (!selectedTenant) return;
    try {
      const month = '2026-06';
      const tenantEmployees = employees;
      
      for (const emp of tenantEmployees) {
        const empLogs = logs.filter(l => l.employee_id === emp.id);
        const attendanceDays = empLogs.length > 0 ? empLogs.length : 21 + Math.floor(Math.random() * 2);
        const lateDays = empLogs.filter(l => l.status === 'LATE').length;
        
        // Deduct $5.00 for each late arrival
        const bonusSalary = empLogs.filter(l => l.status === 'ON_TIME').length * 2 + 10;
        const dedAmount = lateDays * 5;
        const netTotal = emp.base_salary + bonusSalary - dedAmount;

        await db.addPayroll({
          employee_id: emp.id,
          billing_month: month,
          base_salary: emp.base_salary,
          bonuses: bonusSalary,
          deductions: dedAmount,
          attendance_days: attendanceDays,
          late_days: lateDays,
          net_salary: netTotal,
          status: 'PAID',
          processed_at: new Date().toISOString()
        });
      }

      loadDatabase(selectedTenant.id);
      setHrActiveTab('PAYROLL');
      alert(`👉 បញ្ជីបើកប្រាក់បៀវត្សរ៍សម្រាប់ខែ ${month} នៃបុគ្គលិកទាំងអស់ត្រូវបានដំណើរការ និងផ្ទៀងផ្ទាត់ដោយជោគជ័យ!`);
    } catch (err) {
      console.error(err);
    }
  };

  // --- TELEGRAM SIMULATION HANDLER ---
  const handleTelegramSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramCommand.trim()) return;

    const userMsg = telegramCommand.trim();
    setTelegramCommand('');
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    setTelegramLogs(prev => [...prev, { sender: 'user', text: userMsg, time: timeStr }]);
    setIsTelegramSending(true);

    try {
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            text: userMsg,
            chat: { id: 123456789 },
            from: { id: 987654321, first_name: 'Khmer Admin' }
          }
        })
      });
      const data = await res.json();
      
      setTelegramLogs(prev => [...prev, { 
        sender: 'bot', 
        text: data.telegram_reply || 'បណ្តាញផ្ទៀងផ្ទាត់មិនឆ្លើយតប។', 
        time: timeStr 
      }]);

      if (selectedTenant && (userMsg.includes('/checkin') || userMsg.toLowerCase().includes('/status'))) {
        setTimeout(() => loadDatabase(selectedTenant.id), 1200);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTelegramSending(false);
    }
  };

  const handleReset = () => {
    if (confirm('តើអ្នកពិតជាចង់កំណត់ទិន្នន័យត្រឡប់ទៅដើមវិញមែនទេ? (This will reset to standard demo backup values)')) {
      forceResetDatabase();
      loadDatabase();
    }
  };

  // Filter employees for lookup search
  const filteredEmployees = employees.filter(emp => {
    const term = employeeSearch.toLowerCase();
    return (
      emp.full_name_kh.toLowerCase().includes(term) ||
      emp.full_name_en.toLowerCase().includes(term) ||
      (emp.department && emp.department.toLowerCase().includes(term)) ||
      emp.role.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden font-sans">
      
      {/* Decorative Premium Ambient Radial Lights */}
      <div className="absolute top-[-30%] left-[-15%] w-[80%] h-[70%] rounded-full bg-indigo-700/10 blur-[180px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-600/5 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[20%] w-[50%] h-[50%] rounded-full bg-violet-800/10 blur-[140px] pointer-events-none" />

      {/* NAV / TITLE CONTAINER */}
      <header className="border-b border-indigo-500/20 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-indigo-950/95 shadow-lg shadow-black/40 backdrop-blur-xl sticky top-0 z-40 px-4 sm:px-6 py-4" id="main_header">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-primary via-indigo-505 to-brand-purple shadow-lg shadow-neon-glow-indigo border border-indigo-405/30 flex items-center justify-center">
              <Fingerprint className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-100 via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  SecureAttend
                </h1>
                <span className="text-[10px] bg-brand-primary/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-mono font-semibold tracking-wider shadow-inner-soft">
                  V4.2 PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                ប្រព័ន្ធអត្តសញ្ញាណកម្ម និងបើកប្រាក់បៀវត្សរ៍សហគ្រាស • Dual-Language Cockpit
              </p>
            </div>
          </div>

          {/* REAL-TIME CLOCK IN GRADIENT HEADER */}
          <div className="hidden lg:flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-1.5 shadow-inner-soft">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs text-slate-450 font-medium font-sans">នាឡិកាប្រព័ន្ធ៖</span>
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-300">
              {currentTime ? currentTime.toLocaleTimeString('kh-KH') : '15:16:18'}
            </span>
          </div>

          {/* TENANT SWITCHER & OPTIONS */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2 bg-slate-950/85 border border-slate-800 rounded-xl px-3 py-1.5 shadow-lg">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">ស្ថាប័ន៖</span>
              </div>
              <select 
                className="bg-transparent text-xs font-bold text-indigo-300 cursor-pointer outline-none border-none py-0.5 pr-2"
                value={selectedTenant?.id || ''}
                onChange={(e) => {
                  const target = tenants.find(t => t.id === e.target.value);
                  if (target) handleTenantChange(target);
                }}
                id="tenant_select"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id} className="bg-slate-900 text-slate-100">
                    {t.name_kh} ({t.name_en})
                  </option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => selectedTenant && handleTenantChange(selectedTenant)}
              className="p-2 ml-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 hover:text-indigo-400 text-slate-300 transition shadow"
              title="ធ្វើបច្ចុប្បន្នភាពទិន្នន័យ (Sync Local DB)"
              id="reload_button"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button 
              onClick={handleReset}
              className="text-[11px] px-3.5 py-2 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 hover:bg-red-900/30 transition font-semibold"
              id="reset_button"
            >
              កំណត់ទិន្នន័យឡើងវិញ
            </button>
          </div>

        </div>
      </header>

      {/* GREETING HERO SECTION */}
      <section className="bg-gradient-to-b from-indigo-950/20 via-slate-950/10 to-transparent pt-8 pb-4 px-4 sm:px-6" id="greeting_hero">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl"
          >
            {/* Soft Ambient Background Glow inside the Hero */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-primary/10 blur-[80px] pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-brand-secondary/5 blur-[60px] pointer-events-none -ml-16 -mb-16" />

            {/* Left Column: Greeting and Owner Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 z-10 text-center sm:text-left">
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-brand-primary/20 to-brand-secondary/20 border border-brand-primary/30 shadow-inner-soft flex items-center justify-center shrink-0">
                <ShieldCheck className="w-8 h-8 text-cyan-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-400/90 uppercase tracking-widest font-mono">
                  {(() => {
                    const hrs = currentTime ? currentTime.getHours() : 15;
                    if (hrs < 12) return 'អរុណសួស្តី • Good Morning';
                    if (hrs < 17) return 'ទិវាសួស្តី • Good Afternoon';
                    return 'សាយ័ណ្ហសួស្តី • Good Evening';
                  })()}
                </span>
                
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">
                  សួស្តី <span className="bg-gradient-to-r from-indigo-200 via-cyan-200 to-emerald-300 bg-clip-text text-transparent drop-shadow-sm font-bold">ឡុង មករា (Long Makara)</span>!
                </h2>
                
                <p className="text-xs text-slate-400 pt-1">
                  គណនីម្ចាស់ស្ថាប័ន៖ <span className="font-mono text-cyan-300 font-medium select-all">long.makara.hs@moeys.gov.kh</span>
                  <span className="mx-2 text-slate-600">|</span> 
                  តួនាទី៖ <span className="text-slate-200 font-medium">អ្នកគ្រប់គ្រងប្រព័ន្ធជាន់ខ្ពស់ (Super Admin)</span>
                </p>

                <div className="flex flex-wrap gap-2 pt-3 items-center justify-center sm:justify-start">
                  <span className="inline-flex items-center gap-1.5 text-[11px] bg-brand-primary/10 border border-brand-primary/20 text-indigo-400 px-3 py-1 rounded-lg font-medium shadow-sm">
                    <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-ping" />
                    គណនីសកម្ម / Secure Active
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg font-medium shadow-sm">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    ប្រព័ន្ធសុវត្ថិភាពខ្ពស់បំផុត
                  </span>
                  <span className="text-xs text-slate-500 italic hidden lg:inline ml-1 font-sans">
                    គ្រប់គ្រង HR និងផេគើលដោយបញ្ញាសិប្បនិម្មិត
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Mini Dashboard Real-Time clock and Date Display */}
            <div className="flex flex-col items-center md:items-end gap-1.5 z-10 bg-slate-950/60 border border-slate-800/60 p-5 rounded-2xl min-w-[250px] text-center md:text-right shadow-lg">
              <div className="text-[10px] text-cyan-400 uppercase font-mono tracking-widest font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                នាឡិកាប្រព័ន្ធពិតប្រាកដ / Real-Time Clock
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-white drop-shadow-md">
                {currentTime ? currentTime.toLocaleTimeString('kh-KH') : '15:16:18'}
              </div>
              <div className="text-[11px] text-slate-300 font-medium">
                {currentTime ? currentTime.toLocaleDateString('kh-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'ពុធ, ១០ មិថុនា ២០២៦'}
              </div>
              <div className="text-[9px] text-slate-500 italic font-mono mt-0.5">
                ISO 8601: {currentTime ? currentTime.toISOString() : '2026-06-10T15:16:18Z'}
              </div>
            </div>

          </motion.div>
        </div>
      </section>


      {/* DYNAMIC LEADERBOARD STATS BAR (High Impact Display) */}
      <section className="bg-slate-900/30 py-6 px-4 border-b border-slate-900" id="stats_panel">
        <div className="max-w-7xl mx-auto">
          {selectedTenant && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              <div className="lg:col-span-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase font-mono tracking-wider font-bold">
                    {selectedTenant.type === 'school' ? 'វិស័យអប់រំ / Educational Group' : 'វិស័យសាជីវកម្ម / Corporate'}
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
                  {selectedTenant.type === 'school' ? (
                    <School className="w-6 h-6 text-indigo-400 shrink-0" />
                  ) : (
                    <Building2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  )}
                  {selectedTenant.name_kh}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span className="font-medium">រ៉ាឌីសុវត្ថិភាព Geofence: </span>
                  <span className="font-semibold text-slate-200 font-mono">{selectedTenant.geofence_radius_meters}m</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[11px] font-mono font-medium text-slate-400">({selectedTenant.geofence_lat.toFixed(5)}, {selectedTenant.geofence_lng.toFixed(5)})</span>
                </div>
              </div>

              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                {/* Stat block 1 */}
                <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm relative group hover:border-indigo-500/30 transition-all">
                  <div className="text-xs text-slate-400 font-sans">បុគ្គលិកសរុប (Employees)</div>
                  <div className="text-xl font-extrabold text-slate-100 mt-2 flex items-baseline gap-1.5">
                    <span className="text-indigo-400 font-mono">{employees.length}</span>
                    <span className="text-xs font-normal text-slate-400">នាក់</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                {/* Stat block 2 */}
                <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm relative group hover:border-emerald-500/30 transition-all">
                  <div className="text-xs text-slate-400 font-sans">មកទាន់ម៉ោង (On-Time Today)</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-2 flex items-baseline gap-1.5">
                    <span className="font-mono">{logs.filter(l => l.status === 'ON_TIME').length}</span>
                    <span className="text-xs font-normal text-slate-400">នាក់</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full animate-pulse" style={{ 
                      width: employees.length > 0 ? `${(logs.filter(l => l.status === 'ON_TIME').length / employees.length) * 100}%` : '0%' 
                    }}></div>
                  </div>
                </div>

                {/* Stat block 3 */}
                <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm relative group hover:border-amber-500/30 transition-all">
                  <div className="text-xs text-slate-400 font-sans">មកយឺត (Late / Tardiness)</div>
                  <div className="text-xl font-extrabold text-amber-500 mt-2 flex items-baseline gap-1.5">
                    <span className="font-mono">{logs.filter(l => l.status === 'LATE').length}</span>
                    <span className="text-xs font-normal text-slate-400">នាក់</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ 
                      width: employees.length > 0 ? `${(logs.filter(l => l.status === 'LATE').length / employees.length) * 100}%` : '0%' 
                    }}></div>
                  </div>
                </div>

                {/* Stat block 4 */}
                <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-2xl flex flex-col justify-between shadow-sm relative group hover:border-violet-500/30 transition-all">
                  <div className="text-xs text-slate-400 font-sans">ច្បាប់គ្រោង (Leaves Pending)</div>
                  <div className="text-xl font-extrabold text-indigo-300 mt-2 flex items-baseline gap-1.5">
                    <span className="font-mono">{leaves.filter(lv => lv.status === 'PENDING').length}</span>
                    <span className="text-xs font-normal text-slate-400">ករណី</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-indigo-300 h-full rounded-full" style={{ 
                      width: '33%' 
                    }}></div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* CORE CONTENT LAYOUT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-8" id="core_workspace">
        
        {/* LEFT COLUMN: SIMULATOR TERMINAL AND TELEGRAM BOT */}
        <div className="lg:col-span-5 flex flex-col gap-8" id="attendance_terminal_outer">
          
          {/* HARDWARE-LOOK SMART TERMINAL CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col" id="attendance_terminal_card">
            
            {/* Visual Header Styling resembling an actual terminal device */}
            <div className="p-5 bg-gradient-to-b from-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-indigo-100 font-sans tracking-wide">
                  ម៉ាស៊ីនចុះឈ្មោះវត្តមានអត្តសញ្ញាណកម្ម
                </h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
                  SecureAttend Biometric Gate v4
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping shrink-0" />
                ONLINE
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col gap-5">
              
              {/* Cockpit Digital Timer Panel */}
              <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 flex items-center justify-between text-left">
                <div>
                  <span className="text-[10px] text-indigo-400 uppercase font-mono font-bold tracking-widest block">
                    ម៉ោងផ្ទាល់របស់ម៉ាស៊ីន (GATE CLOCK UTC)
                  </span>
                  <div className="text-2xl font-black text-slate-100 font-mono tracking-wider mt-1">
                    {currentTime ? currentTime.toLocaleTimeString('kh-KH') : '14:27:00'}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {currentTime ? currentTime.toLocaleDateString('kh-KH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'ពុធ, ១០ មិថុនា ២០២៦'}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                    តម្រងកំណត់ម៉ោងការងារ
                  </span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-bold mt-1.5">
                    ម៉ោងចូល៖ 08:00 AM
                  </span>
                  <span className="text-[9px] text-slate-500 mt-1 italic block">
                    យឺតបន្ទាប់ពីម៉ោង ០៨:០០
                  </span>
                </div>
              </div>

              {/* Step 1: Select Employee or Activate Device (USER REQUEST) */}
              {!activatedEmployee ? (
                <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-5 relative shadow-indigo-500/5 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-xl">🔒</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 font-sans">ធ្វើសកម្មភាពឧបករណ៍ (Device Activation)</h4>
                      <p className="text-[10px] text-slate-400">បញ្ចូលអត្តលេខបុគ្គលិកដើម្បីចាប់ផ្តើម (Enter Employee ID to start)</p>
                    </div>
                  </div>

                  <form onSubmit={handleActivateDevice} className="flex flex-col gap-3">
                    <div>
                      <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none transition focus:border-indigo-500 shadow-inner placeholder-slate-600"
                        placeholder="ឧ. EMP001 (e.g. EMP001)"
                        value={activationInputCode}
                        onChange={(e) => {
                          setActivationInputCode(e.target.value);
                          setActivationError('');
                        }}
                      />
                      {activationError && (
                        <p className="text-[10.5px] text-red-400 mt-1.5 font-bold flex items-center gap-1">
                          ⚠️ {activationError}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] border-t border-indigo-400/20"
                    >
                      ធ្វើសកម្មភាព (Activate Terminal)
                    </button>
                  </form>

                  <div className="mt-4 pt-3 border-t border-slate-900/60">
                    <p className="text-[10px] text-slate-500 italic">
                      គន្លឹះ៖ ប្រើប្រាស់អត្តលេខ <strong className="text-slate-300 font-bold font-mono text-[11px]">EMP001</strong> សម្រាប់ការគំរូសាកល្បងដំបូង។
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 border border-emerald-500/20 rounded-2xl p-4 relative shadow-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg shadow-inner">
                        👤
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-100">
                            {activatedEmployee.full_name_kh} [{activatedEmployee.full_name_en}]
                          </h4>
                          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full font-bold">
                            Active
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: <span className="text-indigo-400 font-bold">{activatedEmployee.employee_code || ''}</span> | Dept: {activatedEmployee.department || 'General'}
                        </p>
                        {activatedEmployee.telegram_id && (
                          <p className="text-[9.5px] text-slate-500 mt-0.5">
                            ✈️ Telegram: {activatedEmployee.telegram_id}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleDeactivateDevice}
                      className="text-[10px] text-slate-400 hover:text-red-400 border border-slate-850 hover:border-red-500/20 px-2.5 py-1 rounded-lg transition-all"
                      title="Clear session and logout"
                    >
                      Sign Out
                    </button>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-900 flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-indigo-300/80 font-mono bg-slate-900/30 p-2 rounded-lg">
                      <div className="truncate" title={activatedEmployee.nfc_tag_id}>📟 NFC: {activatedEmployee.nfc_tag_id?.substring(0, 10)}...</div>
                      <div className="truncate" title={activatedEmployee.qr_key}>🎫 QR: {activatedEmployee.qr_key?.substring(0, 10)}...</div>
                      <div className="truncate">🔑 PIN: {activatedEmployee.pin_code}</div>
                    </div>
                    
                    <button
                      onClick={() => setShowFaceEnrollModal(true)}
                      className="w-full py-2.5 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/40 text-emerald-300 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <ScanFace className="w-4 h-4" /> Register AI Face Biometrics
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Tab interface to choose simulated method (GPS, AI Face alignment, QR, NFC) */}
              {!activatedEmployee ? (
                <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 border border-slate-900 border-dashed rounded-3xl min-h-[350px] gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-xl shadow-lg animate-pulse">
                    🔒
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-300 font-sans uppercase tracking-wider">ឧបករណ៍មិនទាន់ធ្វើសកម្មភាព (Terminal Inactive)</h5>
                    <p className="text-[11px] text-slate-500 max-w-[260px] leading-relaxed mt-2 mx-auto">
                      សូមបញ្ចូលអត្តលេខបុគ្គលិករបស់អ្នកខាងលើ ដើម្បីបើកដំណើរការម៉ាស៊ីនចុះឈ្មោះវត្តមាន និងស្កែនមុខ AI។ (Please enter Employee ID above to unlock check-in panels.)
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-850 rounded-2xl" id="checkout_method_tabs">
                {[
                  { id: 'GPS', label: 'GPS Geofence', sub: 'ទីតាំងរណប', icon: MapPin },
                  { id: 'FACE', label: 'Face Match', sub: 'ស្គែនមុខ AI', icon: ScanFace },
                  { id: 'QR', label: 'QR Scan', sub: 'កូដតំណភ្ជាប់', icon: QrCode },
                  { id: 'NFC', label: 'NFC Pass', sub: 'ប៉ះកាតបន្ទះ', icon: CreditCard }
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const isCur = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as any); setCheckInStatus(null); if (tab.id === 'FACE') startCamera(); else stopCamera(); }}
                      className={`py-2 px-1 rounded-xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${isCur ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xl scale-[1.03] border-t border-indigo-400/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'}`}
                      id={`tab_${tab.id.toLowerCase()}`}
                    >
                      <TabIcon className={`w-4 h-4 ${isCur ? 'text-white animate-pulse' : 'text-indigo-400'}`} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold font-sans tracking-tight">{tab.label}</span>
                        <span className="text-[8px] opacity-80 font-medium">{tab.sub}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* DYNAMIC SCREEN BASED ON SELECTED TAB */}
              <div className="flex-1 min-h-[300px] bg-slate-950 border border-slate-850 rounded-3xl flex flex-col justify-between p-5 relative overflow-hidden" id="checkout_tab_content">
                
                {/* Visual Glass Glow inside dynamic terminal display */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                {/* TAB 1: GPS RADIUS GEOFENCE RADAR SIMULATOR */}
                {activeTab === 'GPS' && selectedTenant && (
                  <div className="w-full flex flex-col items-center gap-4 flex-1 justify-center">
                    
                    {/* HIGH wow-factor CUSTOM GEOGRAPHICAL RADAR GRID */}
                    <div className="relative w-full max-w-[200px] aspect-square rounded-full border border-slate-800 bg-slate-950 flex items-center justify-center shadow-inner select-none overflow-hidden group">
                      
                      {/* Radar sweep scanning line rotation visual */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 via-indigo-500/0 to-indigo-500/20 rounded-full animate-[spin_4s_linear_infinite] pointer-events-none" />
                      
                      {/* Radar Grid coordinate cross line */}
                      <div className="absolute inset-x-0 h-px bg-slate-900" />
                      <div className="absolute inset-y-0 w-px bg-slate-900" />
                      
                      {/* Concentric distance circles (50m, 100m, 150m, 200m) */}
                      <div className="absolute w-[80%] h-[80%] rounded-full border border-slate-900/50 flex items-center justify-center text-[8px] text-slate-700 font-mono">
                        <div className="absolute w-[60%] h-[60%] rounded-full border border-slate-900/50 flex items-center justify-center">
                          <div className="absolute w-[40%] h-[40%] rounded-full border border-slate-900/70" />
                        </div>
                      </div>

                      {/* Interactive Radar Vector Area Map */}
                      <svg 
                        className="absolute inset-0 w-full h-full cursor-crosshair z-10"
                        onClick={handleRadarClick}
                      >
                        {/* Safe Zone Geofence colored ring area centered in map */}
                        <circle 
                          cx="50%" 
                          cy="50%" 
                          r={`${(selectedTenant.geofence_radius_meters / 250) * 100}%`} // map 250m to 100px radius
                          fill={gpsDistance <= selectedTenant.geofence_radius_meters ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.05)'}
                          stroke={gpsDistance <= selectedTenant.geofence_radius_meters ? '#10b981' : '#f59e0b'}
                          strokeWidth="1.5"
                          strokeDasharray={gpsDistance <= selectedTenant.geofence_radius_meters ? "0" : "4 2"}
                          className="transition-all duration-300"
                        />
                        
                        {/* Cambodia HQ Center Marker Pin (static) */}
                        <circle cx="50%" cy="50%" r="4" fill="#6366f1" />
                        <circle cx="50%" cy="50%" r="8" stroke="#6366f1" strokeWidth="1" fill="none" className="animate-ping" />

                        {/* Interactive Dynamic Employee marker vector placement */}
                        {/* Placing custom avatar point relative to distance */}
                        <g className="transition-all duration-300" style={{
                          transform: `translate(${50 + (100 * Math.sqrt(0.5) * (gpsDistance / 250)) - 6}px, ${50 - (100 * Math.sqrt(0.5) * (gpsDistance / 250)) - 6}px)`
                        }}>
                          <circle cx="6" cy="6" r="6" fill={gpsDistance <= selectedTenant.geofence_radius_meters ? '#10b981' : '#ef4444'} className="drop-shadow-lg" />
                          <circle cx="6" cy="6" r="10" stroke={gpsDistance <= selectedTenant.geofence_radius_meters ? '#10b981' : '#ef4444'} strokeWidth="1" fill="none" className="animate-pulse" />
                        </g>
                      </svg>

                      {/* Text details in corners of radar container */}
                      <span className="absolute top-2 left-3 font-mono text-[8px] text-slate-500">250m RADIUS</span>
                      <span className="absolute bottom-2 right-3 font-mono text-[8px] text-indigo-400">HQ CENTER</span>
                    </div>

                    <div className="space-y-1 text-center">
                      <h4 className="text-xs font-bold text-slate-200">ផ្ទៀងផ្ទាត់ទីតាំង និងចំងាយរណប (Satellite Range Analysis)</h4>
                      <p className="text-[10px] text-slate-400 max-w-[280px]">
                        សូមចុចលើប្លង់រ៉ាដាកូអរដោនេខាងលើ ឬអូសរបារខាងក្រោមដើម្បីផ្លាស់ទីនិយោជិតចូល-ចេញពីការិយាល័យ។
                      </p>
                    </div>

                    {/* Geofence Status Indicator */}
                    <div className={`text-[10px] px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 font-bold tracking-wide font-sans mt-1 transition-all ${gpsDistance <= selectedTenant.geofence_radius_meters ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                      {gpsDistance <= selectedTenant.geofence_radius_meters ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                          ស្ថិតនៅក្នុងការិយាល័យ (IN RANGE GEOFENCE OK)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-flash" />
                          ក្រៅតំបន់ការិយាល័យ (OUT OF RADIUS RANGE!)
                        </>
                      )}
                    </div>

                    {/* Slider controller */}
                    <div className="w-full bg-slate-900 border border-slate-850 p-3 rounded-2xl text-left space-y-2 mt-1">
                      <div className="flex items-center justify-between text-[11px] font-sans">
                        <span className="text-slate-400 font-medium">ចម្ងាយបច្ចុប្បន្ន (Distance):</span>
                        <span className="font-mono text-indigo-400 font-extrabold">{Math.round(gpsDistance)} ម៉ែត្រ</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="250" 
                        value={gpsDistance}
                        onChange={(e) => handleDistanceSlider(Number(e.target.value))}
                        className="w-full accent-indigo-500 bg-slate-700 h-1.5 rounded cursor-pointer"
                        id="gps_slider"
                      />
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span>០ ម៉ែត្រ (Center)</span>
                        <span>២៥០ ម៉ែត្រ (Out)</span>
                      </div>
                    </div>

                  </div>
                )}

                {/* TAB 2: AI BIOMETRICS SCAN FACE MATCH */}
                {activeTab === 'FACE' && (
                  <div className="w-full flex flex-col items-center gap-4 flex-1 justify-center">
                    
                    {/* Glowing Biometric Frame */}
                    <div className="relative w-full max-w-[280px] h-44 bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
                      
                      {cameraActive ? (
                        <>
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover transform -scale-x-100"
                          />
                          {/* Pulsing neon HUD green scanner frame */}
                          <div className="absolute inset-6 border border-emerald-500/20 pointer-events-none" />
                          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-500" />
                          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-500" />
                          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-500" />
                          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-500" />

                          {/* Biometric crosshair target scan overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-70 pointer-events-none">
                            <div className="w-16 h-16 rounded-full border border-dashed border-emerald-500 animate-spin" />
                          </div>

                          {/* Laser red scrolling horizontal scan tracker line and glare */}
                          <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-md shadow-emerald-400/80 animate-[bounce_2.5s_infinite] pointer-events-none" />
                        </>
                      ) : capturedImage ? (
                        <div className="relative w-full h-full">
                          <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                          {/* Face biometric locked indicators */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-32 border-2 border-dashed border-indigo-400 rounded-[40px] flex flex-col items-center justify-center bg-indigo-500/5">
                            <span className="text-[8px] bg-indigo-500 text-white font-mono rounded px-1.5 py-0.5 absolute bottom-1 translate-y-1/2">
                              LOCKED (100%)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 flex flex-col items-center gap-2 select-none">
                          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            <Camera className="w-6 h-6 text-indigo-500" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400">សូមបើកកាមេរ៉ាដើម្បីស្កែន</span>
                        </div>
                      )}

                      <canvas ref={canvasRef} className="hidden" />

                      <div className="absolute bottom-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded text-[8px] font-mono text-indigo-300 border border-slate-800">
                        HD REC 1080P
                      </div>
                    </div>

                    {/* Camera Control Action buttons */}
                    <div className="flex gap-2 w-full max-w-[280px]">
                      {!cameraActive && !capturedImage && (
                        <button 
                          onClick={startCamera}
                          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white transition-all flex items-center justify-center gap-1.5 shadow"
                          id="start_cam_btn"
                        >
                          <Camera className="w-4 h-4" /> ចាប់ផ្ដើមបើកកាមេរ៉ា
                        </button>
                      )}
                      {cameraActive && (
                        <button 
                          onClick={capturePhoto}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-xl text-white transition-all flex items-center justify-center gap-1.5 shadow-lg"
                          id="capture_cam_btn"
                        >
                          <ScanFace className="w-4 h-4" /> ថតកត់ត្រាផ្ទៃមុខ (Capture)
                        </button>
                      )}
                      {capturedImage && (
                        <button 
                          onClick={startCamera}
                          className="flex-1 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-300 transition"
                          id="recapture_cam_btn"
                        >
                          ថតរូបម្តងទៀត (Recapture)
                        </button>
                      )}
                    </div>

                    {/* Registree display profile bio lookup */}
                    {selectedEmployee?.photo_url && (
                      <div className="text-[11px] text-slate-400 bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl w-full max-w-[280px] flex items-center gap-3">
                        <img src={selectedEmployee.photo_url} alt="Profile database reference" className="w-9 h-9 rounded-full object-cover border-2 border-indigo-500 shadow" />
                        <div className="text-left leading-relaxed">
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Reference Profile:</span>
                          <span className="font-bold text-slate-200 block text-xs truncate max-w-[180px]">{selectedEmployee.full_name_kh}</span>
                        </div>
                      </div>
                    )}

                    {/* Loading status panel or API report */}
                    {isMatchingFace && (
                      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center gap-3 z-20">
                        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-indigo-300 font-sans">
                          Gemini 1.5 Real-Time Vision comparison API...
                        </p>
                        <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
                          Vector distance matching mapping
                        </p>
                      </div>
                    )}

                    {faceMatchResult && (
                      <div className={`w-full max-w-[280px] p-3 rounded-xl border text-left text-xs ${faceMatchResult.matched ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                        <div className="font-bold flex items-center justify-between mb-1.5 text-xs">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            ភា្ជប់ជីវមាត្រ៖ {faceMatchResult.score.toFixed(0)}%
                          </span>
                          <span className="text-[10px] uppercase font-mono tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded">{faceMatchResult.matched ? 'VERIFIED' : 'FAILED'}</span>
                        </div>
                        <p className="text-[10px] text-slate-350">{faceMatchResult.notes}</p>
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 3: SMART QR CODE SCANNER */}
                {activeTab === 'QR' && selectedTenant && selectedEmployee && (
                  <div className="w-full flex flex-col items-center gap-4 flex-1 justify-center relative">
                    {!isScanningQr ? (
                      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col items-center shadow-lg text-center relative max-w-[280px]">
                        <QrCode className="w-12 h-12 text-indigo-400 mb-3" />
                        <h4 className="text-sm font-bold text-slate-100 mb-1">Scan Office QR</h4>
                        <p className="text-[10px] text-slate-400 mb-4">
                          Aim your camera at the secure office QR code to log your attendance.
                        </p>
                        <button 
                          onClick={() => { setIsScanningQr(true); setScannedQrSecret(''); }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-5 rounded-full"
                        >
                          Start Scanner
                        </button>
                        {scannedQrSecret && (
                          <div className="mt-4 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded-lg break-all">
                            Scanned: {scannedQrSecret.substring(0, 16)}...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full max-w-[300px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative shadow-lg">
                        <Scanner 
                           onScan={handleScanQr} 
                           onError={(error) => console.error(error?.message)}
                           classNames={{ container: 'w-full h-[280px]' }}
                        />
                        <button 
                          onClick={() => setIsScanningQr(false)}
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/80 backdrop-blur border border-slate-700 text-slate-300 hover:text-white px-4 py-1.5 rounded-full text-xs font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: CONTACTLESS NFC WIRELESS CHIP */}
                {activeTab === 'NFC' && selectedTenant && selectedEmployee && (
                  <div className="w-full flex flex-col items-center gap-5 flex-1 justify-center">
                    
                    {/* Glassmorphic Corporate Badge NFC Card mockup with drag/pulse wave ripple */}
                    <div className="relative w-[210px] h-32 rounded-2xl bg-gradient-to-br from-indigo-800 via-indigo-950 to-indigo-900 p-4 shrink-0 text-left flex flex-col justify-between border border-indigo-400/30 shadow-2xl relative overflow-hidden group">
                      
                      {/* Chip texture details */}
                      <div className="absolute right-3 top-3 w-7 h-7 rounded bg-indigo-500/20 flex items-center justify-center border border-indigo-400/20">
                        <Fingerprint className="w-5 h-5 text-indigo-200" />
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[8px] text-indigo-300 font-mono tracking-widest uppercase block">
                          Access Keycard NFC
                        </span>
                        <h5 className="text-xs font-bold text-white uppercase truncate max-w-[130px]">
                          {selectedEmployee.full_name_en}
                        </h5>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] text-indigo-200/90 font-sans block">
                          {selectedEmployee.role}
                        </span>
                        <span className="text-[8px] text-indigo-300 font-mono block">
                          ID: {selectedEmployee.nfc_tag_id || 'NFC_MOCK'}
                        </span>
                      </div>

                      {/* Golden security chip layout */}
                      <div className="absolute right-3 bottom-3 w-6 h-5 rounded bg-amber-400/90 border border-amber-300 shadow flex items-center justify-center">
                        <div className="w-4 h-3 border border-amber-600/30 rounded-sm" />
                      </div>
                    </div>

                    <div className="w-full max-w-[240px] space-y-2">
                      <button 
                        onClick={() => setScannedNfcId(selectedEmployee.nfc_tag_id || 'NFC_MOCK_VERIFIED')}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white transition-all flex items-center justify-center gap-1.5 shadow"
                        id="simulate_nfc_tap"
                      >
                        💳 ប៉ះកាតធៀបនឹងម៉ាស៊ីន (Simulate NFC Tap)
                      </button>

                      {scannedNfcId && (
                        <p className="text-[10px] text-emerald-400 font-bold font-sans flex items-center justify-center gap-1 animate-bounce">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 
                          អានបន្ទះឈីប NFC ជោគជ័យ៖ {scannedNfcId}
                        </p>
                      )}
                    </div>

                  </div>
                )}

              </div>

              {/* SUBSTITUTION / COVERING FOR SELECTION */}
              <div className="bg-slate-900/60 p-4 border border-slate-850 rounded-xl space-y-3 my-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <label className="text-xs font-bold text-slate-200">
                    ជំនួសការងារឱ្យបុគ្គលិកផ្សេង (Covering / Substituting for)
                  </label>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  ប្រសិនបើអ្នកមកធ្វើការជំនួសបុគ្គលិកផ្សេង សូមជ្រើសរើសឈ្មោះខាងក្រោម។ ប្រាក់ឈ្នួលរបស់ពួកគេនឹងត្រូវបានគណនាត្រឹមត្រូវ។ (If covering for a colleague, choose below. They will be paid correctly.)
                </p>
                <select
                  value={substituteForEmployeeId}
                  onChange={(e) => setSubstituteForEmployeeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- NO SUBSTITUTE (មិនជំនួសនរណាម្នាក់ទេ) --</option>
                  {employees
                    .filter((emp) => emp.id !== selectedEmployee?.id && emp.active)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name_kh} ({emp.full_name_en}) - {emp.employee_code}
                      </option>
                    ))}
                </select>
              </div>

              {/* OVERALL SUBMIT CHECK-IN ACTION TRIGGER BUTTONS */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleCheckIn}
                    className="py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-xs font-bold rounded-xl text-white transition shadow-lg border-t border-indigo-400/25 flex items-center justify-center gap-1.5 cursor-pointer"
                    id="checkin_action"
                  >
                    <Check className="w-4 h-4 text-white" />
                    ចុះឈ្មោះចូលការងារ (CHECK-IN)
                  </button>
                  <button
                    onClick={handleCheckOut}
                    className="py-3 bg-slate-800 hover:bg-slate-755 border border-slate-700 text-xs font-bold rounded-xl text-slate-100 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    id="checkout_action"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    កត់ត្រាចេញ (CHECK-OUT)
                  </button>
                </div>

                {/* Real-time result alert board banner */}
                {checkInStatus && (
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className={`p-3.5 rounded-xl text-xs leading-relaxed font-sans border ${checkInStatus.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                  >
                    {checkInStatus.message}
                  </motion.div>
                )}
              </div>
            </>
          )}

            </div>

          </div>

          {/* CHATBOT GATEWAY TELEGRAM LOGS CONSOLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative" id="telegram_terminal_sync">
            
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Bot className="w-5 h-5 animate-bounce-slow" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Telegram Bot Simulation Console</h4>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Chatbot integration layer</p>
                </div>
              </div>
              <span className="text-[9px] bg-slate-950 border border-slate-850 text-indigo-400 px-2 py-0.5 rounded-full font-mono font-medium uppercase">
                Active Mock
              </span>
            </div>

            <p className="text-xs text-slate-450 leading-relaxed font-sans mb-3 text-[11px]">
              ⚙️ ប្រព័ន្ធ AI Gateway អនុញ្ញាតអោយនិយោជិតវាយពាក្យបញ្ជា <span className="font-mono text-indigo-400 text-xs">/checkin [PIN]</span> ក្នុងតេឡេក្រាមប្រចាំថ្ងៃ ដើម្បីបញ្ជាក់វត្តមានពីចម្ងាយយ៉ាងរហ័ស។
            </p>

            {/* Chat list history scroll window style */}
            <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4 h-48 overflow-y-auto flex flex-col gap-3 font-sans scrollbar-none" id="telegram_chat_window">
              {telegramLogs.map((log, index) => (
                <div key={index} className={`flex flex-col max-w-[85%] ${log.sender === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${log.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-850 text-slate-100 rounded-bl-none border border-slate-800'}`}>
                    {log.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">{log.time} {log.sender === 'user' ? '• Sent (User)' : '• Bot Response'}</span>
                </div>
              ))}
              
              {isTelegramSending && (
                <div className="text-[10px] text-indigo-400 italic animate-pulse flex items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400"></span>
                  </span>
                  SecureAttend Bot កំពុងឆ្លើយតប...
                </div>
              )}
            </div>

            {/* Simulated Chat input */}
            <form onSubmit={handleTelegramSend} className="flex gap-2 mt-3">
              <input 
                type="text" 
                value={telegramCommand}
                onChange={(e) => setTelegramCommand(e.target.value)}
                placeholder="បញ្ជូនពាក្យបញ្ជាទៅកាន់ Bot (ឧទាហរណ៍៖ /checkin 123456)" 
                className="flex-1 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 outline-none font-sans transition-all"
                id="telegram_input_field"
              />
              <button 
                type="submit"
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center justify-center shrink-0 shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Quick click suggestions */}
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {[
                { label: '/start (ចាប់ផ្ដើមប៊ូត)', cmd: '/start' },
                { label: '/checkin 123456 (Sok Chea)', cmd: '/checkin 123456' },
                { label: '/status (របាយការណ៍សង្ខេប)', cmd: '/status' }
              ].map((s, idx) => (
                <button 
                  key={idx}
                  type="button"
                  onClick={() => setTelegramCommand(s.cmd)}
                  className="text-[9px] font-bold font-mono bg-slate-900 border border-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 px-2 py-1 rounded-lg transition"
                >
                  {s.label}
                </button>
              ))}
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: DETAILED BACKEND HR ADMINISTRATION AND PAYROLL MODULES */}
        <div className="lg:col-span-7 flex flex-col gap-8" id="management_portal_outer">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl relative flex flex-col h-full" id="management_portal_card">
            
            {/* Elegant Tab Headings switcher */}
            <div className="p-6 bg-gradient-to-b from-slate-850 to-slate-900 border-b border-slate-800 rounded-t-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Landmark className="w-5.5 h-5.5 text-indigo-400 shrink-0" />
                    ផ្នែកគ្រប់គ្រងវត្តមាន និងប្រាក់បៀវត្សរ៍ HR (Back-Office Dashboard)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ចាក់សោរព័ត៌មានបុគ្គលិក អនុម័តច្បាប់ឈប់សម្រាក និង Ledger ស្វ័យប្រវត្តក្នុងតំបន់
                  </p>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setShowRegModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white px-4 py-2.5 transition flex items-center gap-1.5 border-t border-indigo-400/25 shadow-lg shadow-indigo-600/10 cursor-pointer"
                    id="register_employee_btn"
                  >
                    <UserPlus className="w-4 h-4" /> បន្ថែមបុគ្គលិកថ្មី
                  </button>
                </div>
              </div>

              {/* Dynamic horizontal navigation tabs for admin view */}
              <div className="flex items-center gap-2 mt-6 overflow-x-auto scrollbar-none border-b border-slate-800/80 pb-1">
                {[
                  { id: 'OVERVIEW', label: '📊 បូកសរុប (Overview)' },
                  { id: 'LOGS', label: '📋 កំណត់ត្រាវត្តមាន (Attendance Logs)' },
                  { id: 'LEAVES', label: '📝 សំណើច្បាប់ (Leave Requests)' },
                  { id: 'PAYROLL', label: '💵 បើកប្រាក់បៀវត្សរ៍ (Payroll Ledger)' },
                  { id: 'OFFICE_QR', label: '📷 បង្កើតកូដ QR ក្រុមហ៊ុន (Office QR)' }
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setHrActiveTab(th.id as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition shrink-0 ${hrActiveTab === th.id ? 'bg-slate-950 text-indigo-400 border border-slate-800 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 flex-1">
              
              {/* TAB CONTAINER 1: OVERVIEW & INSIGHTS */}
              {hrActiveTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  
                  {/* Quick dynamic cards of top employees attendance list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* card left: Live lookup searching and directory */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2">
                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1">
                          <Users className="w-4 h-4 text-indigo-400" />
                          បញ្ជីឈ្មោះបុគ្គលិក ({filteredEmployees.length} នាក់)
                        </h4>
                      </div>
                      
                      <div className="relative mb-3">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="ស្វែងរកតាមឈ្មោះ ឬឈ្មោះផ្នែក..."
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none text-slate-200 focus:border-indigo-500 transition-all"
                        />
                      </div>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-none">
                        {filteredEmployees.length === 0 ? (
                          <div className="text-[11px] text-slate-500 py-4 text-center italic">មិនមានទិន្នន័យស្វែងរក</div>
                        ) : (
                          filteredEmployees.map(emp => (
                            <div 
                              onClick={() => setSelectedEmployee(emp)}
                              key={emp.id} 
                              className={`p-2 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${selectedEmployee?.id === emp.id ? 'bg-indigo-500/10 border-indigo-505/40' : 'bg-slate-900/60 border-slate-850 hover:bg-slate-850/40'}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-900/40 border border-indigo-500/20 flex items-center justify-center font-bold text-[9px] uppercase">
                                  {emp.full_name_en.substring(0, 2)}
                                </div>
                                <div className="text-left">
                                  <div className="font-bold text-slate-200 text-[11px]">{emp.full_name_kh}</div>
                                  <div className="text-[9px] text-slate-500 font-mono italic">{emp.role} • {emp.department || 'General'}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-350 font-mono">${emp.base_salary}</div>
                                <div className="text-[8px] text-amber-500 font-mono">PIN: {emp.pin_code}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* card right: analytical performance widget info */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1 text-left">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            ស្ថិតិ និងទិន្នន័យទូទៅ (Attendance Insights)
                          </h4>
                        </div>

                        <div className="space-y-2 text-left">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">អត្រា حاضرة វត្តមានសរុប (On-Time Ratio)：</span>
                            <span className="font-bold text-emerald-400">
                              {employees.length > 0 ? `${Math.round((logs.filter(l => l.status === 'ON_TIME').length / employees.length) * 100)}%` : '0%'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">អត្រាមកយឺត (Late Rate)：</span>
                            <span className="font-bold text-amber-500">
                              {employees.length > 0 ? `${Math.round((logs.filter(l => l.status === 'LATE').length / employees.length) * 100)}%` : '0%'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-400">ប្រាក់ខែមធ្យមភាគរបស់និយោជិត៖</span>
                            <span className="font-bold text-indigo-300 font-mono">
                              ${employees.length > 0 ? Math.round(employees.reduce((acc, current) => acc + current.base_salary, 0) / employees.length) : '0'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-900/10 border border-indigo-500/20 p-3 rounded-xl mt-3 text-left">
                        <div className="text-xs font-bold text-indigo-300 flex items-center gap-1 text-[11px]">
                          <Award className="w-3.5 h-3.5" /> សហការជាមួយប្រព័ន្ធរៀបចំបញ្ជី Ledger
                        </div>
                        <p className="text-[9px] text-slate-450 mt-1">
                          អត្រាវត្តមានផ្ទាល់ថ្ងៃនេះ និងកំណត់ត្រាជួយគណនាប្រាក់បៀវត្សរ៍ប្រចាំខែស្វ័យប្រវត្តិ។
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Highlights of latest logs row ticker */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4">
                    <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1 mb-3 text-left">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                      សកម្មភាពកត់វត្តមានថ្មីៗបំផុត (Recent Activity Logs Feed)
                    </h4>

                    <div className="space-y-1.5">
                      {logs.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-900/50 rounded-xl border border-slate-850 flex items-center justify-between text-left text-xs text-slate-300">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-205">{item.employee_name}</span>
                            <span className="block text-[9px] text-slate-500 font-mono">វិធីសាស្ត្រ៖ {item.method} • Geofence {item.geofence_ok ? 'OK' : 'Out'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-[10px] text-indigo-300">{new Date(item.check_in_time).toLocaleTimeString('kh-KH')}</span>
                            <span className={`block text-[8px] font-bold mt-0.5 ${item.status === 'ON_TIME' ? 'text-emerald-400' : 'text-amber-500'}`}>{item.status === 'ON_TIME' ? 'ទាន់ម៉ោង' : 'មកយឺត/Late'}</span>
                          </div>
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <p className="text-center italic text-xs text-slate-500 py-3">មិនទាន់មានសកម្មភាពសម្រាប់ថ្ងៃនេះនៅឡើយទេ</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB CONTAINER 2: DETAILED ATTENDANCE STATS TABLE */}
              {hrActiveTab === 'LOGS' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-850">
                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                      តារាងរបាយការណ៍វត្តមាន និងវិធីសាស្ត្រផ្ទៀងផ្ទាត់
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold font-mono uppercase bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">សរុប៖ {logs.length} កំណត់ត្រា</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-850 rounded-2xl shadow">
                    <table className="w-full text-left text-xs text-slate-350 min-w-[550px]" id="logs_table">
                      <thead className="bg-slate-950 font-bold text-slate-400 border-b border-slate-850">
                        <tr>
                          <th className="p-3.5">និយោជិត / Employee</th>
                          <th className="p-3.5">ម៉ោងវាយកាត / Check-In Time</th>
                          <th className="p-3.5">វិធីសាស្ត្រផ្ទៀងផ្ទាត់ / Tool</th>
                          <th className="p-3.5 text-center">តំបន់ Geofence</th>
                          <th className="p-3.5 text-center">អត្តសញ្ញាណ Face AI</th>
                          <th className="p-3.5">ស្ថានភាព / Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 bg-slate-900/20">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500 italic font-medium">
                              មិនទាន់មានទិន្នន័យវាយកាតនាពេលនេះឡើយ។
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => {
                            const checkTime = new Date(log.check_in_time);
                            return (
                              <tr key={log.id} className="hover:bg-slate-850/40 transition">
                                <td className="p-3.5">
                                  <div className="font-bold text-slate-100 text-xs">{log.employee_name}</div>
                                  <div className="text-[9px] text-slate-500 font-mono uppercase">ID: {log.id.substring(0, 8)}...</div>
                                </td>
                                <td className="p-3.5 font-mono">
                                  <div className="text-xs text-slate-300">{checkTime.toLocaleDateString('kh-KH')}</div>
                                  <div className="text-[10px] text-indigo-300 font-bold mt-0.5">{checkTime.toLocaleTimeString('kh-KH')}</div>
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${log.method === 'GPS' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : log.method === 'FACE' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : log.method === 'QR' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800 text-slate-350 border-slate-700'}`}>
                                    {log.method}
                                  </span>
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${log.geofence_ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${log.geofence_ok ? 'bg-emerald-400' : 'bg-red-400 animate-ping'}`} />
                                    {log.geofence_ok ? 'ក្នុងរង្វង់' : 'ក្រៅតំបន់'}
                                  </span>
                                </td>
                                <td className="p-3.5 text-center">
                                  {log.method === 'FACE' ? (
                                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${log.photo_matched ? 'bg-emerald-900/25 text-emerald-400' : 'bg-red-950/25 text-red-400'}`}>
                                      {log.face_matching_score ? `${log.face_matching_score}% OK` : 'Verified'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 font-mono">-</span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${log.status === 'ON_TIME' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                    {log.status === 'ON_TIME' ? 'មកទាន់ម៉ោង' : 'មកយឺត/Late'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB CONTAINER 3: LEAVE APPROVAL SCREEN AND MODAL INTENT */}
              {hrActiveTab === 'LEAVES' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-2xl border border-slate-850">
                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      បញ្ជីសំណើសុំច្បាប់សម្រាករបស់និយោជិត
                    </h4>
                    
                    <button
                      onClick={() => setShowLeaveModal(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-xl"
                      id="submit_leave_intent_btn"
                    >
                      + បង្កើតសំណើផ្ទាល់ខ្លួន
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-850 rounded-2xl shadow">
                    <table className="w-full text-left text-xs text-slate-350 min-w-[550px]" id="leaves_table">
                      <thead className="bg-slate-950 font-bold text-slate-400 border-b border-slate-850">
                        <tr>
                          <th className="p-3.5">ឈ្មោះបុគ្គលិក / Staff</th>
                          <th className="p-3.5">ប្រភេទការអនុញ្ញាត</th>
                          <th className="p-3.5">កាលបរិច្ឆេទសុំច្បាប់</th>
                          <th className="p-3.5">មូលហេតុការសុំច្បាប់</th>
                          <th className="p-3.5">ស្ថានភាព / Approval</th>
                          <th className="p-3.5 text-right">តួនាទីរដ្ឋបាល / Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 bg-slate-900/20">
                        {leaves.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                              មិនទាន់មានសំណើសុំច្បាប់ដាក់ចូលក្នុងប្រព័ន្ធឡើយ។
                            </td>
                          </tr>
                        ) : (
                          leaves.map((lv) => (
                            <tr key={lv.id} className="hover:bg-slate-850/40 transition">
                              <td className="p-3.5 font-bold text-slate-100">{lv.employee_name}</td>
                              <td className="p-3.5">
                                <span className="bg-slate-850 text-indigo-300 border border-slate-750 px-2.5 py-0.5 rounded text-[10px] font-bold">
                                  {lv.leave_type === 'ANNUAL' ? 'សម្រាកប្រចាំឆ្នាំ (Annual)' : lv.leave_type === 'SICK' ? 'ច្បាប់ជំងឺ' : 'ផ្ទាល់ខ្លួន'}
                                </span>
                              </td>
                              <td className="p-3.5 text-[10px] text-slate-300 leading-relaxed">
                                <div>ចាប់ពី៖ <span className="font-mono text-indigo-300">{lv.start_date}</span></div>
                                <div className="mt-0.5">ដល់៖ <span className="font-mono text-indigo-300">{lv.end_date}</span></div>
                              </td>
                              <td className="p-3.5 text-[11px] text-slate-400 max-w-[160px] truncate" title={lv.reason}>
                                {lv.reason}
                              </td>
                              <td className="p-3.5">
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${lv.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : lv.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'}`}>
                                  {lv.status === 'APPROVED' ? 'បានយល់ព្រម' : lv.status === 'REJECTED' ? 'បដិសេធ' : 'កំពុងរង់ចាំ (Pending)'}
                                </span>
                              </td>
                              <td className="p-3.5 text-right">
                                {lv.status === 'PENDING' ? (
                                  <div className="flex gap-1.5 justify-end">
                                    <button
                                      onClick={() => handleUpdateLeave(lv.id, 'APPROVED')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-[10px] text-white font-bold transition flex items-center gap-0.5 shadow-sm cursor-pointer"
                                      id={`approve_btn_${lv.id}`}
                                    >
                                      <Check className="w-3 h-3" /> យល់ព្រម
                                    </button>
                                    <button
                                      onClick={() => handleUpdateLeave(lv.id, 'REJECTED')}
                                      className="px-2.5 py-1 bg-red-950/80 border border-red-500/30 hover:bg-red-900 rounded-lg text-[10px] text-red-400 font-bold transition flex items-center gap-0.5 cursor-pointer"
                                      id={`reject_btn_${lv.id}`}
                                    >
                                      ✕ បដិសេធ
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-mono italic">Processed By Admin</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB CONTAINER 4: HR MONTHLY PAYROLL FINANCE BOARD */}
              {hrActiveTab === 'PAYROLL' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-850 text-left">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-305 flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-emerald-400" />
                        បញ្ជី Ledger ប្រាក់បៀវត្សរ៍តាមតំបន់ (Enterprise Financial Ledger)
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        ប្រព័ន្ធដកប្រាក់ខែស្វ័យប្រវត្តក្នុងតំបន់ គណនា៖ <span className="font-bold text-slate-300">ប្រាក់ខែដើម + ប្រាក់លើកទឹកចិត្ត ($២/ថ្ងៃទាន់ម៉ោង) - លក្ខខណ្ឌយឺត ($៥/ម្តង)</span>
                      </p>
                    </div>
                    
                    <button
                      onClick={handleCalculatePayroll}
                      className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-xl text-white px-4 py-2.5 transition flex items-center gap-1.5 border-t border-emerald-400/25 shadow-lg shrink-0 cursor-pointer"
                      id="calc_payroll_btn"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-white animate-spin-slow" /> ប្រមូលគណនាប្រចាំខែ (Process Ledger)
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-850 rounded-2xl shadow">
                    <table className="w-full text-left text-xs text-slate-350 min-w-[550px]" id="payrolls_table">
                      <thead className="bg-slate-950 font-bold text-slate-400 border-b border-slate-850">
                        <tr>
                          <th className="p-3.5">និយោជិត / Employee</th>
                          <th className="p-3.5">ខែគណនា / Cycle</th>
                          <th className="p-3.5">ប្រាក់ខែបង្គោល / Base</th>
                          <th className="p-3.5 text-center">លើកទឹកចិត្ត / Bonus</th>
                          <th className="p-3.5 text-center">ពិន័យមកយឺត / Deduct</th>
                          <th className="p-3.5 text-center">ប្រាក់ខែសរុប / Net Salary</th>
                          <th className="p-3.5">ស្ថានភាព / Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 bg-slate-900/20">
                        {payrolls.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-500 italic font-medium">
                              មិនទាន់មានគណនីបៀវត្សរ៍ប្រចាំខែនៅឡើយទេ (សូមចុចលើប៊ូតុង &quot;ប្រមូលគណនាប្រចាំខែ&quot; ខាងលើ)።
                            </td>
                          </tr>
                        ) : (
                          payrolls.map((py) => (
                            <tr key={py.id} className="hover:bg-slate-850/40 transition">
                              <td className="p-3.5 font-bold text-slate-100">{py.employee_name}</td>
                              <td className="p-3.5 font-mono text-[11px] text-slate-450">{py.billing_month}</td>
                              <td className="p-3.5 font-mono font-bold text-slate-200">${py.base_salary.toFixed(2)}</td>
                              <td className="p-3.5 text-center font-mono text-emerald-400 font-bold font-semibold">+${py.bonuses.toFixed(2)}</td>
                              <td className="p-3.5 text-center font-mono text-amber-500 font-bold">
                                -${py.deductions.toFixed(2)}
                                <span className="block text-[9px] text-slate-500 leading-relaxed">({py.late_days} លើក)</span>
                              </td>
                              <td className="p-3.5 text-center font-mono font-black text-xs text-indigo-300 bg-indigo-500/5">
                                ${py.net_salary.toFixed(2)}
                              </td>
                              <td className="p-3.5">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${py.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
                                  💵 {py.status === 'PAID' ? 'ទូទាត់រួចរាល់' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB CONTAINER 5: OFFICE QR GENERATION */}
              {hrActiveTab === 'OFFICE_QR' && selectedTenant && (
                <div className="space-y-6">
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent pointer-events-none" />
                    <div className="flex-1 space-y-3 relative z-10">
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-indigo-400" />
                        Office Attendance QR
                      </h4>
                      <p className="text-[11px] text-slate-400 max-w-[400px]">
                        This QR code should be displayed at the office entrance. Employees will scan this code using the SecureAttend app to safely record their attendance.
                      </p>
                      
                      <div className="flex items-center gap-3 pt-3">
                        <button
                          onClick={() => generateOfficeQr(selectedTenant.id, true)}
                          className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-4 h-4" /> Regenerate Secret
                        </button>
                        {officeQrDataUrl && (
                          <a 
                            href={officeQrDataUrl} 
                            download={`Office_QR_${selectedTenant.name_en.replace(/ /g, '_')}.png`}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            Download PNG
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {officeQrDataUrl ? (
                      <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white p-4 rounded-2xl shrink-0 shadow-lg relative z-10 border-4 border-indigo-500/20">
                        <img src={officeQrDataUrl} alt="Office QR Code" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-48 h-48 bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center relative z-10">
                        <span className="text-xs text-slate-500 font-bold">No QR Generated</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </main>

      {/* SOLEMN FOOTER METADATA BRAND ACCREDITATION */}
      <footer className="border-t border-slate-900 bg-slate-950/80 mt-16 py-8 text-center" id="global_footer">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <p className="text-xs text-slate-500 font-sans tracking-wide">
            SecureAttend © 2026. Design & UX Refined for Enterprise administration in Phnom Penh, Cambodia.
          </p>
          <div className="flex justify-center flex-wrap gap-4 text-xs font-semibold text-indigo-400/80">
            <span>Khmer Standard Layout Engine</span>
            <span>•</span>
            <span>Supabase persistent state mock</span>
            <span>•</span>
            <span>Google Gemini Visio AI integration</span>
          </div>
        </div>
      </footer>

      {/* MODAL 2: FACE ENROLLMENT MODAL */}
      <AnimatePresence>
        {showFaceEnrollModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <ScanFace className="w-5 h-5 text-emerald-400" /> Face Registration
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Register biometric identity for {selectedEmployee.full_name_en}</p>
                </div>
                <button 
                  onClick={() => {
                    stopEnrollCamera();
                    setShowFaceEnrollModal(false);
                  }}
                  className="text-slate-500 hover:text-slate-300 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-4">
                {!isFaceApiLoaded ? (
                  <div className="text-sm text-slate-400 py-10">Loading Face API Models...</div>
                ) : (
                  <>
                    <div className="relative w-full max-w-[280px] h-44 bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
                      {!enrollCameraActive ? (
                        <div className="text-slate-500 flex flex-col items-center gap-2 select-none">
                          <button onClick={startEnrollCamera} className="bg-indigo-600 px-4 py-2 rounded-xl text-white font-bold text-xs">
                            Start Camera
                          </button>
                        </div>
                      ) : (
                        <>
                          <video 
                            ref={enrollVideoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover transform -scale-x-100"
                          />
                          <div className="absolute inset-x-0 bottom-3 flex justify-center z-20">
                            <button 
                              onClick={captureAndEnrollFace}
                              className="bg-emerald-600 px-5 py-2 rounded-full text-white font-bold text-xs shadow-lg"
                            >
                              Scan & Enroll Face
                            </button>
                          </div>
                        </>
                      )}
                      <canvas ref={enrollCanvasRef} className="hidden" />
                    </div>

                    {faceEnrollStatus && (
                      <div className="mt-2 text-xs font-bold text-center p-2 rounded bg-slate-900 border border-slate-800">
                        {faceEnrollStatus}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: NEW EMPLOYEE REGISTRATION ENTRY FORM */}
      <AnimatePresence>
        {showRegModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl"
              id="registration_modal_content"
            >
              <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    ចុះឈ្មោះគណនីបុគ្គលិកថ្មី (Register Employee)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">បន្ថែមទិន្នន័យដើម្បីកត់ចូលទៅកាន់លំហរស្ថាប័នសាកល្បង</p>
                </div>
                <button 
                  onClick={() => setShowRegModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRegisterEmployee} className="space-y-4 text-left">
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">គោត្តនាម-នាមខ្លួន (ភាសាខ្មែរ)*</label>
                  <input 
                    type="text" 
                    required
                    value={newEmpKh}
                    onChange={(e) => setNewEmpKh(e.target.value)}
                    placeholder="ឧទាហរណ៍៖ សុខ សាន" 
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition"
                    id="new_emp_name_kh"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Full Name (Latin English Spelling)*</label>
                  <input 
                    type="text" 
                    required
                    value={newEmpEn}
                    onChange={(e) => setNewEmpEn(e.target.value)}
                    placeholder="e.g., Sok San" 
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition"
                    id="new_emp_name_en"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">តួនាទី / Role</label>
                    <input 
                      type="text" 
                      value={newEmpRole}
                      onChange={(e) => setNewEmpRole(e.target.value)}
                      placeholder="e.g., IT Support / Teacher" 
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">ផ្នែក / Department</label>
                    <input 
                      type="text" 
                      value={newEmpDept}
                      onChange={(e) => setNewEmpDept(e.target.value)}
                      placeholder="e.g., Administration" 
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">ប្រាក់ខែបង្គោល / Base Salary ($)*</label>
                  <input 
                    type="number" 
                    required
                    value={newEmpSalary}
                    onChange={(e) => setNewEmpSalary(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-101 outline-none font-mono font-bold transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">អត្តលេខបុគ្គលិក / Employee ID*</label>
                    <input 
                      type="text" 
                      required
                      value={newEmpCode}
                      onChange={(e) => setNewEmpCode(e.target.value)}
                      placeholder="e.g., EMP003" 
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Telegram Handle ID</label>
                    <input 
                      type="text" 
                      value={newEmpTelegramId}
                      onChange={(e) => setNewEmpTelegramId(e.target.value)}
                      placeholder="e.g., @soksan_hr" 
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/40 p-2.5 border border-slate-850/60 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="new_emp_active"
                    checked={newEmpActive}
                    onChange={(e) => setNewEmpActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-800 rounded focus:ring-indigo-500 bg-slate-950 cursor-pointer"
                  />
                  <label htmlFor="new_emp_active" className="text-xs text-slate-300 font-bold cursor-pointer select-none">
                    គណនីសកម្មភាព (Active Employee Account)
                  </label>
                </div>

                {/* Simulated Biomatch scan reference photo setup */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                  <span className="block text-xs font-bold text-slate-400 mb-2">ជីវមាត្រផ្គូផ្គង (Face ID reference photo mock)</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={triggerRegistrationPhotoMock}
                      className="px-3.5 py-2 bg-indigo-500/10 border border-indigo-505/35 text-indigo-400 hover:bg-indigo-500/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" /> ថតរក្សាទុកទម្រង់គំរូផ្ទៃមុខ
                    </button>
                    
                    {newEmpPhoto ? (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> គំរូមានរួចហើយ (Ready)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">មិនទាន់មានគំរូទេ</span>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold rounded-xl text-white transition shadow-lg shadow-indigo-650/10 cursor-pointer"
                    id="submit_new_employee_form"
                  >
                    រក្សាទុកទិន្នន័យ (Save Employee Profile)
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: NEW LEAVE REQUEST MODAL */}
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl"
              id="leave_modal_content"
            >
              <div className="flex justify-between items-center border-b border-slate-850 pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    បង្កើតសំណើសុំច្បាប់ឈប់សម្រាក
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">បំពេញទិន្នន័យដើម្បីផ្ញើទៅកាន់ក្រុមការងាររដ្ឋបាលផ្ទៀងផ្ទាត់</p>
                </div>
                <button 
                  onClick={() => setShowLeaveModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRequestLeave} className="space-y-4 text-left">
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">ប្រភេទការសុំច្បាប់ (Leave Type)</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none font-bold outline-none cursor-pointer"
                    value={leaveType}
                    onChange={(e: any) => setLeaveType(e.target.value)}
                  >
                    <option value="ANNUAL">ច្បាប់សម្រាកប្រចាំឆ្នាំ (Annual Leave)</option>
                    <option value="SICK">ច្បាប់គ្រុនឈឺ (Sick Leave)</option>
                    <option value="PERSONAL">ច្បាប់កិច្ចការផ្ទាល់ខ្លួន (Personal Leave)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">ថ្ងៃចាប់ផ្តើម</label>
                    <input 
                      type="date"
                      required
                      value={leaveStart}
                      onChange={(e) => setLeaveStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-101 outline-none font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">ថ្ងៃបញ្ចប់</label>
                    <input 
                      type="date"
                      required
                      value={leaveEnd}
                      onChange={(e) => setLeaveEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-101 outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">មូលហេតុនៃការសុំច្បាប់*</label>
                  <textarea 
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    required
                    placeholder="បញ្ជាក់មូលហេតុច្បាស់លាស់សម្រាប់ Admin (e.g. ជូនក្រុមគ្រួសារទៅសម្រាកជម្ងឺ...)" 
                    className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none h-20 resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-bold rounded-xl text-white transition shadow-lg shadow-indigo-600/10 cursor-pointer"
                  >
                    បញ្ជូនសំណើសុំច្បាប់ (Submit Request)
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
