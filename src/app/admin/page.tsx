'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Trash2, RefreshCw, ArrowLeft, Shield, Eye, EyeOff, CheckCircle, XCircle, CreditCard } from 'lucide-react';

interface User {
    rowIndex: number;
    login: string;
    name: string;
    specialty: string;
    role: string;
    active: boolean;
}

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Credits state
    const [credits, setCredits] = useState<{ remaining: number; total: number; used: number; clinicName: string; unlimited: boolean } | null>(null);

    const [form, setForm] = useState({
        login: '',
        password: '',
        name: '',
        specialty: '',
        role: 'doctor',
    });

    // Check if current user is admin
    useEffect(() => {
        const session = localStorage.getItem('doctorSession');
        if (!session) {
            router.push('/');
            return;
        }
        const parsed = JSON.parse(session);
        if (parsed.role !== 'admin') {
            router.push('/');
        }
    }, [router]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setUsers(data.users);
        } catch (err) {
            setError('Не удалось загрузить пользователей');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Load credits on mount
    useEffect(() => {
        const session = localStorage.getItem('doctorSession');
        if (!session) return;
        try {
            const parsed = JSON.parse(session);
            fetch(`/api/credits?login=${encodeURIComponent(parsed.login)}`)
                .then(r => r.json())
                .then(data => {
                    if (!data.error) {
                        setCredits({
                            remaining: data.remainingCredits,
                            total: data.totalCredits,
                            used: data.usedCredits,
                            clinicName: data.clinicName,
                            unlimited: data.unlimited || false,
                        });
                    }
                })
                .catch(() => { });
        } catch { }
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSuccessMsg(`Врач "${form.name}" успешно добавлен!`);
            setForm({ login: '', password: '', name: '', specialty: '', role: 'doctor' });
            setShowForm(false);
            loadUsers();
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            setError('Ошибка при создании пользователя');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (login: string, name: string) => {
        if (!confirm(`Деактивировать аккаунт "${name}" (${login})?`)) return;
        try {
            const res = await fetch('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login }),
            });
            if (!res.ok) throw new Error('Delete failed');
            setSuccessMsg(`Аккаунт "${name}" деактивирован`);
            loadUsers();
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch {
            setError('Ошибка при удалении');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Управление пользователями</h1>
                                <p className="text-xs text-gray-500">Только для администратора</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadUsers}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Обновить"
                        >
                            <RefreshCw className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Добавить врача
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Success message */}
                {successMsg && (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-200">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        {successMsg}
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100">
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Credits Card */}
                {credits && !credits.unlimited && (
                    <div className={`rounded-2xl shadow-sm border p-6 ${credits.remaining <= 0 ? 'bg-red-50 border-red-200' :
                            credits.remaining < 10 ? 'bg-amber-50 border-amber-200' :
                                'bg-white border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${credits.remaining <= 0 ? 'bg-red-600' :
                                        credits.remaining < 10 ? 'bg-amber-500' :
                                            'bg-emerald-600'
                                    }`}>
                                    <CreditCard className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Консультации</h3>
                                    <p className="text-xs text-gray-500">{credits.clinicName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-3xl font-bold ${credits.remaining <= 0 ? 'text-red-600' :
                                        credits.remaining < 10 ? 'text-amber-600' :
                                            'text-emerald-600'
                                    }`}>
                                    {credits.remaining}
                                </p>
                                <p className="text-xs text-gray-500">из {credits.total} осталось</p>
                            </div>
                        </div>
                        {credits.remaining <= 0 && (
                            <div className="mt-3 px-3 py-2 bg-red-100 rounded-lg text-sm text-red-700 font-medium">
                                ⚠️ Кредиты закончились. Врачи не могут сохранять консультации.
                            </div>
                        )}
                        {credits.remaining > 0 && credits.remaining < 10 && (
                            <div className="mt-3 px-3 py-2 bg-amber-100 rounded-lg text-sm text-amber-700">
                                Осталось мало кредитов. Пополните баланс.
                            </div>
                        )}
                        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${credits.remaining <= 0 ? 'bg-red-500' :
                                        credits.remaining < 10 ? 'bg-amber-500' :
                                            'bg-emerald-500'
                                    }`}
                                style={{ width: `${Math.max(0, Math.min(100, (credits.remaining / credits.total) * 100))}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Add Doctor Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-600" />
                            Новый врач
                        </h2>
                        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Иванов Иван Иванович"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Специальность</label>
                                <input
                                    type="text"
                                    value={form.specialty}
                                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                                    placeholder="Невролог"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Логин *</label>
                                <input
                                    type="text"
                                    value={form.login}
                                    onChange={(e) => setForm({ ...form, login: e.target.value.toLowerCase() })}
                                    placeholder="dr_ivanov"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        placeholder="Минимум 6 символов"
                                        minLength={6}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                    <option value="doctor">Врач</option>
                                    <option value="admin">Администратор</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2 flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    Создать аккаунт
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Users List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-gray-900">
                            Пользователи
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                ({users.filter(u => u.active).length} активных)
                            </span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Нет пользователей</p>
                            <p className="text-sm mt-1">Добавьте первого врача</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {users.map((user) => (
                                <div
                                    key={user.login}
                                    className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${!user.active ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${user.role === 'admin' ? 'bg-purple-600' : 'bg-blue-500'}`}>
                                            {user.name ? user.name[0].toUpperCase() : user.login[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{user.name || user.login}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {user.role === 'admin' ? 'Администратор' : 'Врач'}
                                                </span>
                                                {!user.active && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                                        Деактивирован
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                @{user.login}
                                                {user.specialty && <span className="ml-2">· {user.specialty}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {user.active && (
                                        <button
                                            onClick={() => handleDelete(user.login, user.name || user.login)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Деактивировать"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info box */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                    <strong>Важно:</strong> При деактивации врач теряет доступ к системе. Данные пациентов сохраняются. Для полного удаления — удалите строку из Google Sheets вручную.
                </div>
            </div>
        </div>
    );
}
