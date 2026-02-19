'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginScreen } from '@/components/LoginScreen';
import { Search, ArrowLeft, User, Calendar, Stethoscope, ChevronDown, ChevronUp, Loader2, RefreshCw, ExternalLink, Trash2 } from 'lucide-react';
import { authFetch } from '@/lib/client-auth';

interface Patient {
    rowIndex?: number;
    id: number;
    patientName: string;
    dob: string;
    visitDate: string;
    complaints: string;
    anamnesis: string;
    diagnosis: string;
    treatment: string;
    recommendations: string;
    doctorName: string;
    savedAt: string;
}

export default function PatientsPage() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [filtered, setFiltered] = useState<Patient[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        const session = localStorage.getItem('doctorSession');
        if (session) {
            setIsLoggedIn(true);
            fetchPatients();
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchPatients = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await authFetch('/api/patients');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
            setPatients(data.patients);
            setFiltered(data.patients);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(
            patients.filter(p =>
                p.patientName.toLowerCase().includes(q) ||
                p.diagnosis.toLowerCase().includes(q) ||
                p.visitDate.toLowerCase().includes(q)
            )
        );
    }, [search, patients]);

    const handleDelete = async (e: React.MouseEvent, patient: Patient) => {
        e.stopPropagation();
        if (!confirm(`Вы уверены, что хотите удалить пациента "${patient.patientName}"?`)) return;

        try {
            const res = await authFetch('/api/patients', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rowIndex: patient.rowIndex }),
            });

            if (!res.ok) throw new Error('Не удалось удалить запись');

            // Optimistic update
            const newPatients = patients.filter(p => p.id !== patient.id);
            setPatients(newPatients);
            setFiltered(newPatients.filter(p =>
                p.patientName.toLowerCase().includes(search.toLowerCase()) ||
                p.diagnosis.toLowerCase().includes(search.toLowerCase())
            ));
        } catch (error) {
            alert('Ошибка удаления: ' + error);
        }
    };

    if (!isLoggedIn) {
        return <LoginScreen onLogin={() => { setIsLoggedIn(true); fetchPatients(); }} />;
    }

    const formatDate = (iso: string) => {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch { return iso; }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-gray-900">База пациентов</h1>
                        <p className="text-xs text-gray-500">{patients.length} записей</p>
                    </div>
                    <button
                        onClick={fetchPatients}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                        title="Обновить"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск по ФИО, диагнозу, дате..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm"
                    />
                </div>

                {/* States */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mr-3" />
                        <span>Загрузка данных...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                        Ошибка: {error}
                    </div>
                )}

                {!isLoading && !error && filtered.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Пациенты не найдены</p>
                        <p className="text-sm mt-1">Попробуйте изменить запрос</p>
                    </div>
                )}

                {/* Patient Cards */}
                {!isLoading && filtered.map((patient) => (
                    <div
                        key={patient.id}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                        {/* Card Header */}
                        {/* Card Header */}
                        <div
                            className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => setExpandedId(expandedId === patient.id ? null : patient.id)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0">
                                {patient.patientName.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{patient.patientName || 'Без имени'}</p>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                                    {patient.visitDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {patient.visitDate}
                                        </span>
                                    )}
                                    {patient.diagnosis && (
                                        <span className="flex items-center gap-1">
                                            <Stethoscope className="w-3 h-3" />
                                            <span className="truncate max-w-[200px]">{patient.diagnosis}</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => handleDelete(e, patient)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Удалить запись"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                {expandedId === patient.id
                                    ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                }
                            </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedId === patient.id && (
                            <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50">
                                {[
                                    { label: 'Дата рождения', value: patient.dob },
                                    { label: 'Жалобы', value: patient.complaints },
                                    { label: 'Анамнез', value: patient.anamnesis },
                                    { label: 'Диагноз', value: patient.diagnosis },
                                    { label: 'Лечение', value: patient.treatment },
                                    { label: 'Рекомендации', value: patient.recommendations },
                                    { label: 'Врач', value: patient.doctorName },
                                    { label: 'Сохранено', value: formatDate(patient.savedAt) },
                                ].filter(f => f.value).map(field => (
                                    <div key={field.label}>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{field.label}</p>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{field.value}</p>
                                    </div>
                                ))}

                                {/* Open in consultation page */}
                                <div className="pt-2">
                                    <button
                                        onClick={() => {
                                            sessionStorage.setItem('openPatient', JSON.stringify(patient));
                                            router.push('/');
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Открыть консультацию
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))
                }
            </div >
        </div >
    );
}
