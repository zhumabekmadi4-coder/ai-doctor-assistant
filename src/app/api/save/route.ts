import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Trim string and enforce max length
function sanitize(value: unknown, maxLen = 2000): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

export async function POST(req: Request) {
  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json();

    // Validate required field
    const patientName = sanitize(body.patientName, 200);
    if (!patientName) {
      return NextResponse.json({ error: 'patientName is required' }, { status: 400 });
    }

    // Sanitize all fields
    const dob            = sanitize(body.dob, 50);
    const visitDate      = sanitize(body.visitDate, 50);
    const complaints     = sanitize(body.complaints, 5000);
    const anamnesis      = sanitize(body.anamnesis, 5000);
    const diagnosis      = sanitize(body.diagnosis, 1000);
    const treatment      = sanitize(body.treatment, 5000);
    const recommendations = sanitize(body.recommendations, 5000);
    const doctorName     = sanitize(body.doctor?.name, 200);
    const doctorSpecialty = sanitize(body.doctor?.specialty, 200);

    const doctorLogin = auth.login;

    // Check credits using key-value settings schema
    const settingsRows = await sql`SELECT value FROM settings WHERE key = 'credits'`;
    const currentCredits = parseInt(settingsRows[0]?.value ?? '0');

    if (currentCredits <= 0) {
      return NextResponse.json({ error: 'No credits left' }, { status: 403 });
    }

    await sql`
      INSERT INTO patients (
        patient_name, dob, visit_date, complaints,
        anamnesis, diagnosis, treatment, recommendations,
        doctor_login, doctor_name, doctor_specialty, saved_at
      ) VALUES (
        ${patientName}, ${dob}, ${visitDate}, ${complaints},
        ${anamnesis}, ${diagnosis}, ${treatment}, ${recommendations},
        ${doctorLogin}, ${doctorName}, ${doctorSpecialty},
        NOW()
      )
    `;

    const newCredits = currentCredits - 1;
    await sql`UPDATE settings SET value = ${String(newCredits)} WHERE key = 'credits'`;

    return NextResponse.json({ success: true, remainingCredits: newCredits });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
