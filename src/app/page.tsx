'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Mic, Square, Save, FileText, Loader2, Printer, Edit2, LogOut, Users, QrCode, Shield, LayoutTemplate, Plus, X, ArrowLeft, CreditCard, Link } from 'lucide-react';
import { DoctorProfileModal, CustomField } from '@/components/DoctorProfileModal';
import { LoginScreen } from '@/components/LoginScreen';
import { QRModal } from '@/components/QRModal';
import { TemplateSelector } from '@/components/TemplateSelector';
import { CouponPage } from '@/components/CouponPage';
import { TokenBadge } from '@/components/TokenBadge';
import { TokenWarningModal } from '@/components/TokenWarningModal';
import { getTemplates, AttachedTemplate, initializeDefaultTemplates } from '@/lib/templates';
import { authFetch, clearSessionToken, getSessionToken, setSessionToken } from '@/lib/client-auth';

interface Procedure {
  name: string;
  quantity: number;
}

interface AnalysisResult {
  patientName: string;
  dob: string;
  visitDate: string;
  complaints: string;
  anamnesis: string;
  diagnosis: string;
  treatment: string;
  recommendations: string;
  procedures: Procedure[];
}

const DEFAULT_PROCEDURES = [
  'HILT (высокоинтенсивная лазеротерапия)',
  'SIS (высокоинтенсивная магнитотерапия)',
  'УВТ (Ударно-волновая терапия)',
  'ИРТ (иглорефлексотерапия)',
  'ВТЭС (внутритканевая электростимуляция)',
  'PRP (плазматерапия)',
  'Кинезиотерапия'
];

const PROCEDURE_KEY_MAP: Record<string, string> = {
  'HILT': 'HILT (высокоинтенсивная лазеротерапия)',
  'SIS': 'SIS (высокоинтенсивная магнитотерапия)',
  'УВТ': 'УВТ (Ударно-волновая терапия)',
  'ИРТ': 'ИРТ (иглорефлексотерапия)',
  'ВТЭС': 'ВТЭС (внутритканевая электростимуляция)',
  'PRP': 'PRP (плазматерапия)',
  'Кинезиотерапия': 'Кинезиотерапия',
};

function mapAIProcedures(aiProcs: Record<string, number>, proceduresList?: string[]): Procedure[] {
  const list = proceduresList ?? DEFAULT_PROCEDURES;
  return list.map(name => {
    const shortKey = Object.keys(PROCEDURE_KEY_MAP).find(k => PROCEDURE_KEY_MAP[k] === name);
    return { name, quantity: shortKey ? (aiProcs[shortKey] ?? 0) : 0 };
  });
}

function mergeResults(existing: AnalysisResult, newData: AnalysisResult): AnalysisResult {
  const isEmpty = (v: string) => !v || v.trim() === '' || v === 'Не указано';
  return {
    patientName: isEmpty(existing.patientName) ? newData.patientName : existing.patientName,
    dob: isEmpty(existing.dob) ? newData.dob : existing.dob,
    visitDate: isEmpty(existing.visitDate) ? newData.visitDate : existing.visitDate,
    complaints: isEmpty(existing.complaints) ? newData.complaints : existing.complaints,
    anamnesis: isEmpty(existing.anamnesis) ? newData.anamnesis : existing.anamnesis,
    diagnosis: isEmpty(existing.diagnosis) ? newData.diagnosis : existing.diagnosis,
    treatment: isEmpty(existing.treatment) ? newData.treatment : existing.treatment,
    recommendations: isEmpty(existing.recommendations) ? newData.recommendations : existing.recommendations,
    procedures: existing.procedures.map((proc, idx) => ({
      ...proc,
      quantity: proc.quantity > 0 ? proc.quantity : (newData.procedures[idx]?.quantity || 0),
    })),
  };
}

interface DoctorProfile {
  name: string;
  specialty: string;
  license: string;
  avatarUrl?: string;
  headerImageUrl?: string;
  experience?: string;
  whatsapp?: string;
  telegram?: string;
  customFields?: CustomField[];
  customProcedures?: string[];
}

function HomeContent() {
  const router = useRouter();
  const { isRecording, startRecording, stopRecording, audioBlob, resetRecording } = useAudioRecorder();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('doctor');
  const [userLogin, setUserLogin] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [attachedTemplates, setAttachedTemplates] = useState<AttachedTemplate[]>([]);
  const [selectorTemplates, setSelectorTemplates] = useState<import('@/lib/templates').Template[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [tokenWarning, setTokenWarning] = useState<0 | 1 | 5 | null>(null);
  const [googleLinkedMessage, setGoogleLinkedMessage] = useState<string | null>(null);
  const [isContinuingRecording, setIsContinuingRecording] = useState(false);
  const [isAdditionalAnalyzing, setIsAdditionalAnalyzing] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
    name: '',
    specialty: '',
    license: ''
  });

  // Helper: check token warning thresholds (5, 1, 0)
  const checkTokenWarning = (balance: number) => {
    if (balance === 0) {
      setTokenWarning(0);
      return;
    }
    if (balance === 1 && !sessionStorage.getItem('tokenWarnShown_1')) {
      sessionStorage.setItem('tokenWarnShown_1', '1');
      setTokenWarning(1);
      return;
    }
    if (balance === 5 && !sessionStorage.getItem('tokenWarnShown_5')) {
      sessionStorage.setItem('tokenWarnShown_5', '1');
      setTokenWarning(5);
    }
  };

  // Helper: read a cookie value by name
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()!.split(';').shift() || null;
    return null;
  };

  // Init: auth check, profile load, patient from sessionStorage, mobile listener
  useEffect(() => {
    // Check for Google link/error URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_linked') === '1') {
      setGoogleLinkedMessage('Google аккаунт успешно привязан!');
      window.history.replaceState({}, '', '/');
      setTimeout(() => setGoogleLinkedMessage(null), 4000);
    }
    if (urlParams.get('auth_error') === 'google_already_linked') {
      setGoogleLinkedMessage('Этот Google аккаунт уже привязан к другому пользователю');
      window.history.replaceState({}, '', '/');
      setTimeout(() => setGoogleLinkedMessage(null), 4000);
    }

    // Check for Google OAuth session cookie
    const googleToken = getCookie('_gsession');
    const googleUser = getCookie('_guser');
    if (googleToken && googleUser) {
      // Clear cookies immediately
      document.cookie = '_gsession=; Max-Age=0; Path=/';
      document.cookie = '_guser=; Max-Age=0; Path=/';
      try {
        // Both cookies are URL-encoded by Next.js — decode before use
        const rawToken = decodeURIComponent(googleToken);
        const userData = JSON.parse(atob(decodeURIComponent(googleUser)));
        setSessionToken(rawToken);
        localStorage.setItem('doctorSession', JSON.stringify({
          login: userData.login,
          username: userData.login,
          name: userData.name,
          specialty: userData.specialty || '',
          role: userData.role,
          loginTime: new Date().toISOString(),
        }));
        // Reload so the page re-initialises with localStorage already populated
        window.location.replace('/');
        return;
      } catch (e) {
        console.error('[Google Auth] Failed to parse session cookie:', e);
      }
    }

    // Auth
    const session = localStorage.getItem('doctorSession');
    const token = getSessionToken();

    if (session && token) {
      setIsLoggedIn(true);
      try {
        const parsed = JSON.parse(session);
        const login = parsed.login || '';
        const name = parsed.name || '';
        const specialty = parsed.specialty || '';
        const role = parsed.role || 'doctor';
        if (role) setUserRole(role);
        if (login) {
          setUserLogin(login);

          // Инициализируем дефолтные шаблоны для новых пользователей
          initializeDefaultTemplates(login);

          // Fetch credits
          authFetch(`/api/credits?login=${encodeURIComponent(login)}`)
            .then(async r => {
              if (r.status === 401) throw new Error('Unauthorized');
              return r.json();
            })
            .then(data => {
              if (!data.error && !data.unlimited) {
                setRemainingCredits(data.remainingCredits);
              }
            })
            .catch((err) => {
              if (err.message === 'Unauthorized') {
                localStorage.removeItem('doctorSession');
                clearSessionToken();
                setIsLoggedIn(false);
              }
            });

          // Fetch personal token balance
          authFetch('/api/tokens')
            .then(r => r.json())
            .then(data => {
              if (typeof data.balance === 'number') {
                setTokenBalance(data.balance);
                checkTokenWarning(data.balance);
              }
            })
            .catch(() => { });
        }

        // Load per-user profile, fallback to account data
        const profileKey = `doctorProfile_${login}`;
        const saved = localStorage.getItem(profileKey);
        if (saved) {
          setDoctorProfile(JSON.parse(saved));
        } else {
          // First login — pre-populate from account
          setDoctorProfile(prev => ({ ...prev, name, specialty }));
        }
      } catch { }
    } else {
      // Invalid state (partial session)
      localStorage.removeItem('doctorSession');
      clearSessionToken();
      setIsLoggedIn(false);
    }

    // Patient reopened from patients list
    const patientRaw = sessionStorage.getItem('openPatient');
    if (patientRaw) {
      sessionStorage.removeItem('openPatient');
      try {
        const p = JSON.parse(patientRaw);

        // Extract procedures from treatment text if exists (e.g. "Процедуры: HILT: 5, УВТ: 3")
        // Use doctor's custom procedure list if available (read from localStorage directly since state not yet updated)
        const savedProfileRaw = localStorage.getItem(`doctorProfile_${JSON.parse(session || '{}').login || ''}`);
        const savedProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null;
        const activeProcedures = savedProfile?.customProcedures ?? DEFAULT_PROCEDURES;
        const loadedProcedures = activeProcedures.map((name: string) => ({ name, quantity: 0 }));
        if (p.treatment && p.treatment.includes('Процедуры:')) {
          const parts = p.treatment.split('Процедуры:');
          // The first part is the actual treatment text, the second is the procedures list
          if (parts.length > 1) {
            p.treatment = parts[0].trim(); // Restore just the treatment text

            // Parse procedures: "HILT (высокоинтенсивная лазеротерапия): 5, УВТ (Ударно-волновая терапия): 3"
            const procsString = parts[1];
            const procItems = procsString.split(',').map((s: string) => s.trim());

            procItems.forEach((item: string) => {
              const match = item.match(/(.+):\s*(\d+)/);
              if (match) {
                const [, pName, pQuantity] = match;
                // Find matching procedure in loadedProcedures
                const existing = loadedProcedures.find((lp: Procedure) => lp.name === pName.trim());
                if (existing) {
                  existing.quantity = parseInt(pQuantity, 10);
                }
              }
            });
          }
        }

        setResult({
          patientName: p.patientName || '',
          dob: p.dob || '',
          visitDate: p.visitDate || '',
          complaints: p.complaints || '',
          anamnesis: p.anamnesis || '',
          diagnosis: p.diagnosis || '',
          treatment: p.treatment || '',
          recommendations: p.recommendations || '',
          procedures: loadedProcedures,
        });
      } catch (e) {
        console.error('Failed to parse openPatient', e);
      }
    }

    // Mobile analysis result listener
    const handleMobileAnalysis = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data) return;
      const sess = localStorage.getItem('doctorSession');
      const login = sess ? JSON.parse(sess).login : '';
      const savedProf = login ? JSON.parse(localStorage.getItem(`doctorProfile_${login}`) || 'null') : null;
      setResult({
        ...data,
        procedures: mapAIProcedures(data.procedures || {}, savedProf?.customProcedures),
      });
    };
    window.addEventListener('mobileAnalysisDone', handleMobileAnalysis);
    return () => window.removeEventListener('mobileAnalysisDone', handleMobileAnalysis);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('doctorSession');
    clearSessionToken();
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(username, role, name, specialty) => {
      setIsLoggedIn(true);
      setUserRole(role);
      setUserLogin(username);
      // Load per-user profile or init from account data
      const profileKey = `doctorProfile_${username}`;
      const saved = localStorage.getItem(profileKey);
      if (saved) {
        setDoctorProfile(JSON.parse(saved));
      } else {
        setDoctorProfile(prev => ({ ...prev, name: name || '', specialty: specialty || '' }));
      }
    }} />;
  }

  const handleSaveProfile = (newProfile: DoctorProfile) => {
    setDoctorProfile(newProfile);
    if (userLogin) {
      localStorage.setItem(`doctorProfile_${userLogin}`, JSON.stringify(newProfile));
    }
    // If there's an active result, sync procedure list with new profile (preserve existing quantities)
    if (result) {
      const newList = newProfile.customProcedures ?? DEFAULT_PROCEDURES;
      const updatedProcedures = newList.map(name => {
        const existing = result.procedures.find(p => p.name === name);
        return { name, quantity: existing?.quantity ?? 0 };
      });
      setResult({ ...result, procedures: updatedProcedures });
    }
    setIsProfileOpen(false);
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      const response = await authFetch('/api/analyze', { method: 'POST', body: formData });
      if (response.status === 402) {
        setTokenBalance(0);
        setTokenWarning(0);
        return;
      }
      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      setResult({
        ...data.analysis,
        procedures: mapAIProcedures(data.analysis.procedures || {}, doctorProfile.customProcedures),
      });
      if (typeof data.tokenBalance === 'number') {
        setTokenBalance(data.tokenBalance);
        checkTokenWarning(data.tokenBalance);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Ошибка анализа записи');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAdditionalAnalyze = async () => {
    if (!audioBlob || !result) return;
    setIsAdditionalAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      const response = await authFetch('/api/analyze', { method: 'POST', body: formData });
      if (response.status === 402) {
        setTokenBalance(0);
        setTokenWarning(0);
        return;
      }
      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      const newData: AnalysisResult = {
        ...data.analysis,
        procedures: mapAIProcedures(data.analysis.procedures || {}, doctorProfile.customProcedures),
      };
      setResult(mergeResults(result, newData));
      setIsContinuingRecording(false);
      resetRecording();
      if (typeof data.tokenBalance === 'number') {
        setTokenBalance(data.tokenBalance);
        checkTokenWarning(data.tokenBalance);
      }
    } catch (error) {
      console.error('Additional analysis error:', error);
      alert('Ошибка анализа записи');
    } finally {
      setIsAdditionalAnalyzing(false);
    }
  };

  const handleCancelContinuation = () => {
    setIsContinuingRecording(false);
    resetRecording();
  };

  const handleSave = async () => {
    if (!result) return;
    const proceduresText = result.procedures
      .filter(p => p.quantity > 0)
      .map(p => `${p.name}: ${p.quantity}`)
      .join(', ');
    const dataToSave = {
      ...result,
      treatment: `${result.treatment}\n\nПроцедуры: ${proceduresText}`,
      doctor: doctorProfile,
      doctorLogin: userLogin,
    };
    try {
      const response = await authFetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      const data = await response.json();
      if (response.status === 403) {
        alert('⚠️ ' + (data.error || 'Кредиты консультаций закончились.'));
        return;
      }
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      const creditsMsg = data.remainingCredits >= 0
        ? `\nОсталось консультаций: ${data.remainingCredits}`
        : '';
      alert('Данные успешно сохранены в Google Таблицу!' + creditsMsg);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Ошибка сохранения: ${msg}`);
    }
  };

  const handlePrint = () => window.print();

  const updateProcedure = (index: number, quantity: number) => {
    if (!result) return;
    const newProcedures = [...result.procedures];
    newProcedures[index].quantity = quantity;
    setResult({ ...result, procedures: newProcedures });
  };

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-slate-50 print:bg-white print:p-0 selection:bg-teal-100 selection:text-teal-900">
      <DoctorProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSave={handleSaveProfile}
        initialProfile={doctorProfile}
      />
      {isQROpen && <QRModal onClose={() => setIsQROpen(false)} />}
      {tokenWarning !== null && (
        <TokenWarningModal
          remaining={tokenWarning}
          doctorName={doctorProfile.name}
          onClose={() => setTokenWarning(null)}
        />
      )}

      <div className="flex min-h-screen">

        {/* ===== SIDEBAR (Desktop) ===== */}
        <aside className="hidden md:flex flex-col w-72 h-screen sticky top-0 bg-white border-r border-slate-200 p-6 shadow-sm z-50 print:hidden transition-all">
          {/* Logo */}
          <div className="mb-12 flex items-center gap-3 px-2">
            <img src="/jazai-symbol.svg" alt="JAZai Logo" className="h-10 w-10" />
            <div>
              <h1 className="font-bold text-xl leading-none tracking-tight text-slate-900">
                <span className="font-black">JAZ</span><span className="text-teal-500">ai</span> Doc
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider mt-0.5 uppercase">Медицинский ассистент</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 flex-1">
            <button
              onClick={() => router.push('/patients')}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all font-medium group text-sm"
            >
              <Users className="w-5 h-5 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-teal-500" />
              <span>Пациенты</span>
            </button>

            <button
              onClick={() => router.push('/templates')}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all font-medium group text-sm"
            >
              <LayoutTemplate className="w-5 h-5 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-teal-500" />
              <span>Шаблоны</span>
            </button>

            {userRole === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all font-medium group text-sm"
              >
                <Shield className="w-5 h-5 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-teal-500" />
                <span>Админ панель</span>
              </button>
            )}

            <button
              onClick={() => setIsQROpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-all font-medium group text-sm"
            >
              <QrCode className="w-5 h-5 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-teal-500" />
              <span>Запись с телефона</span>
            </button>
          </nav>

          {/* Profile / Bottom Actions */}
          <div className="mt-auto space-y-4 pt-6 border-t border-slate-100">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-slate-50 transition-colors group text-left"
            >
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold group-hover:bg-teal-200 transition-colors overflow-hidden shrink-0">
                {doctorProfile.avatarUrl ? (
                  <img src={doctorProfile.avatarUrl} className="w-full h-full rounded-full object-cover" />
                ) : (
                  doctorProfile.name.charAt(0)
                )}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-sm text-slate-900 truncate">{doctorProfile.name}</p>
                <p className="text-xs text-slate-500 truncate">{doctorProfile.specialty || 'Врач'}</p>
              </div>
            </button>

            <div className="flex items-center justify-between px-2">
              {tokenBalance !== null ? (
                <TokenBadge balance={tokenBalance} doctorName={doctorProfile.name} />
              ) : remainingCredits !== null && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${remainingCredits <= 0 ? 'bg-red-50 text-red-700 border-red-200' :
                  remainingCredits < 10 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`} title={`Осталось консультаций: ${remainingCredits}`}>
                  <CreditCard className="w-3 h-3" />
                  {remainingCredits}
                </div>
              )}

              <button
                onClick={() => { window.location.href = `/api/auth/google?link_login=${encodeURIComponent(userLogin)}`; }}
                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors text-sm font-medium"
                title="Привязать Google аккаунт"
              >
                <Link className="w-4 h-4" />
                <span>Google</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 p-4 sm:p-8 lg:p-12 overflow-x-hidden print:p-0 print:w-full print:m-0">
          <div className="max-w-4xl space-y-8 print:w-[210mm] print:max-w-none print:space-y-4">

            {/* Print Header - Only on first page (consultation sheet) */}
            <div className="hidden print:block mb-4 print:pr-[20mm] print:pl-[30mm]">
              <img
                src={doctorProfile.headerImageUrl || "/header.jpg"}
                alt="Header"
                className="w-full h-auto object-contain max-h-[70px] print:w-[calc(100%-50mm)] print:max-w-[calc(100%-50mm)] print:ml-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>

            {/* User Back Button (Mobile/Tablet Only header equivalent) */}
            <div className="md:hidden flex justify-between items-center mb-6 glass-card-solid p-4 rounded-xl print:hidden">
              <div className="flex items-center gap-3">
                <img src="/jazai-logo.svg" alt="logo" className="h-8 w-auto" />
                <h1 className="font-bold text-lg text-slate-900">JAZai Doc</h1>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsQROpen(true)} className="p-2 rounded-lg bg-teal-50 text-teal-700"><QrCode className="w-5 h-5" /></button>
                <button onClick={() => setIsProfileOpen(true)} className="p-2 rounded-lg bg-slate-100 text-slate-600"><Users className="w-5 h-5" /></button>
                <button onClick={handleLogout} className="p-2 rounded-lg bg-red-50 text-red-600"><LogOut className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Back Button (Desktop - inside main content if needed, or redundant if sidebar implies root. But router is here.) */}
            {/* The original design had a Back button. Let's keep a subtle nav if not on home? But this IS home page. */}

            {/* Recording Controls */}
            {!result && (
              <section className="glass-card-solid rounded-2xl p-10 text-center space-y-8 print:hidden animate-fadeInUp shadow-sm border border-slate-200/60" style={{ animationDelay: '100ms' }}>
                <div className={`w-36 h-36 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${isRecording ? 'gradient-record animate-recording shadow-xl shadow-red-500/30' : 'bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl shadow-slate-900/20'}`}>
                  <Mic className={`w-14 h-14 text-white ${isRecording ? '' : 'drop-shadow-lg'}`} />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {isRecording ? 'Слушаю консультацию...' : 'Новый прием'}
                  </h2>
                  <p className="text-slate-500 text-base max-w-md mx-auto">
                    {isRecording ? 'Говорите четко. ИИ анализирует диалог в реальном времени.' : 'Нажмите кнопку ниже, чтобы начать запись и автоматизировать заполнение карты.'}
                  </p>
                </div>
                <div className="flex justify-center gap-4">
                  {!isRecording && !audioBlob && (
                    <button
                      onClick={startRecording}
                      className="btn-primary flex items-center gap-2.5 px-8 py-4 text-base shadow-lg shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-0.5"
                    >
                      <Mic className="w-5 h-5" />
                      Начать запись
                    </button>
                  )}
                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="px-10 py-4 gradient-record text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center gap-2.5 shadow-lg shadow-red-500/30 cursor-pointer animate-pulse"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      Завершить прием
                    </button>
                  )}
                  {audioBlob && !isRecording && (
                    <div className="flex gap-4">
                      <button
                        onClick={resetRecording}
                        className="btn-secondary flex items-center gap-2"
                        disabled={isAnalyzing}
                      >
                        Записать заново
                      </button>
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="px-8 py-3 gradient-success text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center gap-2.5 disabled:opacity-50 shadow-lg shadow-emerald-500/20 cursor-pointer"
                      >
                        {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                        {isAnalyzing ? 'Анализирую...' : 'Сформировать карту'}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Results Form */}
            {result && (
              <>
                <main className="glass-card-solid rounded-2xl overflow-hidden animate-fadeInUp print:shadow-none print:bg-white shadow-sm border border-slate-200">
                  <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center print:hidden">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-teal-600" />
                      Результаты анализа
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => { setResult(null); setAttachedTemplates([]); setShowCoupons(false); resetRecording(); setIsContinuingRecording(false); }} className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5 hover:bg-slate-100 bg-white">
                        <Mic className="w-3.5 h-3.5" />
                        Новый
                      </button>
                      <button
                        onClick={() => { getTemplates(userLogin).then(setSelectorTemplates); setIsTemplateSelectorOpen(true); }}
                        className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5 text-teal-700 border-teal-200 hover:bg-teal-50 bg-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Шаблон
                      </button>
                      <button
                        onClick={() => setShowCoupons(prev => !prev)}
                        className={`btn-secondary flex items-center gap-1 text-xs px-3 py-1.5 ${showCoupons
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'text-amber-700 border-amber-200 hover:bg-amber-50 bg-white'
                          }`}
                      >
                        🎟️ Купоны {showCoupons ? '✓' : ''}
                      </button>
                      {!isContinuingRecording && (
                        <button
                          onClick={() => { resetRecording(); setIsContinuingRecording(true); }}
                          className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5 text-violet-700 border-violet-200 hover:bg-violet-50 bg-white"
                        >
                          <Mic className="w-3.5 h-3.5" />
                          Дополнить
                        </button>
                      )}
                      <button
                        onClick={handlePrint}
                        className="btn-secondary flex items-center gap-1 text-xs px-3 py-1.5 bg-white"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        PDF
                      </button>
                      <button
                        onClick={handleSave}
                        className="btn-primary flex items-center gap-1 text-xs px-4 py-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Сохранить
                      </button>
                    </div>
                  </div>

                  {/* Continuation Recording Panel */}
                  {isContinuingRecording && (
                    <div className="px-5 py-4 bg-violet-50 border-b border-violet-100 print:hidden">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          {isAdditionalAnalyzing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                              <span className="text-sm font-medium text-violet-800">Анализирую дополнение...</span>
                            </>
                          ) : isRecording ? (
                            <>
                              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
                              <span className="text-sm font-medium text-slate-700">Запись дополнения...</span>
                              <span className="text-xs text-slate-500">Диктуйте недостающие данные</span>
                            </>
                          ) : audioBlob ? (
                            <>
                              <div className="w-3 h-3 rounded-full bg-violet-400 shrink-0" />
                              <span className="text-sm font-medium text-violet-800">Запись готова — нажмите «Применить»</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-5 h-5 text-violet-500 shrink-0" />
                              <span className="text-sm font-medium text-violet-700">Продиктуйте недостающие данные карты</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isRecording && !audioBlob && !isAdditionalAnalyzing && (
                            <button
                              onClick={startRecording}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors"
                            >
                              <Mic className="w-3.5 h-3.5" />
                              Начать запись
                            </button>
                          )}
                          {isRecording && (
                            <button
                              onClick={stopRecording}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                              Остановить
                            </button>
                          )}
                          {audioBlob && !isRecording && !isAdditionalAnalyzing && (
                            <>
                              <button
                                onClick={resetRecording}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                              >
                                Перезаписать
                              </button>
                              <button
                                onClick={handleAdditionalAnalyze}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Применить к карте
                              </button>
                            </>
                          )}
                          {!isAdditionalAnalyzing && !isRecording && (
                            <button
                              onClick={handleCancelContinuation}
                              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-white"
                              title="Отмена"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-8 space-y-6 print:p-0 print:pl-0 print:pr-[20mm] print:space-y-2 print:text-[11px] print:leading-tight print-text-wrap">
                    <div className="text-left mb-4 border-b pb-2 hidden print:block">
                      <h1 className="text-lg font-bold text-gray-900 uppercase tracking-widest">Консультационный Лист</h1>
                      <p className="text-gray-500 mt-1 text-sm">{result.visitDate || new Date().toLocaleDateString('ru-RU')}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 print:gap-4 text-sm">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider mb-1">ФИО Пациента</label>
                        <input
                          type="text"
                          value={result.patientName}
                          onChange={(e) => setResult({ ...result, patientName: e.target.value })}
                          className="w-full input-medical print:p-0 print:text-lg print:font-semibold bg-slate-50/50 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider mb-1">Дата рождения</label>
                        <input
                          type="text"
                          value={result.dob}
                          onChange={(e) => setResult({ ...result, dob: e.target.value })}
                          className="w-full input-medical print:p-0 print:text-lg bg-slate-50/50 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 print:mb-4">
                      <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider mb-1">Жалобы</label>
                      <textarea
                        rows={3}
                        value={result.complaints}
                        onChange={(e) => setResult({ ...result, complaints: e.target.value })}
                        className="w-full input-medical print:p-0 print:resize-none print:text-sm bg-slate-50/50 focus:bg-white print:min-h-[80px] print-text-wrap"
                      />
                    </div>

                    <div className="space-y-1 print:mb-4">
                      <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider mb-1">Анамнез</label>
                      <textarea
                        rows={3}
                        value={result.anamnesis}
                        onChange={(e) => setResult({ ...result, anamnesis: e.target.value })}
                        className="w-full input-medical print:p-0 print:resize-none print:text-sm bg-slate-50/50 focus:bg-white print:min-h-[80px] print-text-wrap"
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100 print:bg-transparent print:p-0 print:mt-4">
                      <label className="font-bold text-teal-800 block mb-2 uppercase text-[10px] tracking-wider">Предварительный диагноз</label>
                      <div className="print:hidden">
                        <input
                          type="text"
                          value={result.diagnosis}
                          onChange={(e) => setResult({ ...result, diagnosis: e.target.value })}
                          className="w-full input-medical font-bold text-lg text-slate-900 border-teal-200 focus:border-teal-500 bg-white"
                        />
                      </div>
                      <div className="hidden print:block font-bold text-sm text-black print-text-wrap">
                        {result.diagnosis}
                      </div>
                    </div>

                    {/* Procedures - Simple table layout aligned left */}
                    <div className="print:mt-4 print:pr-[20mm]">
                      <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider border-b pb-1 mb-2 text-left">План Лечения (Процедуры)</h3>
                      <div className="w-full">
                        {result.procedures?.map((proc, idx) => (
                          <div key={idx} className="flex items-start print:items-center w-full py-5 print:py-2.5 border-b print:border-gray-100">
                            <div className="flex-1 text-left">
                              <span className="text-slate-700 font-medium print:text-black text-sm print:text-[11px] print:leading-tight whitespace-nowrap">
                                {proc.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 print:gap-0.5 ml-2 shrink-0">
                              <input
                                type="number"
                                min="0"
                                value={proc.quantity || ''}
                                onChange={(e) => updateProcedure(idx, parseInt(e.target.value) || 0)}
                                className={`w-10 p-1 border rounded text-right focus:ring-teal-500 focus:border-teal-500
                                print:w-8 print:h-6 print:text-right print:font-bold print:text-[10px] print:p-0.5 bg-white
                                ${proc.quantity > 0 ? 'print:text-black border-teal-200 text-teal-900 font-bold' : 'print:text-gray-400 border-slate-200 text-slate-400'}`}
                                placeholder="0"
                              />
                              <span className="text-sm text-slate-500 ml-0.5 print:hidden">сеанс</span>
                              <span className={`hidden print:inline text-[9px] whitespace-nowrap ${proc.quantity > 0 ? 'text-black' : 'text-gray-400'}`}>сеанс.</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 print:mt-4">
                      <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider mb-1">Дополнительные рекомендации</label>
                      <textarea
                        rows={3}
                        value={result.recommendations}
                        onChange={(e) => setResult({ ...result, recommendations: e.target.value })}
                        className="w-full input-medical print:p-0 print:resize-none print:text-sm bg-slate-50/50 focus:bg-white print:min-h-[80px] print-text-wrap"
                      />
                    </div>

                    {/* Attached templates list (screen only) */}
                    {attachedTemplates.length > 0 && (
                      <div className="space-y-2 print:hidden">
                        <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1">
                          <LayoutTemplate className="w-3.5 h-3.5" />
                          Прикреплённые шаблоны ({attachedTemplates.length})
                        </h3>
                        <div className="space-y-1">
                          {attachedTemplates.map((at, idx) => (
                            <div key={at.templateId + idx} className="flex items-center justify-between p-2 bg-teal-50 rounded-lg border border-teal-100">
                              <span className="text-sm text-teal-800 font-medium">{at.name}</span>
                              <button
                                onClick={() => setAttachedTemplates(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-teal-400 hover:text-red-500 transition-colors"
                                title="Убрать шаблон"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer - Print Only */}
                    <div className="hidden print:flex flex-row justify-between items-end mt-8 pt-8 border-t border-gray-300">
                      <div className="flex items-start gap-4">
                        {doctorProfile.avatarUrl && (
                          <img src={doctorProfile.avatarUrl} alt="Doctor" className="w-16 h-16 rounded-full object-cover border border-gray-200 print:max-w-[calc(100%-20mm)]" />
                        )}
                        <div className="text-sm">
                          <p className="font-bold text-gray-900">{doctorProfile.name}</p>
                          <p className="text-gray-600 italic">{doctorProfile.specialty}</p>
                          {doctorProfile.customFields && doctorProfile.customFields.length > 0 && (
                            <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                              {doctorProfile.customFields.filter(f => f.value).map((f, i) => (
                                <p key={i}>{f.label}: {f.value}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <img src="/footer_qr.jpg" alt="Info" className="w-24 h-24 object-contain mb-1 print:max-w-[calc(100%-20mm)]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    </div>

                    {/* JAZai branding - Print Only */}
                    <div className="hidden print:block mt-12 pt-6 border-t border-gray-200">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-2">
                          <img src="/jazai-symbol.svg" alt="JAZai Logo" className="w-8 h-8" />
                          <span className="font-bold text-lg text-gray-900">
                            <span className="font-black">JAZ</span><span className="text-teal-500">ai</span> Doc
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 text-center">Сделано при помощи JAZai — интеллектуальный медицинский ассистент</p>
                      </div>
                    </div>

                  </div>
                </main>

                {/* Template pages for print */}
                {attachedTemplates.map((at, idx) => (
                  <div key={at.templateId + idx} className="hidden print:block print:pr-[20mm]" style={{ pageBreakBefore: 'always' }}>
                    {/* No header on template pages - only consultation sheet has header */}
                    <div className="text-left mb-4 border-b pb-2">
                      <h2 className="text-lg font-bold text-gray-900 uppercase tracking-widest mb-1">{at.name}</h2>
                      <p className="text-xs text-gray-700">
                        Уважаемый наш пациент, <strong>{result.patientName || 'пациент'}</strong>, ниже приведены <strong>{at.headerText}</strong> для вас.
                      </p>
                    </div>
                    {at.content && (
                      <div className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed mb-4 print:mb-6 max-w-full overflow-hidden">
                        {at.content}
                      </div>
                    )}
                    {at.images.length > 0 && (
                      <div className="mb-4 print:mb-6">
                        {at.images.map(img => (
                          <div key={img.id} className="text-center mb-4 last:mb-0 print:mb-6 last:print:mb-0">
                            <img
                              src={img.data}
                              alt={img.caption || ''}
                              className="w-full max-h-[80vh] object-contain rounded border print:max-w-[calc(100%-20mm)]"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            {img.caption && <p className="text-xs text-gray-500 mt-1 italic print:mt-2 print-text-wrap">{img.caption}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-row justify-between items-end mt-6 pt-4 border-t border-gray-300 print:mt-8 print:pt-4">
                      <div className="flex items-start gap-4">
                        {doctorProfile.avatarUrl && (
                          <img src={doctorProfile.avatarUrl} alt="Doctor" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                        )}
                        <div className="text-sm">
                          <p className="font-bold text-gray-900">{doctorProfile.name}</p>
                          <p className="text-gray-600 italic">{doctorProfile.specialty}</p>
                          {doctorProfile.customFields && doctorProfile.customFields.length > 0 && (
                            <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                              {doctorProfile.customFields.filter(f => f.value).map((f, i) => (
                                <p key={i}>{f.label}: {f.value}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <img src="/footer_qr.jpg" alt="Info" className="w-24 h-24 object-contain mb-1 print:w-16 print:h-16 print:max-w-[calc(100%-20mm)]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    </div>

                    {/* JAZai branding for template pages - Print Only */}
                    <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-2">
                          <img src="/jazai-symbol.svg" alt="JAZai Logo" className="w-8 h-8" />
                          <span className="font-bold text-base text-gray-900">
                            <span className="font-black">JAZ</span><span className="text-teal-500">ai</span> Doc
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 text-center">Сделано при помощи JAZai — интеллектуальный медицинский ассистент</p>
                      </div>
                    </div>
                  </div>
                ))}

                {showCoupons && (
                  <CouponPage
                    doctorName={doctorProfile.name}
                    doctorPhone={doctorProfile.whatsapp || doctorProfile.telegram}
                    visitDate={result?.visitDate}
                  />
                )}
              </>
            )}

            {isTemplateSelectorOpen && (
              <TemplateSelector
                templates={selectorTemplates}
                patientName={result?.patientName || ''}
                onAttach={(newAttached) => {
                  setAttachedTemplates(prev => [...prev, ...newAttached]);
                  setIsTemplateSelectorOpen(false);
                }}
                onClose={() => setIsTemplateSelectorOpen(false)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
