// Clinic utilities - SQL-based (Neon Postgres)
// Settings table schema: id, clinic_name, total_credits, used_credits
import { sql } from '@/lib/db';

export interface ClinicCredits {
  clinicName: string;
    totalCredits: number;
      usedCredits: number;
        remainingCredits: number;
        }

        /**
         * Read clinic credits from the settings table in Neon Postgres.
          * Settings schema: { id, clinic_name, total_credits, used_credits }
           */
           export async function getClinicCredits(): Promise<ClinicCredits> {
             const rows = await sql`SELECT id, clinic_name, total_credits, used_credits FROM settings LIMIT 1`;
               const row = rows[0];

                 if (!row) {
                     return {
                           clinicName: 'AI Doctor Clinic',
                                 totalCredits: 0,
                                       usedCredits: 0,
                                             remainingCredits: 0,
                                                 };
                                                   }

                                                     const total = row.total_credits ?? 0;
                                                       const used = row.used_credits ?? 0;

                                                         return {
                                                             clinicName: row.clinic_name ?? 'AI Doctor Clinic',
                                                                 totalCredits: total,
                                                                     usedCredits: used,
                                                                         remainingCredits: total - used,
                                                                           };
                                                                           }