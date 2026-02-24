import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';

// POST /api/setup-users - one-time setup to create admin account in SQL DB
// Requires env vars: ADMIN_LOGIN, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_SPECIALTY
export async function POST() {
  try {
      const adminLogin = process.env.ADMIN_LOGIN;
          const adminPassword = process.env.ADMIN_PASSWORD;
              const adminName = process.env.ADMIN_NAME || 'Admin';
                  const adminSpecialty = process.env.ADMIN_SPECIALTY || '';

                      if (!adminLogin || !adminPassword) {
                            return NextResponse.json(
                                    { error: 'Missing ADMIN_LOGIN or ADMIN_PASSWORD env vars' },
                                            { status: 400 }
                                                  );
                                                      }

                                                          // Ensure users table exists
                                                              await sql`
                                                                    CREATE TABLE IF NOT EXISTS users (
                                                                            id BIGSERIAL PRIMARY KEY,
                                                                                    login TEXT UNIQUE NOT NULL,
                                                                                            password_hash TEXT NOT NULL,
                                                                                                    name TEXT,
                                                                                                            specialty TEXT,
                                                                                                                    role TEXT DEFAULT 'doctor',
                                                                                                                            active BOOLEAN DEFAULT TRUE
                                                                                                                                  )
                                                                                                                                      `;

                                                                                                                                          // Create admin user (skip if already exists)
                                                                                                                                              const hashedPassword = await hashPassword(adminPassword);
                                                                                                                                                  await sql`
                                                                                                                                                        INSERT INTO users (login, password_hash, name, specialty, role, active)
                                                                                                                                                              VALUES (${adminLogin}, ${hashedPassword}, ${adminName}, ${adminSpecialty}, 'admin', true)
                                                                                                                                                                    ON CONFLICT (login) DO NOTHING
                                                                                                                                                                        `;

                                                                                                                                                                            // Ensure settings table exists with initial data
                                                                                                                                                                                await sql`
                                                                                                                                                                                      CREATE TABLE IF NOT EXISTS settings (
                                                                                                                                                                                              id BIGSERIAL PRIMARY KEY,
                                                                                                                                                                                                      clinic_name TEXT DEFAULT 'AI Doctor Clinic',
                                                                                                                                                                                                              total_credits INTEGER DEFAULT 100,
                                                                                                                                                                                                                      used_credits INTEGER DEFAULT 0
                                                                                                                                                                                                                            )
                                                                                                                                                                                                                                `;

                                                                                                                                                                                                                                    await sql`
                                                                                                                                                                                                                                          INSERT INTO settings (clinic_name, total_credits, used_credits)
                                                                                                                                                                                                                                                SELECT 'AI Doctor Clinic', 100, 0
                                                                                                                                                                                                                                                      WHERE NOT EXISTS (SELECT 1 FROM settings)
                                                                                                                                                                                                                                                          `;

                                                                                                                                                                                                                                                              return NextResponse.json({
                                                                                                                                                                                                                                                                    success: true,
                                                                                                                                                                                                                                                                          message: 'Setup complete. Admin user and settings created in Neon Postgres.',
                                                                                                                                                                                                                                                                              });
                                                                                                                                                                                                                                                                                } catch (err) {
                                                                                                                                                                                                                                                                                    console.error('Setup error:', err);
                                                                                                                                                                                                                                                                                        return NextResponse.json({ error: 'Setup failed', details: String(err) }, { status: 500 });
                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                          