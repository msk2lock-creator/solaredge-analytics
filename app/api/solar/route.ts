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
    const [monthlyRes, dailyRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'monthly_data!A2:D100' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'daily_data!A2:G3000' }).catch(() => ({ data: { values: null } }))
    ]);

    const monthlyRows = monthlyRes.data.values || [];
    const formattedMonthly = monthlyRows.map((row) => ({
      month: row[0] || '',
      sim: row[1] ? Number(row[1]) : 0,
      actual: row[2] && row[2] !== '' ? Number(row[2]) : null,
      selfSufficiency: row[3] ? Number(row[3]) : 0,
    }));

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
    
    // 1. 月次データの更新
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

    // 2. 日次データの保存（重複排除と時系列ソート）
    if (dailyData && Array.isArray(dailyData) && dailyData.length > 0) {
      const existingDailyRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'daily_data!A2:G',
      });
      const existingRows = existingDailyRes.data.values || [];
      const dailyMap = new Map();

      // 既存データをMapに格納（年月_日付 をキーにして重複を防ぐ）
      existingRows.forEach(row => {
        if (row.length > 1) {
          dailyMap.set(`${row[0]}_${row[1]}`, row);
        }
      });

      // 新規データをMapに上書き格納
      dailyData.forEach((d: any) => {
        dailyMap.set(`${d.yearMonth}_${d.date}`, [
          d.yearMonth, d.date, d.generation, d.consumption, d.solarFrom, d.gridFrom, d.sunlight || 0
        ]);
      });

      // 配列に戻して日付順にソート
      const mergedRows = Array.from(dailyMap.values()).sort((a, b) => {
        const ym1 = a[0].match(/(\d{4})年(\d+)月/);
        const ym2 = b[0].match(/(\d{4})年(\d+)月/);
        const t1 = ym1 ? parseInt(ym1[1]) * 10000 + parseInt(ym1[2]) * 100 + parseInt(a[1].split('/')[1] || 0) : 0;
        const t2 = ym2 ? parseInt(ym2[1]) * 10000 + parseInt(ym2[2]) * 100 + parseInt(b[1].split('/')[1] || 0) : 0;
        return t1 - t2;
      });

      // シートを一度クリアしてから綺麗なソート済みデータを書き込む
      await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: 'daily_data!A2:G' });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'daily_data!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: mergedRows },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'データの更新に失敗しました' }, { status: 500 });
  }
}