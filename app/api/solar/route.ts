import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const SPREADSHEET_ID = '1x-2BMlYpsvsgr-UGceI8F98NG0ZQwCzc1F7acgZ0B6Y';

// Vercel環境（環境変数）とローカル環境（ファイル）の両方に対応する認証ロジック
const getAuth = () => {
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    return new google.auth.GoogleAuth({
      keyFile: path.join(process.cwd(), 'credentials.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
};

const auth = getAuth();

export async function GET() {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'monthly_data!A2:D13',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return NextResponse.json([]);

    const formattedData = rows.map((row) => ({
      month: row[0] || '',
      sim: row[1] ? Number(row[1]) : 0,
      actual: row[2] && row[2] !== '' ? Number(row[2]) : null,
      selfSufficiency: row[3] ? Number(row[3]) : 0,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, actual, selfSufficiency } = body;

    if (!month || actual === undefined || selfSufficiency === undefined) {
      return NextResponse.json({ error: '必要なデータが不足しています' }, { status: 400 });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'monthly_data!A1:A13',
    });

    const rows = response.data.values;
    if (!rows) return NextResponse.json({ error: 'シート構造エラー' }, { status: 400 });

    let rowIndex = rows.findIndex(row => row[0] === month) + 1;

    if (rowIndex <= 1) {
      rowIndex = rows.length + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `monthly_data!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[month]] },
      });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `monthly_data!C${rowIndex}:D${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[actual, selfSufficiency]] },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'データの更新に失敗しました' }, { status: 500 });
  }
}