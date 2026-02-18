
import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Use opus at 32kbps — speech quality, ~7MB for 30 min (vs ~100MB default)
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
                    ? 'audio/ogg;codecs=opus'
                    : 'audio/webm';

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 16000, // 16kbps — Whisper handles speech fine, ~3.6MB for 30 min
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                console.log(`[Recorder] Audio size: ${(blob.size / 1024 / 1024).toFixed(2)}MB, codec: ${mimeType}`);
                setAudioBlob(blob);
                chunksRef.current = [];
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Ошибка доступа к микрофону');
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    }, [isRecording]);

    const resetRecording = useCallback(() => {
        setAudioBlob(null);
        setIsRecording(false);
    }, []);

    return {
        isRecording,
        audioBlob,
        startRecording,
        stopRecording,
        resetRecording,
    };
}
