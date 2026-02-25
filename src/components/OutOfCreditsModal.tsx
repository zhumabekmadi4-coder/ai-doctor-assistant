import { AlertTriangle, MessageSquare, ExternalLink, X } from 'lucide-react';

interface OutOfCreditsModalProps {
    onClose: () => void;
    userEmail: string;
}

export function OutOfCreditsModal({ onClose, userEmail }: OutOfCreditsModalProps) {
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '77000000000';
    const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL || '#';

    const handleWhatsApp = () => {
        const text = encodeURIComponent(`Здравствуйте, хочу купить токены для JAZai Doc. Мой профиль: ${userEmail}`);
        window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
    };

    const handleFeedback = () => {
        window.open(feedbackUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="relative bg-gradient-to-r from-amber-500 to-orange-400 p-6 text-center text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-white/30 shadow-inner">
                        <AlertTriangle className="w-8 h-8 text-white drop-shadow-sm" />
                    </div>
                    <h2 className="text-xl font-bold mb-1 drop-shadow-sm">Токены закончились!</h2>
                    <p className="text-white/90 text-sm font-medium">Кредиты для консультаций исчерпаны</p>
                </div>

                {/* Content */}
                <div className="p-6 text-center space-y-6">
                    <p className="text-slate-600 text-sm">
                        Ваши пробные токены закончились. Чтобы продолжить использовать JAZai Doc для анализа консультаций, вы можете приобрести пакет токенов или получить <span className="font-bold text-teal-600">10 бесплатных токенов</span> за ваш отзыв!
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleWhatsApp}
                            className="w-full relative group overflow-hidden bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 text-slate-700 hover:text-teal-800 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300"
                        >
                            <MessageSquare className="w-5 h-5 text-teal-500 group-hover:scale-110 transition-transform" />
                            <span>Купить пакет токенов</span>
                        </button>

                        <button
                            onClick={handleFeedback}
                            className="w-full bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-teal-500/20 flex items-center justify-center gap-3 hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <span>Оставить отзыв (+10 токенов)</span>
                            <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
