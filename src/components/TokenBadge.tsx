'use client';

import { MessageCircle, Coins } from 'lucide-react';

interface TokenBadgeProps {
    balance: number;
    doctorName?: string;
}

export function TokenBadge({ balance, doctorName }: TokenBadgeProps) {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '87051637041';

    const handleWhatsApp = () => {
        const text = encodeURIComponent(
            `Здравствуйте! Хочу пополнить токены в JAZai Doc.${doctorName ? ` Врач: ${doctorName}` : ''}`
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
    };

    const colorClass =
        balance <= 1
            ? 'text-red-600 bg-red-50 border-red-200'
            : balance <= 5
                ? 'text-amber-600 bg-amber-50 border-amber-200'
                : 'text-emerald-600 bg-emerald-50 border-emerald-200';

    return (
        <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-sm font-semibold ${colorClass}`}>
                <Coins className="w-3.5 h-3.5" />
                <span>{balance}</span>
                <span className="text-xs font-normal opacity-70">токенов</span>
            </div>
            <button
                onClick={handleWhatsApp}
                title="Связаться для пополнения токенов"
                className="p-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >
                <MessageCircle className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
