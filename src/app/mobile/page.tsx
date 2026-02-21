'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type Status = 'idle' | 'recording' | 'sending' | 'done' | 'saving' | 'saved' | 'error';

export default function MobilePage() {
    const [status, setStatus] = useState<Status>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [transcript, setTranscript] = useState('');
    const [analysisData, setAnalysisData] = useState<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await sendAudio(blob);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setStatus('recording');
        } catch (err) {
            setErrorMsg('Нет доступа к микрофону. Разрешите доступ в настройках браузера.');
            setStatus('error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setStatus('sending');
        }
    };

    const sendAudio = async (blob: Blob) => {
        try {
            const formData = new FormData();
            formData.append('audio', blob, 'recording.webm');

            // Extract token from URL
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            const headers: HeadersInit = {};
            if (token) {
                headers['x-session-token'] = token;
            }

            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Ошибка анализа (возможно не авторизован)');
            }

            const data = await response.json();

            // Store result in sessionStorage for the main page to pick up (if on same device)
            sessionStorage.setItem('mobileAnalysis', JSON.stringify(data.analysis));
            setAnalysisData(data.analysis);
            setTranscript(data.text || '');
            setStatus('done');
        } catch (err: any) {
            setErrorMsg(err.message || 'Ошибка отправки');
            setStatus('error');
        }
    };

    const savePatient = async () => {
        if (!analysisData) return;
        setStatus('saving');

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['x-session-token'] = token;

            const aiProcs = analysisData.procedures || {};
            // Maps key to actual full procedure names matching DEFAULT_PROCEDURES map from page.tsx
            const PROCEDURE_KEY_MAP: Record<string, string> = {
                'HILT': 'HILT (высокоинтенсивная лазеротерапия)',
                'SIS': 'SIS (высокоинтенсивная магнитотерапия)',
                'УВТ': 'УВТ (Ударно-волновая терапия)',
                'ИРТ': 'ИРТ (иглорефлексотерапия)',
                'ВТЭС': 'ВТЭС (внутритканевая электростимуляция)',
                'PRP': 'PRP (плазматерапия)',
                'Кинезиотерапия': 'Кинезиотерапия',
            };

            const proceduresText = Object.keys(PROCEDURE_KEY_MAP)
                .map(key => {
                    const q = aiProcs[key] || 0;
                    return q > 0 ? `${PROCEDURE_KEY_MAP[key]}: ${q}` : null;
                })
                .filter(Boolean)
                .join(', ');

            const treatment = proceduresText
                ? `${analysisData.treatment || ''}\n\nПроцедуры: ${proceduresText}`
                : (analysisData.treatment || '');

            const dataToSave = {
                ...analysisData,
                treatment,
            };

            const response = await fetch('/api/save', {
                method: 'POST',
                headers,
                body: JSON.stringify(dataToSave),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Ошибка при сохранении');
            }

            setStatus('saved');
        } catch (err: any) {
            setErrorMsg(err.message || 'Ошибка сохранения');
            setStatus('error');
        }
    };

    const reset = () => {
        setStatus('idle');
        setErrorMsg('');
        setTranscript('');
        setAnalysisData(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
                {/* Header */}
                <div className="mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Mic className="w-8 h-8 text-blue-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">JAZai Doc</h1>
                    <p className="text-sm text-gray-500 mt-1">Запись консультации с телефона</p>
                </div>

                {/* Status: idle */}
                {status === 'idle' && (
                    <div className="space-y-4">
                        <p className="text-gray-600 text-sm">
                            Нажмите кнопку и начните диктовать консультацию. После остановки запись автоматически отправится на анализ.
                        </p>
                        <button
                            onClick={startRecording}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            <Mic className="w-6 h-6" />
                            Начать запись
                        </button>
                    </div>
                )}

                {/* Status: recording */}
                {status === 'recording' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2 text-red-600">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="font-semibold">Идёт запись...</span>
                        </div>
                        <p className="text-gray-500 text-sm">Говорите чётко. Нажмите «Стоп» когда закончите.</p>
                        <button
                            onClick={stopRecording}
                            className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-red-700 active:scale-95 transition-all"
                        >
                            <Square className="w-6 h-6" />
                            Стоп
                        </button>
                    </div>
                )}

                {/* Status: sending */}
                {status === 'sending' && (
                    <div className="space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                        <p className="text-gray-600 font-medium">Анализируем запись...</p>
                        <p className="text-gray-400 text-sm">Это займёт несколько секунд</p>
                    </div>
                )}

                {/* Status: done */}
                {status === 'done' && (
                    <div className="space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="text-green-700 font-semibold text-lg">Анализ завершён!</p>
                        <p className="text-gray-600 text-sm">
                            Проверьте данные перед сохранением в базу.
                        </p>

                        <div className="bg-gray-50 rounded-lg p-3 text-left space-y-2 max-h-60 overflow-y-auto">
                            {analysisData?.patientName && <p className="text-sm font-semibold">Пациент: {analysisData.patientName}</p>}
                            {analysisData?.diagnosis && <p className="text-xs text-gray-700"><span className="font-semibold">Диагноз:</span> {analysisData.diagnosis}</p>}
                            {transcript && (
                                <>
                                    <p className="text-xs text-gray-500 font-medium mt-2">Транскрипция:</p>
                                    <p className="text-xs text-gray-700">{transcript}</p>
                                </>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={savePatient}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30"
                            >
                                Сохранить пациента
                            </button>
                            <button
                                onClick={reset}
                                className="w-full py-3 border-2 border-gray-300 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Отменить
                            </button>
                        </div>
                    </div>
                )}

                {/* Status: saving */}
                {status === 'saving' && (
                    <div className="space-y-4">
                        <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto" />
                        <p className="text-gray-600 font-medium">Сохраняем данные...</p>
                    </div>
                )}

                {/* Status: saved */}
                {status === 'saved' && (
                    <div className="space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="text-green-700 font-semibold text-lg">Успешно сохранено!</p>
                        <p className="text-gray-600 text-sm">
                            Пациент добавлен в список. Вы можете открыть его с компьютера.
                        </p>
                        <button
                            onClick={reset}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors mt-4"
                        >
                            Новая запись
                        </button>
                    </div>
                )}

                {/* Status: error */}
                {status === 'error' && (
                    <div className="space-y-4">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                        <p className="text-red-700 font-semibold">Ошибка</p>
                        <p className="text-gray-600 text-sm">{errorMsg}</p>
                        <button
                            onClick={reset}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                        >
                            Попробовать снова
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
