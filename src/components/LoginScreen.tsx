'use client';

import { useState } from 'react';
import { Stethoscope, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (username: string) => void;
}

// Simple hardcoded credentials for MVP
// In production, replace with proper auth (e.g., NextAuth + Supabase)
const VALID_USERS: Record<string, string> = {
    'doctor': 'doctor123',
    'admin': 'admin123',
};

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

        // Simulate network delay for UX
        await new Promise(resolve => setTimeout(resolve, 400));

        const trimmedUser = username.trim().toLowerCase();

        if (VALID_USERS[trimmedUser] && VALID_USERS[trimmedUser] === password) {
            // Save session to localStorage
            localStorage.setItem('doctorSession', JSON.stringify({
                username: trimmedUser,
                loginTime: new Date().toISOString(),
            }));
            onLogin(trimmedUser);
        } else {
            setError('Неверный логин или пароль');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Stethoscope className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Doctor Assistant</h1>
                    <p className="text-gray-500 text-sm mt-1">Войдите для начала работы</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5 border border-gray-100">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Логин</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setError(''); }}
                            placeholder="Введите логин"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-400"
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                placeholder="Введите пароль"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-400 pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Войти'
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-400 mt-6">
                    © 2026 AI Doctor Assistant
                </p>
            </div>
        </div>
    );
}
