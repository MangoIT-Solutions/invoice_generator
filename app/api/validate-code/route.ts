import { NextResponse } from 'next/server';
import { pool } from '@/lib/database';

// GET /api/validate-code?code=PRJ-123
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        if (!code) {
            return NextResponse.json({ valid: false, error: 'Missing code parameter' }, { status: 400 });
        }
        // Query MySQL for the project code (case-insensitive)
        const [rows] = await pool.query(
            'SELECT project_code FROM projects_details WHERE UPPER(project_code) = ? LIMIT 1',
            [code.trim().toUpperCase()]
        );
        const isValid = Array.isArray(rows) && rows.length > 0;
        if (isValid) {
            return NextResponse.json({ valid: true });
        }

        // Fuzzy suggestion: fetch all codes and find closest by Levenshtein distance
        const [allRows] = await pool.query('SELECT project_code FROM projects_details');
        const inputCode = code.trim().toUpperCase();
        let closest = null;
        let minDist = 3; // Only suggest if <=2 edits away
        for (const row of allRows as { project_code: string }[]) {
            const dbCode = row.project_code.toUpperCase();
            const dist = levenshtein(inputCode, dbCode);
            if (dist < minDist) {
                minDist = dist;
                closest = dbCode;
            }
        }
        if (closest) {
            return NextResponse.json({ valid: false, suggestion: closest });
        }
        return NextResponse.json({ valid: false });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ valid: false, error: 'Database error' }, { status: 500 });
    }
}

// Levenshtein distance function
function levenshtein(a: string, b: string): number {
    const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[a.length][b.length];
}
