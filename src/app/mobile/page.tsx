'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Mic, Square, Save, FileText, Loader2, CheckCircle, AlertCircle,
    Users, User, ArrowLeft, Search, ChevronDown, ChevronUp,
    LogOut, RefreshCw, Trash2, Plus, Minus,
} from 'lucide-react';
import { LoginScreen } from '@/components/LoginScreen';
import { getSessionToken, setSessionToken, clearSessionToken, authFetch } from '@/lib/client-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppTab = 'record' | 'patients' | 'profile';
type RecordStatus = 'idle' | 'recording' | 'analyzing' | 'result' | 'saving' | 'saved' | 'error';

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

interface Patient {
    id: number;
    rowIndex?: number;
    patientName: string;
    dob: string;
    visitDate: string;
    diagnosis: string;
    treatment: string;
    complaints: string;
    anamnesis: string;
    recommendations: string;
    doctorName: string;
    savedAt: string;
}

interface DoctorProfile {
    name: string;
    specialty: string;
    customProcedures?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_PROCEDURES = [
    'HILT (высокоинтенсивная лазеротерапия)',
    'SIS (высокоинтенсивная магнитотерапия)',
    'УВТ (Ударно-волновая терапия)',
    'ИРТ (иглорефлексотерапия)',
    'ВТЭС (внутритканевая электростимуляция)',
    'PRP (плазматерапия)',
    'Кинезиотерапия',
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

function mapAIProcedures(aiProcs: Record<string, number>, list: string[]): Procedure[] {
    return list.map(name => {
        const shortKey = Object.keys(PROCEDURE_KEY_MAP).find(k => PROCEDURE_KEY_MAP[k] === name);
        return { name, quantity: shortKey ? (aiProcs[shortKey] ?? 0) : 0 };
    });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MobilePage() {
    // Auth
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userLogin, setUserLogin] = useState('');
    const [doctorProfile, setDoctorProfile] = useState<DoctorProfile>({ name: '', specialty: '' });
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);

    // Navigation
    const [activeTab, setActiveTab] = useState<AppTab>('record');

    // Recording
    const [recordStatus, setRecordStatus] = useState<RecordStatus>('idle');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Patients
    const [patients, setPatients] = useState<Patient[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [patientsLoading, setPatientsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [patientsLoaded, setPatientsLoaded] = useState(false);

    // ── Init auth ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) {
            setSessionToken(urlToken);
        }

        const session = localStorage.getItem('doctorSession');
        const token = getSessionToken();

        if (session || token) {
            const parsed = session ? JSON.parse(session) : null;
            const login = parsed?.login || '';
            setUserLogin(login);

            if (login) {
                const profileRaw = localStorage.getItem(`doctorProfile_${login}`);
                if (profileRaw) {
                    setDoctorProfile(JSON.parse(profileRaw));
                } else {
                    setDoctorProfile({
                        name: parsed?.name || '',
                        specialty: parsed?.specialty || '',
                    });
                }
            }

            setIsLoggedIn(true);
        }
    }, []);

    // ── Fetch token balance ────────────────────────────────────────────────────
    useEffect(() => {
        if (!isLoggedIn) return;
        authFetch('/api/tokens').then(r => r.json()).then(d => {
            if (typeof d.balance === 'number') setTokenBalance(d.balance);
        }).catch(() => { });
    }, [isLoggedIn]);

    // ── Procedures list ────────────────────────────────────────────────────────
    const proceduresList = doctorProfile.customProcedures ?? DEFAULT_PROCEDURES;

    // ── Recording ──────────────────────────────────────────────────────────────
    const startRecording = async () => {
        setErrorMsg('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await analyzeAudio(blob);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setRecordStatus('recording');
        } catch {
            setErrorMsg('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
            setRecordStatus('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current?.stop();
            setRecordStatus('analyzing');
        }
    };

    const analyzeAudio = async (blob: Blob) => {
        setRecordStatus('analyzing');
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');

            const response = await authFetch('/api/analyze', { method: 'POST', body: formData });

            if (response.status === 402) {
                setErrorMsg('Токены закончились. Пополните баланс.');
                setRecordStatus('error');
                return;
            }
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Ошибка анализа');
            }

            const data = await response.json();
            if (typeof data.tokenBalance === 'number') setTokenBalance(data.tokenBalance);

            setResult({
                ...data.analysis,
                procedures: mapAIProcedures(data.analysis.procedures || {}, proceduresList),
            });
            setRecordStatus('result');
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Ошибка анализа');
            setRecordStatus('error');
        }
    };

    const saveResult = async () => {
        if (!result) return;
        setRecordStatus('saving');

        const proceduresText = result.procedures
            .filter(p => p.quantity > 0)
            .map(p => `${p.name}: ${p.quantity}`)
            .join(', ');

        const dataToSave = {
            ...result,
            treatment: proceduresText
                ? `${result.treatment}\n\nПроцедуры: ${proceduresText}`
                : result.treatment,
            doctorLogin: userLogin,
        };

        try {
            const response = await authFetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Ошибка сохранения');
            }

            setRecordStatus('saved');
            setPatientsLoaded(false); // refresh patients next time
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Ошибка сохранения');
            setRecordStatus('error');
        }
    };

    const resetRecord = () => {
        setRecordStatus('idle');
        setResult(null);
        setErrorMsg('');
    };

    const updateProcedure = (idx: number, delta: number) => {
        if (!result) return;
        const procs = [...result.procedures];
        procs[idx] = { ...procs[idx], quantity: Math.max(0, procs[idx].quantity + delta) };
        setResult({ ...result, procedures: procs });
    };

    const setProcedureQty = (idx: number, qty: number) => {
        if (!result) return;
        const procs = [...result.procedures];
        procs[idx] = { ...procs[idx], quantity: Math.max(0, qty) };
        setResult({ ...result, procedures: procs });
    };

    // ── Patients ───────────────────────────────────────────────────────────────
    const fetchPatients = async () => {
        setPatientsLoading(true);
        try {
            const res = await authFetch('/api/patients');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
            setPatients(data.patients || []);
            setPatientsLoaded(true);
        } catch {
            setPatients([]);
        } finally {
            setPatientsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'patients' && isLoggedIn && !patientsLoaded) {
            fetchPatients();
        }
    }, [activeTab, isLoggedIn, patientsLoaded]);

    const filteredPatients = patients.filter(p => {
        const q = patientSearch.toLowerCase();
        return (
            p.patientName.toLowerCase().includes(q) ||
            p.diagnosis.toLowerCase().includes(q) ||
            p.visitDate.toLowerCase().includes(q)
        );
    });

    const deletePatient = async (patient: Patient) => {
        if (!confirm(`Удалить пациента «${patient.patientName}»?`)) return;
        try {
            await authFetch('/api/patients', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rowIndex: patient.rowIndex }),
            });
            setPatients(prev => prev.filter(p => p.id !== patient.id));
        } catch {
            alert('Ошибка удаления');
        }
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    const handleLogout = () => {
        localStorage.removeItem('doctorSession');
        clearSessionToken();
        setIsLoggedIn(false);
    };

    // ── Login handler ─────────────────────────────────────────────────────────
    const handleLogin = (username: string, _role: string, name: string, specialty: string) => {
        setUserLogin(username);
        const profileRaw = localStorage.getItem(`doctorProfile_${username}`);
        if (profileRaw) {
            setDoctorProfile(JSON.parse(profileRaw));
        } else {
            setDoctorProfile({ name: name || '', specialty: specialty || '' });
        }
        setIsLoggedIn(true);
    };

    // ── Guard ─────────────────────────────────────────────────────────────────
    if (!isLoggedIn) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto">

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm">
                <img src="/jazai-symbol.svg" alt="JAZai" className="w-8 h-8" />
                <div className="flex-1">
                    <h1 className="font-bold text-slate-900 leading-none">
                        <span className="font-black">JAZ</span><span className="text-teal-500">ai</span> Doc
                    </h1>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">{doctorProfile.name || 'Медицинский ассистент'}</p>
                </div>
                {tokenBalance !== null && (
                    <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                        {tokenBalance} токенов
                    </div>
                )}
            </header>

            {/* ── Content ── */}
            <div className="flex-1 overflow-y-auto pb-20">

                {/* ═══════════ TAB: ЗАПИСЬ ═══════════ */}
                {activeTab === 'record' && (
                    <div className="p-4 space-y-4">

                        {/* IDLE */}
                        {recordStatus === 'idle' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
                                <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center shadow-xl shadow-slate-900/20">
                                    <Mic className="w-12 h-12 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Новый приём</h2>
                                    <p className="text-slate-500 text-sm mt-2">
                                        Нажмите кнопку и диктуйте консультацию
                                    </p>
                                </div>
                                <button
                                    onClick={startRecording}
                                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-slate-800 active:scale-95 transition-all"
                                >
                                    <Mic className="w-6 h-6" />
                                    Начать запись
                                </button>
                            </div>
                        )}

                        {/* RECORDING */}
                        {recordStatus === 'recording' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center space-y-6">
                                <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-b from-red-500 to-red-600 flex items-center justify-center shadow-xl shadow-red-500/30 animate-pulse">
                                    <Mic className="w-12 h-12 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-2 text-red-600 font-semibold text-lg">
                                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                        Идёт запись...
                                    </div>
                                    <p className="text-slate-500 text-sm mt-2">Говорите чётко. Нажмите «Стоп» когда закончите.</p>
                                </div>
                                <button
                                    onClick={stopRecording}
                                    className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-red-700 active:scale-95 transition-all"
                                >
                                    <Square className="w-6 h-6 fill-current" />
                                    Завершить запись
                                </button>
                            </div>
                        )}

                        {/* ANALYZING */}
                        {recordStatus === 'analyzing' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center space-y-4">
                                <Loader2 className="w-16 h-16 text-teal-600 animate-spin mx-auto" />
                                <p className="text-slate-700 font-semibold text-lg">Анализируем запись...</p>
                                <p className="text-slate-400 text-sm">ИИ обрабатывает консультацию</p>
                            </div>
                        )}

                        {/* SAVING */}
                        {recordStatus === 'saving' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center space-y-4">
                                <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto" />
                                <p className="text-slate-700 font-semibold text-lg">Сохраняем...</p>
                            </div>
                        )}

                        {/* SAVED */}
                        {recordStatus === 'saved' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8 text-center space-y-4">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                                <p className="text-green-700 font-bold text-xl">Успешно сохранено!</p>
                                <p className="text-slate-500 text-sm">Запись добавлена в базу пациентов.</p>
                                <button
                                    onClick={resetRecord}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
                                >
                                    Новая запись
                                </button>
                            </div>
                        )}

                        {/* ERROR */}
                        {recordStatus === 'error' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center space-y-4">
                                <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                                <p className="text-red-700 font-bold text-lg">Ошибка</p>
                                <p className="text-slate-600 text-sm">{errorMsg}</p>
                                <button
                                    onClick={resetRecord}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
                                >
                                    Попробовать снова
                                </button>
                            </div>
                        )}

                        {/* RESULT — полная форма редактирования */}
                        {recordStatus === 'result' && result && (
                            <div className="space-y-4">
                                {/* Toolbar */}
                                <div className="flex items-center justify-between">
                                    <button onClick={resetRecord} className="flex items-center gap-1.5 text-slate-500 text-sm">
                                        <ArrowLeft className="w-4 h-4" />
                                        Назад
                                    </button>
                                    <button
                                        onClick={saveResult}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-teal-700 active:scale-95 transition-all"
                                    >
                                        <Save className="w-4 h-4" />
                                        Сохранить
                                    </button>
                                </div>

                                {/* Карта пациента */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-teal-600 px-4 py-3 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-white" />
                                        <span className="text-white font-semibold">Карта консультации</span>
                                    </div>
                                    <div className="p-4 space-y-4">

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">ФИО Пациента</label>
                                                <input
                                                    type="text"
                                                    value={result.patientName}
                                                    onChange={e => setResult({ ...result, patientName: e.target.value })}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Дата рождения</label>
                                                <input
                                                    type="text"
                                                    value={result.dob}
                                                    onChange={e => setResult({ ...result, dob: e.target.value })}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Жалобы</label>
                                            <textarea
                                                rows={3}
                                                value={result.complaints}
                                                onChange={e => setResult({ ...result, complaints: e.target.value })}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Анамнез</label>
                                            <textarea
                                                rows={3}
                                                value={result.anamnesis}
                                                onChange={e => setResult({ ...result, anamnesis: e.target.value })}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 resize-none"
                                            />
                                        </div>

                                        <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-1">Диагноз</label>
                                            <input
                                                type="text"
                                                value={result.diagnosis}
                                                onChange={e => setResult({ ...result, diagnosis: e.target.value })}
                                                className="w-full border border-teal-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Лечение</label>
                                            <textarea
                                                rows={3}
                                                value={result.treatment}
                                                onChange={e => setResult({ ...result, treatment: e.target.value })}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 resize-none"
                                            />
                                        </div>

                                        {/* Процедуры */}
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Процедуры</label>
                                            <div className="space-y-2">
                                                {result.procedures.map((proc, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <span className="flex-1 text-sm text-slate-700">{proc.name}</span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                onClick={() => updateProcedure(idx, -1)}
                                                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={proc.quantity || ''}
                                                                onChange={e => setProcedureQty(idx, parseInt(e.target.value) || 0)}
                                                                className={`w-10 h-7 text-center text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${proc.quantity > 0 ? 'border-teal-300 text-teal-800 font-bold bg-teal-50' : 'border-slate-200 text-slate-400 bg-white'}`}
                                                                placeholder="0"
                                                            />
                                                            <button
                                                                onClick={() => updateProcedure(idx, 1)}
                                                                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 active:scale-95 transition-all"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Рекомендации</label>
                                            <textarea
                                                rows={3}
                                                value={result.recommendations}
                                                onChange={e => setResult({ ...result, recommendations: e.target.value })}
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 resize-none"
                                            />
                                        </div>

                                    </div>
                                </div>

                                {/* Save button bottom */}
                                <button
                                    onClick={saveResult}
                                    className="w-full py-4 bg-teal-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 shadow-lg shadow-teal-600/25 hover:bg-teal-700 active:scale-95 transition-all"
                                >
                                    <Save className="w-5 h-5" />
                                    Сохранить пациента
                                </button>
                            </div>
                        )}

                    </div>
                )}

                {/* ═══════════ TAB: ПАЦИЕНТЫ ═══════════ */}
                {activeTab === 'patients' && (
                    <div className="p-4 space-y-3">
                        {/* Search + refresh */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Поиск по имени, диагнозу..."
                                    value={patientSearch}
                                    onChange={e => setPatientSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <button
                                onClick={() => { setPatientsLoaded(false); }}
                                className="p-2.5 border border-slate-200 rounded-xl bg-white text-slate-500 hover:bg-slate-50"
                            >
                                <RefreshCw className={`w-4 h-4 ${patientsLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {patientsLoading && (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                            </div>
                        )}

                        {!patientsLoading && filteredPatients.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p className="font-medium">Пациентов не найдено</p>
                            </div>
                        )}

                        {filteredPatients.map(patient => (
                            <div key={patient.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <button
                                    className="w-full text-left p-4"
                                    onClick={() => setExpandedId(expandedId === patient.id ? null : patient.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5 text-teal-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900 truncate">{patient.patientName}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{patient.diagnosis}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{patient.visitDate}</p>
                                        </div>
                                        {expandedId === patient.id
                                            ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                                            : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                                        }
                                    </div>
                                </button>

                                {expandedId === patient.id && (
                                    <div className="border-t border-slate-100 px-4 pb-4 space-y-3">
                                        {patient.complaints && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Жалобы</p>
                                                <p className="text-sm text-slate-700">{patient.complaints}</p>
                                            </div>
                                        )}
                                        {patient.anamnesis && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Анамнез</p>
                                                <p className="text-sm text-slate-700">{patient.anamnesis}</p>
                                            </div>
                                        )}
                                        {patient.treatment && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Лечение</p>
                                                <p className="text-sm text-slate-700">{patient.treatment}</p>
                                            </div>
                                        )}
                                        {patient.recommendations && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Рекомендации</p>
                                                <p className="text-sm text-slate-700">{patient.recommendations}</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => deletePatient(patient)}
                                            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 mt-2 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Удалить запись
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* ═══════════ TAB: ПРОФИЛЬ ═══════════ */}
                {activeTab === 'profile' && (
                    <div className="p-4 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl">
                                    {doctorProfile.name?.charAt(0) || <User className="w-8 h-8" />}
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 text-lg">{doctorProfile.name || '—'}</h2>
                                    <p className="text-slate-500 text-sm">{doctorProfile.specialty || 'Врач'}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">@{userLogin}</p>
                                </div>
                            </div>

                            {tokenBalance !== null && (
                                <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 mb-4">
                                    <p className="text-xs text-teal-600 font-semibold uppercase tracking-wider mb-1">Баланс токенов</p>
                                    <p className={`text-2xl font-bold ${tokenBalance <= 5 ? 'text-red-600' : 'text-teal-700'}`}>
                                        {tokenBalance}
                                    </p>
                                    {tokenBalance <= 5 && (
                                        <p className="text-xs text-red-500 mt-1">Баланс заканчивается</p>
                                    )}
                                </div>
                            )}

                            {doctorProfile.customProcedures && doctorProfile.customProcedures.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Процедуры</p>
                                    <div className="space-y-1">
                                        {doctorProfile.customProcedures.map((p, i) => (
                                            <p key={i} className="text-sm text-slate-600">• {p}</p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleLogout}
                                className="w-full py-3 flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Выйти из аккаунта
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* ── Bottom Navigation ── */}
            <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-200 flex z-40 shadow-lg">
                <NavTab
                    active={activeTab === 'record'}
                    onClick={() => setActiveTab('record')}
                    icon={<Mic className="w-5 h-5" />}
                    label="Запись"
                />
                <NavTab
                    active={activeTab === 'patients'}
                    onClick={() => setActiveTab('patients')}
                    icon={<Users className="w-5 h-5" />}
                    label="Пациенты"
                />
                <NavTab
                    active={activeTab === 'profile'}
                    onClick={() => setActiveTab('profile')}
                    icon={<User className="w-5 h-5" />}
                    label="Профиль"
                />
            </nav>
        </div>
    );
}

// ─── NavTab ───────────────────────────────────────────────────────────────────

function NavTab({ active, onClick, icon, label }: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
            {icon}
            <span className="text-[10px] font-semibold">{label}</span>
            {active && <span className="absolute bottom-0 h-0.5 w-8 bg-teal-500 rounded-t-full" />}
        </button>
    );
}
