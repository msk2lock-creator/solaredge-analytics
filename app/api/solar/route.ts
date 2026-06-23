import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const SPREADSHEET_ID = '1x-2BMlYpsvsgr-UGceI8F98NG0ZQwCzc1F7acgZ0B6Y';

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
    
    // 月次データと日次データの両方を一気に取得
    const [monthlyRes, dailyRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'monthly_data!A2:D100' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'daily_data!A2:G3000' }).catch(() => ({ data: { values: null } }))
    ]);

    // 月次データの整形
    const monthlyRows = monthlyRes.data.values || [];
    const formattedMonthly = monthlyRows.map((row) => ({
      month: row[0] || '',
      sim: row[1] ? Number(row[1]) : 0,
      actual: row[2] && row[2] !== '' ? Number(row[2]) : null,
      selfSufficiency: row[3] ? Number(row[3]) : 0,
    }));

    // 日次データの整形
    const dailyRows = dailyRes.data?.values || [];
    const formattedDaily = dailyRows.map((row) => ({
      yearMonth: row[0] || '',
      date: row[1] || '',
      generation: Number(row[2]) || 0,
      consumption: Number(row[3]) || 0,
      solarFrom: Number(row[4]) || 0,
      gridFrom: Number(row[5]) || 0,
      sunlight: Number(row[6]) || 0,
    }));

    return NextResponse.json({ monthlyData: formattedMonthly, dailyData: formattedDaily });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, actual, selfSufficiency, dailyData } = body;

    if (!month || actual === undefined) {
      return NextResponse.json({ error: '必要なデータが不足しています' }, { status: 400 });
    }

    const sheets = google.sheets({ version: 'v4', auth });
    
    // 1. 月次データの更新（これまで通り）
    const monthlyRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'monthly_data!A1:A100',
    });
    const rows = monthlyRes.data.values || [];
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

    // 2. 日次データの保存（新規追加）
    if (dailyData && Array.isArray(dailyData) && dailyData.length > 0) {
      const dailyRows = dailyData.map((d: any) => [
        d.yearMonth, d.date, d.generation, d.consumption, d.solarFrom, d.gridFrom, d.sunlight || 0
      ]);
      
      // daily_dataシートの一番下に追記していく
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'daily_data!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: dailyRows },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'データの更新に失敗しました' }, { status: 500 });
  }
}