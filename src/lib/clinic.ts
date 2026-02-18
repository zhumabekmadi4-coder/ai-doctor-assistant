import { getSheets } from './google-sheets';

interface ClinicCredits {
    clinicName: string;
    totalCredits: number;
    usedCredits: number;
    remainingCredits: number;
}

/**
 * Read the Settings sheet from a clinic's Google Sheet.
 * Expected format: Column A = key, Column B = value
 * Keys: clinic_name, total_credits, used_credits
 */
export async function getClinicCredits(sheetId: string): Promise<ClinicCredits> {
    const sheets = getSheets();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Settings!A:B',
    });

    const rows = response.data.values || [];
    const settings: Record<string, string> = {};

    for (const row of rows) {
        if (row[0] && row[1] !== undefined) {
            settings[row[0].trim().toLowerCase()] = row[1];
        }
    }

    const total = parseInt(settings['total_credits'] || '0', 10);
    const used = parseInt(settings['used_credits'] || '0', 10);

    return {
        clinicName: settings['clinic_name'] || 'Unknown Clinic',
        totalCredits: total,
        usedCredits: used,
        remainingCredits: total - used,
    };
}

/**
 * Check if a clinic has remaining credits.
 */
export async function hasCredits(sheetId: string): Promise<boolean> {
    const credits = await getClinicCredits(sheetId);
    return credits.remainingCredits > 0;
}

/**
 * Decrement clinic credits by 1 (increment used_credits row).
 * Returns the new remaining count.
 */
export async function decrementCredit(sheetId: string): Promise<number> {
    const sheets = getSheets();

    // First, find the used_credits row
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Settings!A:B',
    });

    const rows = response.data.values || [];
    let usedRow = -1;
    let currentUsed = 0;
    let total = 0;

    for (let i = 0; i < rows.length; i++) {
        const key = rows[i][0]?.trim().toLowerCase();
        if (key === 'used_credits') {
            usedRow = i + 1; // 1-based for Sheets API
            currentUsed = parseInt(rows[i][1] || '0', 10);
        }
        if (key === 'total_credits') {
            total = parseInt(rows[i][1] || '0', 10);
        }
    }

    if (usedRow === -1) {
        throw new Error('Settings sheet missing used_credits row');
    }

    const newUsed = currentUsed + 1;

    // Update used_credits
    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Settings!B${usedRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[String(newUsed)]] },
    });

    return total - newUsed;
}

/**
 * Get the clinic_id (Sheet ID) for a user by looking up their login
 * in the Users sheet, column G.
 */
export async function getClinicIdForUser(mainSheetId: string, userLogin: string): Promise<string | null> {
    const sheets = getSheets();

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: mainSheetId,
        range: 'Users!A:G',
    });

    const rows = response.data.values || [];
    const userRow = rows.slice(1).find(
        (row) => row[0]?.toLowerCase() === userLogin.toLowerCase()
    );

    if (!userRow || !userRow[6]) return null;
    return userRow[6]; // Column G = clinic_id (Sheet ID)
}
