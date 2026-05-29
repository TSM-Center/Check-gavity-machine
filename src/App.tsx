/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XOctagon, 
  CalendarDays, 
  Search,
  Thermometer,
  Clock,
  Building2,
  BarChart3,
  List,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Upload,
  FileSpreadsheet,
  Link as LinkIcon,
  PlusCircle,
  Save,
  Lock,
  UserCircle,
  Eye,
  EyeOff,
  LogOut,
  X,
  Printer,
  Download
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from './lib/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'overview' | 'monthly' | 'import' | 'entry'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('All');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [appData, setAppData] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });
  
  const [dbStatus, setDbStatus] = useState<{message: string; isError: boolean} | null>(null);

  React.useEffect(() => {
    if (supabase) {
      const fetchSupabaseData = async () => {
        try {
          const { data, error } = await supabase.from('cssd_records').select('*').order('id', { ascending: false });
          if (error) throw error;
          if (data) {
             setAppData(data);
             setDbStatus({ message: 'เชื่อมต่อ Supabase สำเร็จแล้ว', isError: false });
          }
        } catch (err: any) {
          console.error("Supabase Error:", err);
          setDbStatus({ message: `ข้อผิดพลาดเชื่อมต่อ Supabase: ${err.message}. กรุณาสร้างตาราง 'cssd_records' หรือกดยอมรับใน AI Studio. ตอนนี้กำลังใช้ LocalStorage แทน.`, isError: true });
        }
      };
      fetchSupabaseData();
    } else {
      setDbStatus({ message: 'ยังไม่ได้เชื่อมต่อ Supabase (จำกัดการทำงานที่ LocalStorage) โปรดกำหนดตัวแปร VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY', isError: true });
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('app_data', JSON.stringify(appData));
  }, [appData]);
  const fileInputRef = useRef<HTMLInputElement>(null);

   // Admin and Auth states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Public Views Tracking
  const [publicViews, setPublicViews] = useState(() => {
    const saved = localStorage.getItem('public_views');
    const current = saved ? parseInt(saved, 10) : 0;
    const incremented = current + 1;
    localStorage.setItem('public_views', incremented.toString());
    return incremented;
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const secureUsername = import.meta.env.VITE_ADMIN_USERNAME || 'admin';
    const securePassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    if (loginForm.username === secureUsername && loginForm.password === securePassword) {
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setLoginError('');
      setLoginForm({ username: '', password: '' });
      setShowPassword(false);
    } else {
      setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    if (activeTab === 'import' || activeTab === 'entry') {
      setActiveTab('dashboard');
    }
  };

  // Import states
  const [importType, setImportType] = useState<'file' | 'sheet'>('file');
  const [sheetUrl, setSheetUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  // Form states
  const [entrySuccess, setEntrySuccess] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    unit: '',
    temperature: 121,
    sterilizationTime: 45,
    dryingTime: 30,
    externalIndicator: 'ผ่าน',
    internalIndicator: 'ผ่าน',
    biologicalIndicator: '-',
    reader1: '',
    reader2: ''
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = new Date(formData.date);
    // Keep 543 logic consistent with how user imported data or mock data might render,
    // actually, let's just use the selected year formatted without 543 or with, the import parses Date from Excel.
    // The previous mockData was generating d/M/YYYY
    const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() > 2500 ? d.getFullYear() : d.getFullYear() + 543}`;
    const timestamp = `${dateStr} ${formData.time}:00`;

    const newRecord = {
      id: `REC-${Date.now()}`,
      timestamp,
      date: dateStr,
      unit: formData.unit || 'อื่น ๆ',
      temperature: Number(formData.temperature),
      sterilizationTime: Number(formData.sterilizationTime) || null,
      dryingTime: Number(formData.dryingTime) || null,
      externalIndicator: formData.externalIndicator as any,
      internalIndicator: formData.internalIndicator as any,
      biologicalIndicator: formData.biologicalIndicator as any,
      reader1: formData.reader1,
      reader2: formData.reader2,
    };

    const saveRecord = async () => {
      if (supabase && !dbStatus?.isError) {
        try {
          const { error } = await supabase.from('cssd_records').insert([newRecord]);
          if (error) {
            console.error('Supabase Error', error);
            alert(`ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้: ${error.message}\n(โปรดตรวจสอบ RLS Policy ใน Supabase ว่าตั้งค่าให้อนุญาตการ Insert/Select สาธาณะหรือไม่)`);
          }
        } catch (err: any) {
          console.error('Failed to save to Supabase', err);
          alert(`เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล: ${err.message}`);
        }
      }
      setAppData(prev => [newRecord, ...prev]);
      setEntrySuccess(true);
      setTimeout(() => setEntrySuccess(false), 3000);
    };
    saveRecord();
  };

  const processImportedData = (data: any[]) => {
    const formattedData = data.map((row, index) => {
      const getVal = (keywords: string[]) => {
        const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
        return key ? row[key] : undefined;
      };

      let dateStr = getVal(['วันที่', 'date', 'timestamp', 'เวลา']) || '';
      const unit = getVal(['หน่วยงาน', 'unit', 'รพ.สต.', 'สาขา']) || 'ไม่ระบุหน่วยงาน';
      const temp = getVal(['อุณหภูมิ', 'temperature', 'temp']);
      const stzTime = getVal(['เวลาสเตอริไรซ์', 'sterilization', 'ฆ่าเชื้อ']) || '';
      const dryTime = getVal(['เวลาอบแห้ง', 'drying', 'อบแห้ง']) || '';
      
      const parseIndicator = (val: any) => {
        if (!val) return '-';
        const s = String(val).trim().toLowerCase();
        if (s.includes('ไม่ผ่าน') || s === 'fail' || s === 'false' || s.includes('not pass')) return 'ไม่ผ่าน';
        if (s.includes('ผ่าน') || s === 'pass' || s === 'true' || s === 'ok') return 'ผ่าน';
        return s || '-';
      };

      const ext = parseIndicator(getVal(['ตัวชี้วัดภายนอก', 'external', 'ext', 'เคมีภายนอก']));
      const int = parseIndicator(getVal(['ตัวชี้วัดภายใน', 'internal', 'int', 'เคมีภายใน']));
      const bio = parseIndicator(getVal(['ตัวชี้วัดทางชีวภาพ', 'biological', 'bio', 'ชีวภาพ']));
      
      const r1 = getVal(['ผู้อ่านผลคนที่ 1', 'ผู้อ่านผลคนที่1', 'reader1', 'ชื่อผู้อ่าน']) || '';
      const r2 = getVal(['ผู้อ่านผลคนที่ 2', 'ผู้อ่านผลคนที่2', 'reader2']) || '';

      if (typeof dateStr === 'number') {
        const d = XLSX.SSF.parse_date_code(dateStr);
        if (d) {
          const hasTime = d.H !== 0 || d.M !== 0 || d.S !== 0;
          dateStr = `${d.d}/${d.m}/${d.y > 2500 ? d.y : d.y + 543}${hasTime ? ` ${d.H.toString().padStart(2, '0')}:${d.M.toString().padStart(2, '0')}:${d.S.toString().padStart(2, '0')}` : ''}`;
        }
      } else {
         dateStr = String(dateStr);
      }
      
      // Extract just the date part for 'date' field
      let pureDate = String(dateStr).split(' ')[0];
      if (pureDate.includes('T')) {
          pureDate = pureDate.split('T')[0];
      }

      return {
        id: getVal(['รหัส', 'id']) || `IMP-${Date.now()}-${index}`,
        timestamp: String(dateStr),
        date: pureDate,
        unit: String(unit).trim(),
        temperature: temp !== undefined && temp !== '' ? Number(temp) : null,
        sterilizationTime: stzTime !== undefined && stzTime !== '' ? Number(stzTime) : null,
        dryingTime: dryTime !== undefined && dryTime !== '' ? Number(dryTime) : null,
        externalIndicator: ext as any,
        internalIndicator: int as any,
        biologicalIndicator: bio as any,
        reader1: String(r1).trim(),
        reader2: String(r2).trim(),
      };
    });

    const saveImportedData = async () => {
      // Finding existing logic locally first is fine, but realistically we should insert to Supabase.
      // Easiest is to save everything or use onConflict, but since this is mock logic we'll just insert non-duplicates.
      setAppData(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = formattedData.filter(d => !existingIds.has(d.id));
          
          if (supabase && !dbStatus?.isError && newItems.length > 0) {
            supabase.from('cssd_records').insert(newItems).then(({error}) => {
              if (error) {
                console.error('Supabase import error', error);
                alert(`ไม่สามารถนำเข้าข้อมูลลงฐานข้อมูลได้: ${error.message}`);
              }
            });
          }

          return [...newItems, ...prev];
      });
      
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
      setSheetUrl('');
    };
    saveImportedData();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        processImportedData(data);
      } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSheetImport = async () => {
    if (!sheetUrl) return;
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = match ? match[1] : null;
    if (!sheetId) {
        alert('URL ไม่ถูกต้อง โปรดตรวจสอบว่าใช่ URL ของ Google Sheets หรือไม่');
        return;
    }
    setIsImporting(true);
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const csvText = await response.text();
        const wb = XLSX.read(csvText, { type: 'string' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        processImportedData(data);
    } catch (error) {
        console.error(error);
        alert('เกิดข้อผิดพลาด โปรดตรวจสอบว่าแชร์แบบ "ทุกคนที่มีลิงก์ (Anyone with the link)" หรือยัง');
    } finally {
        setIsImporting(false);
    }
  };

  const toggleMonth = (unit: string, monthKey: string) => {
    const key = `${unit}-${monthKey}`;
    const newSet = new Set(expandedMonths);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedMonths(newSet);
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map(record => ({
      "ลำดับ": record.id,
      "ประทับเวลา / วันที่": record.timestamp,
      "หน่วยงาน": record.unit,
      "อุณหภูมิ (°C / °F)": record.temperature !== null ? record.temperature : '-',
      "เวลาสเตอริไรซ์ (นาที)": record.sterilizationTime || '-',
      "เวลาอบแห้ง (นาที)": record.dryingTime || '-',
      "เคมีภายนอก (Ext)": record.externalIndicator,
      "เคมีภายใน (Int)": record.internalIndicator,
      "ชีวภาพ (Bio)": record.biologicalIndicator,
      "ผู้อ่านคนที่ 1": record.reader1 || '-',
      "ผู้อ่านคนที่ 2": record.reader2 || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CSSD_Report");
    
    // Auto-size columns slightly
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, 
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];

    const fileName = selectedUnit === 'All' ? 'CSSD_Report_All.xlsx' : `CSSD_Report_${selectedUnit}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Derive unique units for the filter dropdown
  const units = useMemo(() => {
    const uniqueUnits = new Set(appData.map(d => d.unit));
    return ['All', ...Array.from(uniqueUnits)].sort();
  }, [appData]);

  // Filter data for list view
  const filteredData = useMemo(() => {
    return appData.filter(record => {
      const matchesSearch = record.unit.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUnit = selectedUnit === 'All' || record.unit.toLowerCase().includes(selectedUnit.toLowerCase());
      return matchesSearch && matchesUnit;
    });
  }, [appData, searchTerm, selectedUnit]);

  // Aggregate data for monthly-unit report
  const monthlyUnitData = useMemo(() => {
    const grouped = new Map<string, Map<string, any>>();
    
    // Map to hold monthLabel for sortKey
    const monthLabels = new Map<string, string>();

    filteredData.forEach(record => {
      let m = 1;
      let y = 2566;
      
      const parts = record.date.split(/[-/]/);
      if (parts.length >= 3) {
         if (parts[0].length === 4) {
            // yyyy-mm-dd or yyyy/mm/dd
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
         } else {
            // dd/mm/yyyy or dd-mm-yyyy (Google formats mostly export as day/month/year or month/day/year depending on locale)
            // It's tricky to know if MM/DD or DD/MM, let's assume DD/MM/YYYY for Thai users
            m = parseInt(parts[1], 10);
            y = parseInt(parts[2], 10);
         }
      }

      if (isNaN(m) || m < 1 || m > 12) m = 1;
      if (isNaN(y)) y = 2566;
      
      const year = y > 2500 ? y : y + 543;
      const monthNames = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
      
      const sortKey = `${year}-${m.toString().padStart(2, '0')}`;
      const monthLabel = `${monthNames[m]} ${year}`;
      
      monthLabels.set(sortKey, monthLabel);

      if (!grouped.has(sortKey)) {
        grouped.set(sortKey, new Map());
      }
      const monthMap = grouped.get(sortKey)!;
      
      if (!monthMap.has(record.unit)) {
        monthMap.set(record.unit, {
          unit: record.unit,
          total: 0,
          passExt: 0,
          passInt: 0,
          passBio: 0,
          failInt: 0,
          records: []
        });
      }
      
      const stat = monthMap.get(record.unit)!;
      stat.total += 1;
      if (record.externalIndicator === 'ผ่าน') stat.passExt += 1;
      if (record.internalIndicator === 'ผ่าน') stat.passInt += 1;
      if (record.internalIndicator === 'ไม่ผ่าน') stat.failInt += 1;
      if (record.biologicalIndicator === 'ผ่าน') stat.passBio += 1;
      
      stat.records.push(record);
    });

    return Array.from(grouped.entries()).map(([sortKey, unitMap]) => {
      const unitsData = Array.from(unitMap.values()).sort((a, b) => a.unit.localeCompare(b.unit));
      
      // Calculate month totals
      const monthTotals = unitsData.reduce((acc, curr) => {
        acc.total += curr.total;
        acc.passExt += curr.passExt;
        acc.passInt += curr.passInt;
        acc.failInt += curr.failInt;
        acc.passBio += curr.passBio;
        return acc;
      }, { total: 0, passExt: 0, passInt: 0, failInt: 0, passBio: 0 });

      return {
        sortKey,
        monthLabel: monthLabels.get(sortKey)!,
        units: unitsData,
        totals: monthTotals
      };
    }).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [filteredData]);

  // Calculations for summary cards
  const totalRecords = filteredData.length;
  const passedInternal = filteredData.filter(r => r.internalIndicator === 'ผ่าน').length;
  const passedExternal = filteredData.filter(r => r.externalIndicator === 'ผ่าน').length;
  const passedBio = filteredData.filter(r => r.biologicalIndicator === 'ผ่าน').length;
  
  const failedInternal = filteredData.filter(r => r.internalIndicator === 'ไม่ผ่าน').length;
  const notTestedInternal = filteredData.filter(r => r.internalIndicator === '-').length;

  // Charts Data
  const chartData = useMemo(() => {
    return [
      { name: 'ผ่าน (Internal)', value: passedInternal, color: '#34d399' },
      { name: 'ไม่ผ่าน (Internal)', value: failedInternal, color: '#fb7185' },
      { name: 'ไม่ได้ระบุ/ละเว้น', value: notTestedInternal, color: '#cbd5e1' },
    ].filter(item => item.value > 0);
  }, [passedInternal, failedInternal, notTestedInternal]);

  const barChartData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredData.forEach(d => {
      counts.set(d.unit, (counts.get(d.unit) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, จำนวน: count }))
      .sort((a, b) => b.จำนวน - a.จำนวน);
  }, [filteredData]);

  // A helper to determine row status coloring
  const getStatusColor = (status: string) => {
    if (status === 'ผ่าน') return 'text-emerald-700 bg-emerald-50 ring-emerald-200 border-emerald-100';
    if (status === 'ไม่ผ่าน') return 'text-rose-700 bg-rose-50 ring-rose-200 border-rose-100';
    return 'text-slate-600 bg-slate-50 ring-slate-200 border-slate-100';
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-[#f0ebe1] sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <Activity className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-800 tracking-tight">ระบบตรวจสอบประสิทธิภาพ</h1>
              <p className="text-sm text-slate-500">งานปราศจากเชื้อของเครื่องมือแพทย์ (CSSD)</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-slate-500 text-sm">
              <Eye className="w-5 h-5 opacity-70" />
              <span>การเข้าชม: <b>{publicViews}</b></span>
            </div>
            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={async () => {
                    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดหรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)')) {
                       if (supabase && !dbStatus?.isError) {
                         try {
                           await supabase.from('cssd_records').delete().neq('id', '0');
                         } catch (err) {}
                       }
                       setAppData([]);
                       localStorage.removeItem('app_data');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-100"
                  title="ล้างข้อมูลทั้งหมด"
                >
                  ล้างข้อมูล (Clear Data)
                </button>
                <div className="flex items-center space-x-1.5 text-indigo-700 font-medium text-sm bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                  <UserCircle className="w-4 h-4" />
                  <span>Admin</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-sm font-medium rounded-lg transition-colors"
                title="ล็อคอินผู้ดูแลระบบ"
              >
                <Lock className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>
      </header>
      
      {/* Database Connection Status Banner */}
      {dbStatus && dbStatus.isError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-sm text-rose-700 font-medium flex justify-center print:hidden">
          {dbStatus.message}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-3 border-b border-[#f0ebe1] pb-4 print:hidden">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm' 
                : 'bg-white text-slate-600 border border-[#e8e4db] hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>กระดานข้อมูล (Dashboard)</span>
          </button>
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all ${
              activeTab === 'overview' 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm' 
                : 'bg-white text-slate-600 border border-[#e8e4db] hover:bg-slate-50'
            }`}
          >
            <List className="w-4 h-4" />
            <span>รายการบันทึก (Overview)</span>
          </button>
          <button 
            onClick={() => setActiveTab('monthly')} 
            className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all ${
              activeTab === 'monthly' 
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm' 
                : 'bg-white text-slate-600 border border-[#e8e4db] hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>รายงานรายหน่วยงาน/เดือน</span>
          </button>
          
          {isLoggedIn && (
            <>
              <button 
                onClick={() => setActiveTab('import')} 
                className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all ${
                  activeTab === 'import' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' 
                    : 'bg-white text-slate-600 border border-[#e8e4db] hover:bg-slate-50'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>นำเข้า (Import)</span>
              </button>
              <button 
                onClick={() => setActiveTab('entry')} 
                className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 transition-all ${
                  activeTab === 'entry' 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm' 
                    : 'bg-white text-slate-600 border border-[#e8e4db] hover:bg-slate-50'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>บันทึกข้อมูล (Entry)</span>
              </button>
            </>
          )}
        </div>

        {/* Print Title */}
        <div className="hidden print:block mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800">รายงานประสิทธิภาพงานปราศจากเชื้อของเครื่องมือแพทย์ (CSSD)</h2>
          <p className="text-lg text-slate-600 mt-2">
            หน่วยงาน: {selectedUnit === 'All' || !selectedUnit ? 'ทุกหน่วยงาน (All Units)' : selectedUnit}
          </p>
          <p className="text-sm text-slate-500 mt-1">วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</p>
        </div>

        {/* Global Filters */}
        {activeTab !== 'import' && activeTab !== 'entry' && (
        <div className="bg-white p-5 rounded-2xl border border-[#f0ebe1] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col md:flex-row gap-5 justify-between items-end md:items-center mb-2 print:hidden">
          <div className="flex flex-row items-center space-x-3 w-full md:w-auto">
            <div className="p-2 bg-purple-50 rounded-lg hidden sm:block">
              <Building2 className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex flex-col relative w-full sm:w-72">
               <label className="text-xs font-medium text-slate-500 mb-1">เลือกตามหน่วยงาน (Unit)</label>
               <input
                 type="text"
                 list="global-unit-list"
                 placeholder="พิมพ์หรือเลือกหน่วยงาน (ค้นหาจากตัวอักษร)"
                 className="block w-full px-3 py-2 text-base bg-[#fcfbf9] border border-[#e8e4db] focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 sm:text-sm rounded-xl transition-all"
                 value={selectedUnit === 'All' ? '' : selectedUnit}
                 onChange={(e) => setSelectedUnit(e.target.value || 'All')}
               />
               <datalist id="global-unit-list">
                 {units.filter(u => u !== 'All').map((unit) => (
                   <option key={unit} value={unit} />
                 ))}
               </datalist>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-80 flex flex-col">
              <label className="text-xs font-medium text-slate-500 mb-1">ค้นหาจากรหัส หรือชื่อหน่วยงาน</label>
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Search className="h-4 w-4 text-slate-300" />
                 </div>
                 <input
                   type="text"
                   placeholder="ค้นหารหัส หรือชื่อ..."
                   className="block w-full pl-9 pr-3 py-2 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 sm:text-sm transition-all placeholder-slate-400"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto mt-1 sm:mt-5 print:hidden">
              <button
                onClick={handleExportExcel}
                className="flex-1 sm:flex-none py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 h-[42px]"
                title="ดาวน์โหลด Excel"
              >
                <Download className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="font-medium text-sm hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={() => {
                  setTimeout(() => window.print(), 300);
                }}
                className="flex-1 sm:flex-none py-2 px-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 h-[42px]"
                title="พิมพ์รายงาน"
              >
                <Printer className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="font-medium text-sm">พิมพ์รายงาน</span>
              </button>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#f0f4f8] rounded-3xl p-6 border border-[#e2e8f0] flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-white rounded-2xl shadow-sm">
                     <CalendarDays className="w-5 h-5 text-blue-400" />
                   </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{totalRecords}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">จำนวนบันทึกทั้งหมด</p>
                </div>
              </div>
              
              <div className="bg-[#f0fdf4] rounded-3xl p-6 border border-[#dcfce7] flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-white rounded-2xl shadow-sm">
                     <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                   </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{passedInternal}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">ผ่านเกณฑ์เคมีภายใน</p>
                </div>
              </div>

              <div className="bg-[#fffbeb] rounded-3xl p-6 border border-[#fef3c7] flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-white rounded-2xl shadow-sm">
                     <Activity className="w-5 h-5 text-amber-400" />
                   </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{passedBio}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">ผ่านเกณฑ์ชีวภาพ</p>
                </div>
              </div>

              <div className="bg-[#fff1f2] rounded-3xl p-6 border border-[#ffe4e6] flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-white rounded-2xl shadow-sm">
                     <XOctagon className="w-5 h-5 text-rose-400" />
                   </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{failedInternal}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">ไม่ผ่านเกณฑ์เคมีภายใน</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="bg-white rounded-2xl p-6 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)] border border-[#f0ebe1]">
                  <h3 className="text-lg font-semibold text-slate-800 mb-6">อัตราการผ่านเกณฑ์เคมีภายใน</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               
               <div className="bg-white rounded-2xl p-6 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)] border border-[#f0ebe1]">
                  <h3 className="text-lg font-semibold text-slate-800 mb-6">จำนวนการบันทึกแยกตามหน่วยงาน</h3>
                  <div className="h-80 overflow-y-auto">
                    <div style={{ height: `${Math.max(250, barChartData.length * 30)}px`, minHeight: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={barChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={120} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e8e4db' }} />
                          <Bar dataKey="จำนวน" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={16}>
                             {barChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#818cf8' : '#a5b4fc'} />
                             ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        ) : activeTab === 'overview' ? (
          <>
            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)] border border-[#f0ebe1] overflow-hidden print:overflow-visible mt-6 print:shadow-none print:border-none">
               <div className="px-6 py-5 border-b border-[#f0ebe1] flex justify-between items-center bg-[#faf9f6] print:bg-white print:px-0">
                  <h2 className="text-lg font-semibold text-slate-800">
                     {selectedUnit === 'All' || !selectedUnit ? 'รายการตรวจสอบทั้งหมด' : `รายการตรวจสอบ: ${selectedUnit}`}
                  </h2>
               </div>
              <div className="overflow-x-auto print:overflow-visible flex-1">
                <table className="min-w-full divide-y divide-[#f0ebe1]">
                  <thead className="bg-[#fcfbf9]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        ประทับเวลา / วันที่
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        รพ.สต.
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <Thermometer className="w-4 h-4 text-rose-300" />
                          <span>อุณหภูมิ (°C/°F)</span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-blue-300" />
                          <span>เวลา (นาที)</span>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        ผลการทดสอบ (Indicators)
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        ผู้อ่านผล
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#f5f2eb]">
                    {filteredData.length > 0 ? (
                      filteredData.map((record) => (
                        <tr key={record.id} className="hover:bg-[#fcfbf9] transition-colors duration-150 group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-700">{record.date}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{record.timestamp.split(' ')[1]}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-purple-700 bg-purple-50 border border-purple-100 inline-flex px-3 py-1 rounded-lg">{record.unit}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                            {record.temperature !== null && record.temperature !== undefined ? record.temperature : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-[13px] text-slate-600">ฆ่าเชื้อ: <span className="font-medium">{record.sterilizationTime || '-'}</span></div>
                            <div className="text-[13px] text-slate-500 mt-0.5">อบแห้ง: <span className="font-medium">{record.dryingTime || '-'}</span></div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex flex-col space-y-1.5 items-start">
                                <div className="flex items-center space-x-2 w-full">
                                   <span className="text-[11px] text-slate-400 w-8">Ext:</span>
                                   <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getStatusColor(record.externalIndicator)}`}>
                                     {record.externalIndicator}
                                   </span>
                                </div>
                                <div className="flex items-center space-x-2 w-full">
                                   <span className="text-[11px] text-slate-400 w-8">Int:</span>
                                   <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getStatusColor(record.internalIndicator)}`}>
                                     {record.internalIndicator}
                                   </span>
                                </div>
                                <div className="flex items-center space-x-2 w-full">
                                   <span className="text-[11px] text-slate-400 w-8">Bio:</span>
                                   <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${getStatusColor(record.biologicalIndicator)}`}>
                                     {record.biologicalIndicator}
                                   </span>
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-1.5">
                                 <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">1</span>
                                 <span>{record.reader1}</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                 <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">2</span>
                                 <span>{record.reader2}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                             <XOctagon className="h-8 w-8 text-slate-300" />
                          </div>
                          <h3 className="text-sm font-medium text-slate-800">ไม่พบข้อมูล</h3>
                          <p className="mt-1 text-sm text-slate-500">ไม่พบข้อมูลสำหรับหน่วยงานที่เลือก หรือคำค้นหานี้</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-[#faf9f6] px-6 py-4 border-t border-[#f0ebe1] flex justify-between items-center text-sm text-slate-500">
                <span>แสดง {filteredData.length} รายการ</span>
              </div>
            </div>
          </>
        ) : activeTab === 'import' ? (
          <div className="bg-white rounded-2xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)] border border-[#f0ebe1] p-8 max-w-3xl mx-auto mt-6">
            <div className="text-center mb-8">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">นำเข้าข้อมูล (Import Data)</h2>
              <p className="text-slate-500 mt-2">อัปโหลดไฟล์ Excel/CSV หรือจาก Google Sheets</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  importType === 'file' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setImportType('file')}
              >
                <div className="flex items-center justify-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>ไฟล์ Excel / CSV</span>
                </div>
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  importType === 'sheet' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                onClick={() => setImportType('sheet')}
              >
                <div className="flex items-center justify-center space-x-2">
                  <LinkIcon className="w-4 h-4" />
                  <span>Google Sheets URL</span>
                </div>
              </button>
            </div>

            {importType === 'sheet' && (
              <div className="mb-6 bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                <h4 className="text-blue-800 font-semibold mb-2 flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">?</span>
                  <span>วิธีนำเข้าข้อมูลจาก Google Sheets</span>
                </h4>
                <ul className="text-sm text-blue-700 space-y-2 ml-8 list-decimal">
                  <li>เปิดไฟล์ Google Sheets ของคุณ</li>
                  <li>คลิกปุ่ม "แชร์ (Share)" มุมขวาบน</li>
                  <li>เปลี่ยนสิทธิ์การเข้าถึงทั่วไปเป็น "ทุกคนที่มีลิงก์ (Anyone with the link)"</li>
                  <li>คัดลอกลิงก์นั้น แล้วนำมาวางในช่องด้านล่าง</li>
                </ul>
              </div>
            )}

            {importType === 'file' ? (
              <div 
                className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-slate-50 transition-colors cursor-pointer mb-6 group relative"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                />
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4 group-hover:text-emerald-500 transition-colors" />
                <p className="text-slate-700 font-medium mb-1">คลิกเพื่อเลือกไฟล์</p>
                <p className="text-slate-500 text-sm">รองรับไฟล์ .xlsx, .xls, .csv</p>
              </div>
            ) : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Google Sheets URL</label>
                <div className="flex space-x-3">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="ตัวอย่างเช่น: https://docs.google.com/spreadsheets/d/1BxiMVs0X..."
                    className="flex-1 block w-full px-4 py-3 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 sm:text-sm transition-all placeholder-slate-400"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">โปรดตรวจสอบว่าเปิดแชร์แบบ "ทุกคนที่มีลิงก์ (Anyone with the link)"</p>
              </div>
            )}

            {importSuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">นำเข้าข้อมูลสำเร็จ!</p>
              </div>
            )}

            <button
              onClick={importType === 'sheet' ? handleSheetImport : () => fileInputRef.current?.click()}
              disabled={isImporting || (importType === 'sheet' && !sheetUrl)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>กำลังนำเข้าข้อมูล...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>นำเข้าข้อมูลเลย</span>
                </>
              )}
            </button>
          </div>
        ) : activeTab === 'entry' ? (
          <div className="bg-white rounded-2xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)] border border-[#f0ebe1] p-8 max-w-4xl mx-auto mt-6">
            <div className="text-center mb-8">
              <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusCircle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">บันทึกข้อมูลแบบแมนนวล</h2>
              <p className="text-slate-500 mt-2">กรอกข้อมูลการตรวจสอบการทำให้ปราศจากเชื้อ</p>
            </div>

            {entrySuccess && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">บันทึกข้อมูลสำเร็จ!</p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">เวลา</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">หน่วยงาน</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.unit} 
                    onChange={e => setFormData({...formData, unit: e.target.value})} 
                    className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm"
                    list="unit-list"
                    placeholder="พิมพ์หรือเลือกหน่วยงาน..."
                  />
                  <datalist id="unit-list">
                    {units.filter(u => u !== 'All').map(u => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">อุณหภูมิ (°C / °F)</label>
                  <input type="number" required value={formData.temperature} onChange={e => setFormData({...formData, temperature: Number(e.target.value)})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เวลาสเตอริไรซ์ (นาที)</label>
                    <input type="number" value={formData.sterilizationTime} onChange={e => setFormData({...formData, sterilizationTime: Number(e.target.value)})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เวลาอบแห้ง (นาที)</label>
                    <input type="number" value={formData.dryingTime} onChange={e => setFormData({...formData, dryingTime: Number(e.target.value)})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#f0ebe1]">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">เคมีภายนอก (Ext)</label>
                  <select value={formData.externalIndicator} onChange={e => setFormData({...formData, externalIndicator: e.target.value})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm">
                    <option value="ผ่าน">ผ่าน</option>
                    <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                    <option value="-">-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">เคมีภายใน (Int)</label>
                  <select value={formData.internalIndicator} onChange={e => setFormData({...formData, internalIndicator: e.target.value})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm">
                    <option value="ผ่าน">ผ่าน</option>
                    <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                    <option value="-">-</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ชีวภาพ (Bio)</label>
                  <select value={formData.biologicalIndicator} onChange={e => setFormData({...formData, biologicalIndicator: e.target.value})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm">
                    <option value="ผ่าน">ผ่าน</option>
                    <option value="ไม่ผ่าน">ไม่ผ่าน</option>
                    <option value="-">-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#f0ebe1]">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ผู้อ่านผลคนที่ 1</label>
                  <input type="text" required value={formData.reader1} onChange={e => setFormData({...formData, reader1: e.target.value})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm" placeholder="ชื่อ-สกุล ผู้อ่านผล" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ผู้อ่านผลคนที่ 2 (ถ้ามี)</label>
                  <input type="text" value={formData.reader2} onChange={e => setFormData({...formData, reader2: e.target.value})} className="block w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-rose-200 focus:border-rose-300 sm:text-sm" placeholder="ชื่อ-สกุล ผู้อ่านผลคนที่ 2" />
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500">
                  <Save className="w-5 h-5" />
                  <span>บันทึกข้อมูลเข้าสู่ระบบ</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <div className="space-y-6 mt-6">
              {monthlyUnitData.length > 0 ? monthlyUnitData.map((monthData) => (
                <div key={monthData.sortKey} className="bg-white rounded-2xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)] border border-[#f0ebe1] overflow-hidden print:overflow-visible print:border-none print:shadow-none">
                  <div className="px-6 py-4 bg-[#faf9f6] border-b border-[#f0ebe1] flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-purple-900 flex items-center space-x-2">
                       <CalendarDays className="w-5 h-5 text-purple-500" />
                       <span>ประจำเดือน: {monthData.monthLabel}</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto print:overflow-visible flex-1">
                    <table className="min-w-full divide-y divide-[#f0ebe1]">
                      <thead className="bg-[#fcfbf9]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">หน่วยงาน (Unit)</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">รวมตู้ทั้งหมด</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-teal-600 uppercase tracking-wider">ผ่าน (Ext)</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-teal-600 uppercase tracking-wider">ผ่าน (Int)</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-rose-500 uppercase tracking-wider">ไม่ผ่าน (Int)</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-teal-600 uppercase tracking-wider">ผ่าน (Bio)</th>
                          <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider print:hidden">รายละเอียด</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#f5f2eb]">
                        {monthData.units.map((u) => (
                          <React.Fragment key={u.unit}>
                            <tr 
                              className="hover:bg-[#fcfbf9] transition-colors cursor-pointer group"
                              onClick={() => toggleMonth(u.unit, monthData.sortKey)}
                            >
                              <td className="px-6 py-3 text-sm font-medium text-slate-700 flex items-center space-x-2">
                                <div className="p-1 rounded-md hover:bg-slate-100 text-slate-400 group-hover:text-purple-600 transition-colors">
                                  {expandedMonths.has(`${u.unit}-${monthData.sortKey}`) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                                <span>{u.unit}</span>
                              </td>
                              <td className="px-6 py-3 text-center text-sm font-bold text-slate-800">{u.total}</td>
                              <td className="px-6 py-3 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{u.passExt}</span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{u.passInt}</span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${u.failInt > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>
                                   {u.failInt > 0 ? u.failInt : '-'}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{u.passBio}</span>
                              </td>
                              <td className="px-6 py-3 text-center print:hidden">
                                <button 
                                  onClick={() => toggleMonth(u.unit, monthData.sortKey)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                                  expandedMonths.has(`${u.unit}-${monthData.sortKey}`) 
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-inner'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-purple-600 hover:border-purple-200'
                                }`}>
                                  {expandedMonths.has(`${u.unit}-${monthData.sortKey}`) ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                                </button>
                              </td>
                            </tr>
                            {expandedMonths.has(`${u.unit}-${monthData.sortKey}`) && (
                              <tr className="bg-[#faf9f6]">
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="rounded-xl border border-[#e8e4db] overflow-hidden bg-white shadow-sm print:overflow-visible print:border-none print:shadow-none">
                                    <table className="min-w-full divide-y divide-[#f0ebe1]">
                                      <thead className="bg-slate-50 border-b border-[#e8e4db]">
                                        <tr>
                                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">วันและเวลาที่ส่ง</th>
                                          <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">อุณหภูมิ (°F)</th>
                                          <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ext</th>
                                          <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Int</th>
                                          <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bio</th>
                                          <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ผู้อ่านผล</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#f5f2eb]">
                                        {u.records.map((r: any) => (
                                          <tr key={r.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                              <div className="text-xs font-medium text-slate-700">{r.date}</div>
                                              <div className="text-[10px] text-slate-500">{r.timestamp.split(' ')[1]}</div>
                                            </td>
                                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                              <span className="text-xs font-medium text-slate-600">{r.temperature}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(r.externalIndicator)}`}>{r.externalIndicator}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(r.internalIndicator)}`}>{r.internalIndicator}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(r.biologicalIndicator)}`}>{r.biologicalIndicator}</span>
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                              <div className="text-[10px] text-slate-600">{r.reader1}</div>
                                              {r.reader2 && <div className="text-[10px] text-slate-600 mt-0.5">{r.reader2}</div>}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                        {/* Summary Row */}
                        <tr className="bg-purple-50/20">
                          <td className="px-6 py-3 text-sm font-semibold text-purple-900 border-t border-purple-100">รวมทั้งหมด</td>
                          <td className="px-6 py-3 text-center text-sm font-bold text-purple-900 border-t border-purple-100">{monthData.totals.total}</td>
                          <td className="px-6 py-3 text-center">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{monthData.totals.passExt}</span>
                          </td>
                          <td className="px-6 py-3 text-center">
                             <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{monthData.totals.passInt}</span>
                          </td>
                          <td className="px-6 py-3 text-center border-t border-purple-100">
                             <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${monthData.totals.failInt > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>
                                {monthData.totals.failInt > 0 ? monthData.totals.failInt : '-'}
                             </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                             <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{monthData.totals.passBio}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )) : (
                 <div className="bg-white rounded-2xl shadow-[0_2px_15px_-4px_rgba(0,0,0,0.04)] border border-[#f0ebe1] p-16 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                       <XOctagon className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-800">ไม่พบข้อมูล</h3>
                    <p className="mt-1 text-sm text-slate-500">ไม่มีข้อมูลบันทึกสำหรับหน่วยงานที่เลือก</p>
                 </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-8">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">เข้าสู่ระบบ Admin</h2>
              <p className="text-center text-slate-500 text-sm mb-8">จัดการข้อมูลการทำให้ปราศจากเชื้อ</p>
              
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">ชื่อผู้ใช้ (Username)</label>
                  <input 
                    type="text"
                    autoFocus
                    required
                    value={loginForm.username}
                    onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                    className="block w-full px-4 py-3 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 sm:text-sm transition-all"
                    placeholder="ระบุชื่อผู้ใช้ (Username)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่าน (Password)</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginForm.password}
                      onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                      className="block w-full pl-4 pr-11 py-3 bg-[#fcfbf9] border border-[#e8e4db] rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 sm:text-sm transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                
                {loginError && (
                  <p className="text-rose-600 text-sm font-medium text-center bg-rose-50 p-2 rounded-lg">{loginError}</p>
                )}
                
                <button 
                  type="submit"
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mt-2"
                >
                  เข้าสู่ระบบ
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

