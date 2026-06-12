'use client';

import React, { useState, useEffect } from 'react';
import { db, Organization } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  KeyRound, 
  Plus, 
  Check, 
  Copy, 
  Lock, 
  Eye, 
  EyeOff, 
  Settings, 
  MapPin, 
  Fingerprint, 
  QrCode, 
  Wifi, 
  Layers,
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';

export default function OwnerPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('owner_authenticated') === 'true';
    }
    return false;
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [ownerPassword, setOwnerPassword] = useState<string>('owner123');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Form states for creating/editing an organization
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [newOrgSlug, setNewOrgSlug] = useState<string>('');
  const [newAdminPassword, setNewAdminPassword] = useState<string>('admin');
  const [newGeofenceLat, setNewGeofenceLat] = useState<number>(11.5645);
  const [newGeofenceLng, setNewGeofenceLng] = useState<number>(104.9123);
  const [newGeofenceRadius, setNewGeofenceRadius] = useState<number>(150);

  // Check auth and fetch orgs
  useEffect(() => {
    const checkPassword = () => {
      if (typeof window !== 'undefined') {
        const envVal = process.env.OWNER_PASSWORD || 'owner123';
        setOwnerPassword(envVal);
      }
    };
    checkPassword();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrgs();
    }
  }, [isAuthenticated]);

  const loadOrgs = () => {
    setLoading(true);
    db.getOrganizations()
      .then(data => {
        setOrgs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load organizations', err);
        setLoading(false);
      });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ownerPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('owner_authenticated', 'true');
      setErrorMsg('');
    } else {
      setErrorMsg('លេខសម្ងាត់ភ្នាក់ងារមិនត្រឹមត្រូវទេ! (Incorrect Owner Password)');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('owner_authenticated');
    setPasswordInput('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => {
      setCopyStatus(null);
    }, 2000);
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newOrgSlug) {
      alert('សូមបំពេញឈ្មោះ និង Sluggish ID');
      return;
    }

    try {
      const created = await db.addOrganization({
        slug: newOrgSlug,
        name: newOrgName,
        admin_password: newAdminPassword,
        geofence: {
          lat: Number(newGeofenceLat),
          lng: Number(newGeofenceLng),
          radius_meters: Number(newGeofenceRadius)
        },
        payroll: {
          salary_style: 'fixed',
          deduction_rate_late: 2.50,
          deduction_rate_absent: 15.00
        },
        qr_secret: sha256(`sec-secret-${newOrgSlug}`),
        attendance_methods: {
          gps: true,
          face: true,
          qr: true,
          nfc: true,
          pin: true
        }
      });

      // Clear states
      setNewOrgName('');
      setNewOrgSlug('');
      setNewAdminPassword('admin');
      setIsCreateOpen(false);
      loadOrgs();
    } catch (err) {
      console.error('Failed creating org', err);
      alert('Error creating organization.');
    }
  };

  const handleToggleMethod = async (org: Organization, method: 'gps' | 'face' | 'qr' | 'nfc' | 'pin') => {
    const currentMethods = org.attendance_methods || { gps: true, face: true, qr: true, nfc: true, pin: true };
    const updatedMethods = {
      ...currentMethods,
      [method]: !currentMethods[method]
    };

    try {
      await db.updateOrganization(org.id, {
        attendance_methods: updatedMethods
      });
      loadOrgs();
    } catch (err) {
      console.error('Failed toggle method', err);
    }
  };

  const handleUpdateAdminPassword = async (orgId: string, value: string) => {
    if (!value) return;
    try {
      await db.updateOrganization(orgId, { admin_password: value });
      loadOrgs();
    } catch (err) {
      console.error('Failed update password', err);
    }
  };

  // Simple pure JS sha256 helper matching supabase.ts
  function sha256(ascii: string): string {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans tracking-tight">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#020617_1px,transparent_1px),linear-gradient(to_bottom,#020617_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div 
            key="login-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-center min-h-screen p-4 relative z-10"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />

              <div className="flex justify-center mb-6">
                <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                  <Lock className="w-8 h-8" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Owner Portal
                </h1>
                <p className="text-slate-400 text-sm mt-2">
                  SecureAttend Platform Master Management
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-2">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter master key..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-4 pr-12 py-3.5 text-slate-100 font-mono tracking-widest outline-none transition duration-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-50 relative z-20"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5 text-slate-400" /> : <Eye className="w-5 h-5 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-red-400 text-xs font-medium text-center bg-red-950/20 py-2 border border-red-900/30 rounded-xl"
                  >
                    {errorMsg}
                  </motion.p>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] transition cursor-pointer text-white font-medium py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Authenticate Key
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-900 mb-10">
              <div>
                <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Tenant Registry Master Panel
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                  Multi-Tenant Registry
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCreateOpen(!isCreateOpen)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-4 py-2.5 rounded-2xl flex items-center gap-2 cursor-pointer transition active:scale-95 text-sm"
                >
                  <Plus className="w-4.5 h-4.5" />
                  Create Organization
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 font-medium px-4 py-2.5 rounded-2xl flex items-center gap-2 cursor-pointer transition text-sm"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  Logout
                </button>
              </div>
            </div>

            {/* Create Org Expandable Card */}
            <AnimatePresence>
              {isCreateOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:p-8 mb-10"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-lg font-bold">បង្កើតអង្គភាពថ្មី (New Organization Form)</h2>
                  </div>

                  <form onSubmit={handleCreateOrg} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={newOrgName}
                        onChange={(e) => {
                          setNewOrgName(e.target.value);
                          setNewOrgSlug(generateSlugFromName(e.target.value));
                        }}
                        placeholder="e.g. Bak Touk Academy"
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Organization Slash/Slug ID
                      </label>
                      <input
                        type="text"
                        value={newOrgSlug}
                        onChange={(e) => setNewOrgSlug(e.target.value)}
                        placeholder="e.g. baktouk"
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition font-mono text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Admin Panel Password
                      </label>
                      <input
                        type="text"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Default admin password"
                        className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition font-mono text-sm"
                        required
                      />
                    </div>

                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Office GPS Latitude
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={newGeofenceLat}
                          onChange={(e) => setNewGeofenceLat(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition font-mono text-sm"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Office GPS Longitude
                        </label>
                        <input
                          type="number"
                          step="0.000001"
                          value={newGeofenceLng}
                          onChange={(e) => setNewGeofenceLng(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition font-mono text-sm"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Geofence scanning radius (meters)
                        </label>
                        <input
                          type="number"
                          value={newGeofenceRadius}
                          onChange={(e) => setNewGeofenceRadius(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 outline-none transition font-mono text-sm"
                          required
                        />
                      </div>
                    </div>

                    <div className="md:col-span-3 flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsCreateOpen(false)}
                        className="bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 px-5 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition"
                      >
                        Save Organization
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Organizations Directory */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-slate-400 text-sm">កំពុងទាញយកទិន្នន័យ... (Fetching organizations...)</p>
              </div>
            ) : orgs.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl">
                <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">មិនមានទិន្នន័យអង្គភាពទេ! (No organizations created yet)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8">
                {orgs.map((org) => {
                  const clientUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}/?org=${org.slug}`
                    : `/?org=${org.slug}`;
                  const adminUrl = typeof window !== 'undefined'
                    ? `${window.location.origin}/admin?org=${org.slug}`
                    : `/admin?org=${org.slug}`;

                  const methods = org.attendance_methods || { gps: true, face: true, qr: true, nfc: true, pin: true };

                  return (
                    <div 
                      key={org.id}
                      className="bg-slate-900/25 border border-slate-900 rounded-3xl p-6 md:p-8 hover:border-slate-800 transition duration-300 relative overflow-hidden"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        {/* Title & Slug Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5.5 h-5.5 text-indigo-400" />
                            <h3 className="text-xl font-bold text-slate-100">{org.name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-slate-950 font-mono border border-slate-850 px-2.5 py-1 rounded-lg text-slate-400">
                              slug: {org.slug}
                            </span>
                            <span className="text-xs bg-indigo-950/40 text-indigo-400 font-mono border border-indigo-900/30 px-2.5 py-1 rounded-lg">
                              id: {org.id.split('-')[0]}...
                            </span>
                          </div>
                        </div>

                        {/* Admin Settings in Column */}
                        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-900 flex flex-wrap md:flex-nowrap items-center gap-6">
                          <div className="flex items-center gap-2.5">
                            <KeyRound className="w-4 h-4 text-slate-400" />
                            <div className="text-xs">
                              <div className="text-slate-500 font-bold uppercase tracking-wider">Admin Password</div>
                              <input
                                type="text"
                                defaultValue={org.admin_password || 'admin'}
                                onBlur={(e) => handleUpdateAdminPassword(org.id, e.target.value)}
                                className="bg-transparent font-mono text-slate-100 outline-none border-b border-transparent focus:border-indigo-500 text-sm py-0.5 mt-0.5"
                              />
                            </div>
                          </div>

                          <div className="h-8 w-px bg-slate-900 hidden md:block" />

                          <div className="flex items-center gap-2.5">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <div className="text-xs">
                              <div className="text-slate-500 font-bold uppercase tracking-wider">Geofence (office)</div>
                              <div className="text-slate-300 font-mono mt-0.5 whitespace-nowrap">
                                {org.geofence?.lat.toFixed(4)}, {org.geofence?.lng.toFixed(4)} ({org.geofence?.radius_meters}m)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* URL Linking tools */}
                      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Mobile Check-In App Link */}
                        <div className="bg-slate-950 rounded-2xl p-4.5 border border-slate-900 flex items-center justify-between gap-4">
                          <div className="truncate">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">
                              Mobile Check-In App Link
                            </div>
                            <div className="truncate font-mono text-xs text-slate-400">
                              {clientUrl}
                            </div>
                          </div>

                          <button
                            onClick={() => handleCopy(clientUrl, `${org.id}-client`)}
                            className="p-2.5 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-850 text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            {copyStatus === `${org.id}-client` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Admin Dashboard Link */}
                        <div className="bg-slate-950 rounded-2xl p-4.5 border border-slate-900 flex items-center justify-between gap-4">
                          <div className="truncate">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">
                              Admin Dashboard Link
                            </div>
                            <div className="truncate font-mono text-xs text-slate-400">
                              {adminUrl}
                            </div>
                          </div>

                          <button
                            onClick={() => handleCopy(adminUrl, `${org.id}-admin`)}
                            className="p-2.5 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-850 text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            {copyStatus === `${org.id}-admin` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Attendance Toggles */}
                      <div className="mt-8 border-t border-slate-900 pt-6">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                          កែសម្រួលវិធីសាស្ត្រចុះឈ្មោះវត្តមាន (Authorized Entry Channels)
                        </div>

                        <div className="flex flex-wrap gap-4">
                          {/* GPS Tab */}
                          <button
                            onClick={() => handleToggleMethod(org, 'gps')}
                            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition cursor-pointer ${
                              methods.gps
                                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                                : 'bg-slate-950 border-slate-900 text-slate-500'
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                            GPS Position ({methods.gps ? 'ACTIVE' : 'OFF'})
                          </button>

                          {/* FACE Verification */}
                          <button
                            onClick={() => handleToggleMethod(org, 'face')}
                            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition cursor-pointer ${
                              methods.face
                                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                                : 'bg-slate-950 border-slate-900 text-slate-500'
                            }`}
                          >
                            <Fingerprint className="w-4 h-4" />
                            Face verification ({methods.face ? 'ACTIVE' : 'OFF'})
                          </button>

                          {/* QR Authentication */}
                          <button
                            onClick={() => handleToggleMethod(org, 'qr')}
                            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition cursor-pointer ${
                              methods.qr
                                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                                : 'bg-slate-950 border-slate-900 text-slate-500'
                            }`}
                          >
                            <QrCode className="w-4 h-4" />
                            Encrypted QR ({methods.qr ? 'ACTIVE' : 'OFF'})
                          </button>

                          {/* NFC Identification */}
                          <button
                            onClick={() => handleToggleMethod(org, 'nfc')}
                            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition cursor-pointer ${
                              methods.nfc
                                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                                : 'bg-slate-950 border-slate-900 text-slate-500'
                            }`}
                          >
                            <Wifi className="w-4 h-4" />
                            RFID / NFC Tap ({methods.nfc ? 'ACTIVE' : 'OFF'})
                          </button>

                          {/* PIN Protection */}
                          <button
                            onClick={() => handleToggleMethod(org, 'pin')}
                            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition cursor-pointer ${
                              methods.pin
                                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                                : 'bg-slate-950 border-slate-900 text-slate-500'
                            }`}
                          >
                            <Layers className="w-4 h-4" />
                            Keyboard PIN ({methods.pin ? 'ACTIVE' : 'OFF'})
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
