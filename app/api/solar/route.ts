import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

// 【TODO】先ほどメモしたご自身のスプレッドシートIDを、下のシングルクォートの間に貼り付けてください
const SPREADSHEET_ID = 'ここにあなたのスプレッドシートIDを貼り付けてください';

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export async function GET() {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'monthly_data!A2:D13',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json([]);
    }

    const formattedData = rows.map((row) => ({
      month: row[0] || '',
      sim: row[1] ? Number(row[1]) : 0,
      actual: row[2] ? Number(row[2]) : null,
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
    const { month, actual } = body;

    if (!month || actual === undefined) {
      return NextResponse.json({ error: '必要なデータが不足しています' }, { status: 400 });
    }

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'monthly_data!A1:A13',
    });

    const rows = response.data.values;
    if (!rows) {
      return NextResponse.json({ error: 'シートの構造が正しくありません' }, { status: 400 });
    }

    const rowIndex = rows.findIndex(row => row[0] === month) + 1;

    if (rowIndex <= 1) {
      return NextResponse.json({ error: '指定された月が見つかりません' }, { status: 400 });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `monthly_data!C${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[actual]],
      },
    });

    return NextResponse.json({ success: true, message: `${month}の実績を更新しました` });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'データの更新に失敗しました' }, { status: 500 });
  }
}