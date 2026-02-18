'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Mic, Square, Save, FileText, Loader2, Printer, Edit2, LogOut, Users, QrCode, Shield } from 'lucide-react';
import { DoctorProfileModal } from '@/components/DoctorProfileModal';
import { LoginScreen } from '@/components/LoginScreen';
import { QRModal } from '@/components/QRModal';

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

function mapAIProcedures(aiProcs: Record<string, number>): Procedure[] {
  return DEFAULT_PROCEDURES.map(name => {
    const shortKey = Object.keys(PROCEDURE_KEY_MAP).find(k => PROCEDURE_KEY_MAP[k] === name);
    return { name, quantity: shortKey ? (aiProcs[shortKey] ?? 0) : 0 };
  });
}

interface DoctorProfile {
  name: string;
  specialty: string;
  license: string;
  avatarUrl?: string;
  experience?: string;
  whatsapp?: string;
  telegram?: string;
}

function HomeContent() {
  const router = useRouter();
  const { isRecording, startRecording, stopRecording, audioBlob, resetRecording } = useAudioRecorder();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('doctor');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({
    name: 'Др. Жума',
    specialty: 'Невролог',
    license: ''
  });

  // Init: auth check, profile load, patient from sessionStorage, mobile listener
  useEffect(() => {
    // Auth
    const session = localStorage.getItem('doctorSession');
    if (session) {
      setIsLoggedIn(true);
      try {
        const parsed = JSON.parse(session);
        if (parsed.role) setUserRole(parsed.role);
        if (parsed.name) setDoctorProfile(prev => ({ ...prev, name: parsed.name }));
      } catch { }
    }

    // Doctor profile
    const saved = localStorage.getItem('doctorProfile');
    if (saved) setDoctorProfile(JSON.parse(saved));

    // Patient reopened from patients list
    const patientRaw = sessionStorage.getItem('openPatient');
    if (patientRaw) {
      sessionStorage.removeItem('openPatient');
      try {
        const p = JSON.parse(patientRaw);
        setResult({
          patientName: p.patientName || '',
          dob: p.dob || '',
          visitDate: p.visitDate || '',
          complaints: p.complaints || '',
          anamnesis: p.anamnesis || '',
          diagnosis: p.diagnosis || '',
          treatment: p.treatment || '',
          recommendations: p.recommendations || '',
          procedures: DEFAULT_PROCEDURES.map(name => ({ name, quantity: 0 })),
        });
      } catch (e) {
        console.error('Failed to parse openPatient', e);
      }
    }

    // Mobile analysis result listener
    const handleMobileAnalysis = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data) return;
      setResult({
        ...data,
        procedures: mapAIProcedures(data.procedures || {}),
      });
    };
    window.addEventListener('mobileAnalysisDone', handleMobileAnalysis);
    return () => window.removeEventListener('mobileAnalysisDone', handleMobileAnalysis);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('doctorSession');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={(username, role, name) => {
      setIsLoggedIn(true);
      setUserRole(role);
      if (name) setDoctorProfile(prev => ({ ...prev, name }));
    }} />;
  }

  const handleSaveProfile = (newProfile: DoctorProfile) => {
    setDoctorProfile(newProfile);
    localStorage.setItem('doctorProfile', JSON.stringify(newProfile));
    setIsProfileOpen(false);
  };

  const handleAnalyze = async () => {
    if (!audioBlob) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      setResult({
        ...data.analysis,
        procedures: mapAIProcedures(data.analysis.procedures || {}),
      });
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Ошибка анализа записи');
    } finally {
      setIsAnalyzing(false);
    }
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
      doctor: doctorProfile
    };
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      alert('Данные успешно сохранены в Google Таблицу!');
    } catch (error: any) {
      alert(`Ошибка сохранения: ${error.message}`);
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
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900 print:bg-white print:p-0">
      <DoctorProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSave={handleSaveProfile}
        initialProfile={doctorProfile}
      />
      {isQROpen && <QRModal onClose={() => setIsQROpen(false)} />}

      <div className="max-w-4xl mx-auto space-y-8 print:w-[210mm] print:max-w-none print:space-y-4 print:mx-auto">

        {/* Header - Print Only — only shown if header.jpg is uploaded to /public */}
        <div className="hidden print:block mb-6">
          <img src="/header.jpg" alt="Header" className="w-full h-auto object-contain max-h-[150px]" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>

        {/* Header - Screen Only */}
        <header className="flex justify-between items-center border-b pb-6 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">AI Doctor Assistant</h1>
            <p className="text-gray-500">Голосовой ассистент врача</p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => router.push('/patients')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Пациенты</span>
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Управление пользователями"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Админ</span>
              </button>
            )}

            <button
              onClick={() => setIsQROpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Запись с телефона"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">С телефона</span>
            </button>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 hover:bg-gray-100 p-2 rounded-lg transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-200 transition-colors overflow-hidden">
                {doctorProfile.avatarUrl ? (
                  <img src={doctorProfile.avatarUrl} className="w-full h-full rounded-full object-cover" />
                ) : (
                  doctorProfile.name.charAt(0)
                )}
              </div>
              <div className="text-left">
                <span className="font-medium block leading-none text-gray-900">{doctorProfile.name}</span>
                <span className="text-xs text-gray-500">{doctorProfile.specialty}</span>
              </div>
              <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Recording Controls */}
        {!result && (
          <section className="bg-white rounded-xl shadow-sm p-8 text-center space-y-6 print:hidden">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-blue-50'}`}>
              <Mic className={`w-10 h-10 ${isRecording ? 'text-red-500' : 'text-blue-500'}`} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {isRecording ? 'Идет запись консультации...' : 'Начать консультацию'}
              </h2>
              <p className="text-gray-500 text-sm">
                {isRecording ? 'Говорите четко. Нажмите стоп для анализа.' : 'Нажмите кнопку чтобы начать запись'}
              </p>
            </div>
            <div className="flex justify-center gap-4">
              {!isRecording && !audioBlob && (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Mic className="w-5 h-5" />
                  Начать запись
                </button>
              )}
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                >
                  <Square className="w-5 h-5 fill-current" />
                  Остановить
                </button>
              )}
              {audioBlob && !isRecording && (
                <div className="flex gap-4">
                  <button
                    onClick={resetRecording}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    disabled={isAnalyzing}
                  >
                    Записать заново
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                    {isAnalyzing ? 'Анализирую...' : 'Анализировать'}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Results Form */}
        {result && (
          <main className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
            <div className="p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center print:hidden">
              <h2 className="text-lg font-semibold text-blue-800">Результаты анализа</h2>
              <div className="flex gap-2">
                <button onClick={() => setResult(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Назад
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Печать / PDF
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 print:p-0 print:space-y-4">
              <div className="text-center mb-8 border-b pb-4 hidden print:block">
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">Консультационный Лист</h1>
                <p className="text-gray-500 mt-1">{result.visitDate || new Date().toLocaleDateString('ru-RU')}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 print:gap-4 text-sm">
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block uppercase text-xs tracking-wider">ФИО Пациента</label>
                  <input
                    type="text"
                    value={result.patientName}
                    onChange={(e) => setResult({ ...result, patientName: e.target.value })}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:p-0 print:text-lg print:font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-gray-700 block uppercase text-xs tracking-wider">Дата рождения</label>
                  <input
                    type="text"
                    value={result.dob}
                    onChange={(e) => setResult({ ...result, dob: e.target.value })}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:p-0 print:text-lg"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="font-bold text-gray-700 block uppercase text-xs tracking-wider">Жалобы</label>
                <textarea
                  rows={2}
                  value={result.complaints}
                  onChange={(e) => setResult({ ...result, complaints: e.target.value })}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:p-0 print:resize-none print:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 block uppercase text-xs tracking-wider">Анамнез</label>
                <textarea
                  rows={3}
                  value={result.anamnesis}
                  onChange={(e) => setResult({ ...result, anamnesis: e.target.value })}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:p-0 print:resize-none print:text-sm"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 print:bg-transparent print:border-none print:p-0 print:mt-4">
                <label className="font-bold text-gray-900 block mb-2 uppercase text-xs tracking-wider">Предварительный диагноз</label>
                <input
                  type="text"
                  value={result.diagnosis}
                  onChange={(e) => setResult({ ...result, diagnosis: e.target.value })}
                  className="w-full p-2 bg-white border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg text-blue-900 print:text-black print:border-none print:p-0 print:bg-transparent"
                />
              </div>

              {/* Procedures */}
              <div className="space-y-4 print:mt-6">
                <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider border-b pb-1">План Лечения (Процедуры)</h3>
                <div className="grid grid-cols-1 gap-1">
                  {result.procedures?.map((proc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg print:p-0 print:hover:bg-transparent print:py-1">
                      <span className="text-gray-800 print:text-black text-sm">{proc.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="0"
                            value={proc.quantity || ''}
                            onChange={(e) => updateProcedure(idx, parseInt(e.target.value) || 0)}
                            className={`w-16 p-1 border rounded text-right focus:ring-blue-500 focus:border-blue-500 
                              print:border-none print:w-auto print:text-right print:font-bold 
                              ${proc.quantity > 0 ? 'print:text-black' : 'print:text-transparent'}`}
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500 ml-1 print:hidden">сеанс(ов)</span>
                          <span className={`hidden print:inline ml-1 text-sm ${proc.quantity > 0 ? 'text-black' : 'text-transparent'}`}>сеанс(ов)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 print:mt-4">
                <label className="font-bold text-gray-700 block uppercase text-xs tracking-wider">Дополнительные рекомендации</label>
                <textarea
                  rows={3}
                  value={result.recommendations}
                  onChange={(e) => setResult({ ...result, recommendations: e.target.value })}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 print:border-none print:p-0 print:resize-none print:text-sm"
                />
              </div>

              {/* Footer - Print Only */}
              <div className="hidden print:flex flex-row justify-between items-end mt-8 pt-8 border-t border-gray-300">
                <div className="flex items-start gap-4">
                  {doctorProfile.avatarUrl && (
                    <img src={doctorProfile.avatarUrl} alt="Doctor" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                  )}
                  <div className="text-sm">
                    <p className="font-bold text-gray-900">{doctorProfile.name}</p>
                    <p className="text-gray-600 italic">{doctorProfile.specialty}</p>
                    {doctorProfile.experience && <p className="text-xs text-gray-500 mt-1">Стаж: {doctorProfile.experience}</p>}
                    {doctorProfile.license && <p className="text-xs text-gray-500">{doctorProfile.license}</p>}
                    <div className="mt-2 space-y-0.5 text-xs text-gray-600">
                      {doctorProfile.whatsapp && <p>WhatsApp: {doctorProfile.whatsapp}</p>}
                      {doctorProfile.telegram && <p>Telegram: {doctorProfile.telegram}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <img src="/footer_qr.jpg" alt="Info" className="w-24 h-24 object-contain mb-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              </div>

            </div>
          </main>
        )}
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
