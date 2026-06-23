import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

// ご提示いただいたスプレッドシートIDを組み込み済みです！
const SPREADSHEET_ID = '1x-2BMlYpsvsgr-UGceI8F98NG0ZQwCzc1F7acgZ0B6Y';

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(process.cwd(), 'credentials.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// 1. データ取得（GET）
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
      actual: row[2] && row[2] !== '' ? Number(row[2]) : null,
      selfSufficiency: row[3] ? Number(row[3]) : 0,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 });
  }
}

// 2. インポートおよびデータ上書き（POST）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, actual, selfSufficiency } = body;

    if (!month || actual === undefined || selfSufficiency === undefined) {
      return NextResponse.json({ error: '必要なデータが不足しています' }, { status: 400 });
    }

    const sheets = google.sheets({ version: 'v4', auth });

    // 現在のシートの月一覧を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'monthly_data!A1:A13',
    });

    const rows = response.data.values;
    if (!rows) {
      return NextResponse.json({ error: 'シートの構造が正しくありません' }, { status: 400 });
    }

    // 対象の月が何行目にあるか検索
    let rowIndex = rows.findIndex(row => row[0] === month) + 1;

    // もし月が存在しない場合は新規行を追加
    if (rowIndex <= 1) {
      rowIndex = rows.length + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `monthly_data!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[month]] },
      });
    }

    // C列（actual）と D列（selfSufficiency）をまとめて上書き更新
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `monthly_data!C${rowIndex}:D${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[actual, selfSufficiency]],
      },
    });

    return NextResponse.json({ success: true, message: `${month}のデータを同期しました` });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'データの更新に失敗しました' }, { status: 500 });
  }
}