'use client';

import { AlertTriangle, MessageCircle, X, Info } from 'lucide-react';

interface TokenWarningModalProps {
    remaining: number;
    doctorName?: string;
    onClose: () => void;
}

export function TokenWarningModal({ remaining, doctorName, onClose }: TokenWarningModalProps) {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '87051637041';

    const handleWhatsApp = () => {
        const text = encodeURIComponent(
            `Здравствуйте! Токены заканчиваются в JAZai Doc, хочу пополнить.${doctorName ? ` Врач: ${doctorName}` : ''}`
        );
        window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
    };

    const isBlocking = remaining === 0;

    const config = {
        0: {
            icon: <AlertTriangle className="w-8 h-8 text-white drop-shadow-sm" />,
            headerBg: 'bg-gradient-to-r from-red-500 to-orange-500',
            title: 'Токены закончились',
            subtitle: 'Анализ недоступен',
            body: 'Ваши еженедельные токены исчерпаны. Свяжитесь с администратором для пополнения или дождитесь сброса в понедельник.',
        },
        1: {
            icon: <AlertTriangle className="w-8 h-8 text-white drop-shadow-sm" />,
            headerBg: 'bg-gradient-to-r from-amber-500 to-orange-400',
            title: 'Остался 1 токен!',
            subtitle: 'Почти исчерпано',
            body: 'У вас остался последний токен на этой неделе. После следующего анализа токены закончатся до следующего понедельника.',
        },
        5: {
            icon: <Info className="w-8 h-8 text-white drop-shadow-sm" />,
            headerBg: 'bg-gradient-to-r from-sky-500 to-cyan-400',
            title: 'Осталось 5 токенов',
            subtitle: 'На этой неделе',
            body: 'У вас осталось 5 токенов до конца недели. Токены обновляются каждый понедельник автоматически.',
        },
    } as const;

    const key = remaining as 0 | 1 | 5;
    const { icon, headerBg, title, subtitle, body } = config[key] ?? config[0];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className={`relative ${headerBg} p-6 text-center text-white`}>
                    {!isBlocking && (
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <div className="mx-auto bg-white/20 w-14 h-14 rounded-full flex items-center justify-center mb-3 border border-white/30">
                        {icon}
                    </div>
                    <h2 className="text-lg font-bold mb-0.5">{title}</h2>
                    <p className="text-white/90 text-sm">{subtitle}</p>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <p className="text-slate-600 text-sm text-center">{body}</p>

                    <button
                        onClick={handleWhatsApp}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                    >
                        <MessageCircle className="w-4 h-4" />
                        Написать в WhatsApp
                    </button>

                    {!isBlocking && (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Продолжить работу
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
