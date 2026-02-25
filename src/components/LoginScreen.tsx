'use client';

import { useState } from 'react';
import { Stethoscope, Eye, EyeOff } from 'lucide-react';
import { setSessionToken } from '@/lib/client-auth';

interface LoginScreenProps {
    onLogin: (username: string, role: string, name: string, specialty: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 429) {
                    setError('Слишком много попыток. Попробуйте через 15 минут.');
                } else if (res.status === 403) {
                    setError('Аккаунт отключён. Обратитесь к администратору.');
                } else {
                    setError('Неверный логин или пароль');
                }
                return;
            }

            // Save signed session token
            if (data.token) {
                setSessionToken(data.token);
            }

            // Save session to localStorage
            localStorage.setItem('doctorSession', JSON.stringify({
                login: data.user.login,
                username: data.user.login,
                name: data.user.name,
                specialty: data.user.specialty || '',
                role: data.user.role,
                loginTime: new Date().toISOString(),
            }));

            onLogin(data.user.login, data.user.role, data.user.name, data.user.specialty || '');
        } catch {
            setError('Ошибка соединения. Попробуйте снова.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-sm animate-fadeInUp">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25 animate-pulseGlow">
                        <Stethoscope className="w-10 h-10 text-white drop-shadow-md" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent">JAZai Doc</h1>
                    <p className="text-gray-400 text-sm mt-1 font-medium">Войдите для начала работы</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="glass-card-solid rounded-2xl p-8 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Логин</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setError(''); }}
                            placeholder="Введите логин"
                            className="w-full input-medical py-3"
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Пароль</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                placeholder="Введите пароль"
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
                            'Войти'
                        )}
                    </button>
                </form>

                {/* Google OAuth */}
                <div className="flex items-center gap-3 mt-5 mb-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-gray-500 font-medium">или</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                <button
                    type="button"
                    onClick={() => { window.location.href = '/api/auth/google'; }}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/10 border border-white/20 text-gray-300 font-medium rounded-xl hover:bg-white/20 hover:text-white transition-all"
                >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Войти через Google
                </button>

                <p className="text-center text-[11px] text-gray-300 mt-6 font-medium">
                    © 2026 JAZai Doc
                </p>
            </div>
        </div>
    );
}
