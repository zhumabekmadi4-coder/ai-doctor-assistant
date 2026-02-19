import { getOpenAI } from '@/lib/openai';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// App Router: use nodejs runtime for large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
    // Auth guard
    const authResult = requireAuth(req);
    if (authResult instanceof Response) return authResult;

    try {
        const openai = getOpenAI();
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        console.log(`[API] Received audio file: ${audioFile.name}, size: ${audioFile.size}`);

        // 1. Transcribe with Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'ru', // Force Russian as requested
        });

        const text = transcription.text;
        console.log(`[API] Transcription complete, length: ${text.length} chars`);

        // 2. Analyze with GPT-4o
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Ты - медицинский ассистент. Твоя задача - строго извлечь факты из транскрипции приема врача.
Ничего не придумывай. Если информации нет, пиши "Не указано".
Верни ответ только в формате JSON со следующими полями:
- patientName (ФИО пациента)
- dob (Дата рождения, если есть)
- visitDate (Дата визита, сегодня: ${new Date().toLocaleDateString('ru-RU')})
- complaints (Жалобы пациента)
- anamnesis (Анамнез)
- diagnosis (Предварительный диагноз)
- treatment (Общий план лечения текстом)
- recommendations (Рекомендации)
- procedures (объект с количеством сеансов каждой процедуры, если упомянуто в тексте):
  {
    "HILT": <число или 0>,
    "SIS": <число или 0>,
    "УВТ": <число или 0>,
    "ИРТ": <число или 0>,
    "ВТЭС": <число или 0>,
    "PRP": <число или 0>,
    "Кинезиотерапия": <число или 0>
  }

Для поля procedures: ищи в тексте упоминания процедур и числа рядом с ними (например "13 лазеров" = HILT:13, "12 магнитов" = SIS:12, "6 УВТ" = УВТ:6, "4 ИРТ" = ИРТ:4, "ФТЭС/ВТЭС" = ВТЭС, "ПРП/PRP" = PRP).
Если процедура не упомянута - ставь 0.

Используй русский язык.`
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0, // Strict extraction
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content from GPT');

        const analysis = JSON.parse(content);

        return NextResponse.json({ text, analysis });

    } catch (error: any) {
        console.error('[API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
