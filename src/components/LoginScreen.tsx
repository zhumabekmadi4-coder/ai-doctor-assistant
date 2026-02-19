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

                <p className="text-center text-[11px] text-gray-300 mt-6 font-medium">
                    © 2026 JAZai Doc
                </p>
            </div>
        </div>
    );
}
