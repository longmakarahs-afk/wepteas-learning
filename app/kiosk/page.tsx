'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, Employee, AttendanceLog } from '@/lib/supabase';
import { ScanFace, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export default function KioskPage() {
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Keep focus permanently
    const interval = setInterval(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    
    const scannedCode = inputVal.trim();
    setInputVal('');
    
    // Simulate lookup across tenants for kiosk (or limit to a specific one if configured)
    const allEmployees = await db.getEmployees('default'); // Can be expanded for multi-tenant
    const foundEmp = allEmployees.find(emp => emp.nfc_tag_id === scannedCode || emp.qr_key === scannedCode || scannedCode.includes(`SECATT-EMP:${emp.employee_code}`));
    
    if (!foundEmp) {
      showError('មិនស្គាល់អត្តសញ្ញាណប័ណ្ណនេះទេ (Card / ID not recognized)');
      return;
    }

    try {
      setEmployee(foundEmp);
      // Toggle IN / OUT based on last log
      const allLogs = await db.getAttendanceLogs(foundEmp.org_id || 'default');
      const logs = allLogs.filter(l => l.employee_id === foundEmp.id);
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter(l => l.check_in_time.startsWith(today));
      
      const lastLog = todayLogs.sort((a,b) => b.check_in_time.localeCompare(a.check_in_time))[0];
      
      if (!lastLog || lastLog.check_out_time) {
        // Need to Check In
        const result = await db.checkIn({
          employee_id: foundEmp.id,
          method: 'NFC',
          geofence_ok: true,
          status: 'ON_TIME',
          photo_matched: false,
          notes: 'Kiosk NFC/RFID Check In'
        });
        showSuccess(`សួស្តី ${foundEmp.full_name_kh}។ អ្នកបានចូលធ្វើការជោគជ័យ។ (Checked IN: ${result.status})`);
      } else {
        // Need to Check Out
        await db.checkOut(foundEmp.id);
        showSuccess(`លាហើយ ${foundEmp.full_name_kh}។ អ្នកបានចេញពីកន្លែងធ្វើការជោគជ័យ។ (Checked OUT)`);
      }
    } catch (err: any) {
      showError(`បញ្ហាប្រតិបត្តិការ៖ ${err.message}`);
    }
  };

  const showSuccess = (msg: string) => {
    setMessage(msg);
    setStatus('SUCCESS');
    setTimeout(() => {
      setStatus('IDLE');
      setEmployee(null);
    }, 4000);
  };

  const showError = (msg: string) => {
    setMessage(msg);
    setStatus('ERROR');
    setTimeout(() => {
      setStatus('IDLE');
      setEmployee(null);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Hidden input for USB Kiosk Keyboard emulation */}
      <form onSubmit={handleScan} className="absolute opacity-0 pointer-events-none">
        <input 
          ref={inputRef}
          type="text" 
          value={inputVal} 
          onChange={(e) => setInputVal(e.target.value)}
          autoFocus 
        />
      </form>

      <AnimatePresence mode="wait">
        {status === 'IDLE' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center space-y-6"
          >
            <div className="w-32 h-32 rounded-full bg-slate-900 border-4 border-indigo-500/30 flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.2)]">
              <ScanFace className="w-16 h-16 text-indigo-400 animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-100 tracking-tight text-center">
              ប្រព័ន្ធស្កែនវត្តមាន
            </h1>
            <p className="text-xl text-slate-400 font-mono tracking-widest uppercase">
              Please present your card
            </p>
          </motion.div>
        )}

        {status === 'SUCCESS' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-emerald-950/40 border border-emerald-500/50 p-12 rounded-3xl flex flex-col items-center text-center max-w-2xl shadow-[0_0_80px_rgba(16,185,129,0.2)]"
          >
            <CheckCircle className="w-24 h-24 text-emerald-400 mb-6" />
            <h2 className="text-3xl font-bold text-emerald-100 mb-2 leading-snug">
              {message}
            </h2>
            {employee && (
              <div className="mt-4 flex flex-col items-center">
                <span className="text-sm font-bold text-emerald-500/70 uppercase tracking-widest font-mono bg-emerald-950 px-3 py-1 rounded border border-emerald-500/30 mb-2">
                  {employee.role}
                </span>
                <p className="text-xl text-emerald-400 font-medium">{employee.full_name_kh}</p>
              </div>
            )}
          </motion.div>
        )}

        {status === 'ERROR' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-rose-950/40 border border-rose-500/50 p-12 rounded-3xl flex flex-col items-center text-center max-w-xl shadow-[0_0_80px_rgba(244,63,94,0.2)]"
          >
            <AlertTriangle className="w-24 h-24 text-rose-400 mb-6" />
            <h2 className="text-2xl font-bold text-rose-100 leading-snug">
              {message}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Visual background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
    </div>
  );
}
