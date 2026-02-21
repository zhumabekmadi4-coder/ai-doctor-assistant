'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone } from 'lucide-react';
import { getSessionToken } from '@/lib/client-auth';

interface QRModalProps {
    onClose: () => void;
}

export function QRModal({ onClose }: QRModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [url, setUrl] = useState('');

    useEffect(() => {
        // Build the mobile URL using current host and pass auth token
        const token = getSessionToken();
        const mobileUrl = `${window.location.origin}/mobile${token ? `?token=${encodeURIComponent(token)}` : ''}`;
        setUrl(mobileUrl);

        if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, mobileUrl, {
                width: 220,
                margin: 2,
                color: { dark: '#1e3a5f', light: '#ffffff' },
            });
        }
    }, []);

    // Poll sessionStorage for result from mobile
    useEffect(() => {
        const interval = setInterval(() => {
            const raw = sessionStorage.getItem('mobileAnalysis');
            if (raw) {
                sessionStorage.removeItem('mobileAnalysis');
                // Dispatch custom event so main page can pick it up
                window.dispatchEvent(new CustomEvent('mobileAnalysisDone', { detail: JSON.parse(raw) }));
                onClose();
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full text-center"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold">Запись с телефона</span>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                    Отсканируйте QR-код телефоном и запишите консультацию. Результат появится здесь автоматически.
                </p>

                <div className="flex justify-center mb-4">
                    <canvas ref={canvasRef} className="rounded-lg" />
                </div>

                <p className="text-xs text-gray-400 break-all">{url}</p>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-600">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    Ожидаем результат с телефона...
                </div>
            </div>
        </div>
    );
}
