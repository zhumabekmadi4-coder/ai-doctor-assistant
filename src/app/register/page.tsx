'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Stethoscope, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { setSessionToken } from '@/lib/client-auth';

function RegisterForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const token = searchParams.get('token') || '';
    const googleName = searchParams.get('name') || '';
    const googleEmail = searchParams.get('email') || '';

    const [name, setName] = useState(googleName);
    const [specialty, setSpecialty] = useState('');
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);

    // Suggest login from email prefix
    useEffect(() => {
        if (googleEmail && !login) {
            const suggested = googleEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
            setLogin(suggested);
        }
    }, [googleEmail]);

    // Redirect if no token
    useEffect(() => {
        if (!token) {
            router.replace('/');
        }
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, login, password, name, specialty }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Ошибка регистрации');
                return;
            }

            // Save session
            if (data.token) {
                setSessionToken(data.token);
            }
            localStorage.setItem('doctorSession', JSON.stringify({
                login: data.user.login,
                username: data.user.login,
                name: data.user.name,
                specialty: data.user.specialty || '',
                role: data.user.role,
                loginTime: new Date().toISOString(),
            }));

            setDone(true);
            setTimeout(() => router.replace('/'), 1500);
        } catch {
            setError('Ошибка соединения. Попробуйте снова.');
        } finally {
            setIsLoading(false);
        }
    };

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center animate-fadeInUp">
                    <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Аккаунт создан!</h2>
                    <p className="text-gray-400 text-sm">Перенаправляем...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm animate-fadeInUp">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
                        <Stethoscope className="w-10 h-10 text-white drop-shadow-md" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent">
                        JAZai Doc
                    </h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium">Создайте аккаунт</p>
                    {googleEmail && (
                        <p className="text-gray-500 text-xs mt-1">{googleEmail}</p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="glass-card-solid rounded-2xl p-8 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                            ФИО
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setError(''); }}
                            placeholder="Иванов Иван Иванович"
                            className="w-full input-medical py-3"
                            required
                        />
                    </div>

                    {/* Specialty */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                            Специальность
                        </label>
                        <input
                            type="text"
                            value={specialty}
                            onChange={(e) => { setSpecialty(e.target.value); setError(''); }}
                            placeholder="Невролог, терапевт..."
                            className="w-full input-medical py-3"
                        />
                    </div>

                    {/* Login */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                            Логин
                        </label>
                        <input
                            type="text"
                            value={login}
                            onChange={(e) => { setLogin(e.target.value.toLowerCase()); setError(''); }}
                            placeholder="dr_ivanov"
                            className="w-full input-medical py-3"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Только латиница, цифры, _ . -</p>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                            Пароль
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                placeholder="Минимум 6 символов"
                                className="w-full input-medical py-3 pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-500 transition-colors cursor-pointer"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm password */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                            Повтор пароля
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                            placeholder="Повторите пароль"
                            className="w-full input-medical py-3"
                            required
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 animate-fadeInUp">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Создать аккаунт'
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.replace('/')}
                        className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-1"
                    >
                        Отмена
                    </button>
                </form>

                <p className="text-center text-[11px] text-gray-300 mt-6 font-medium">
                    © 2026 JAZai Doc
                </p>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense>
            <RegisterForm />
        </Suspense>
    );
}
