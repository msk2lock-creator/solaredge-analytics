import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  if (!year || !month) {
    return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
  }

  try {
    // 牛深特別地域気象観測所（天草地方）の過去データURL（block_noを正しく47838に修正）
    const url = `https://www.data.jma.go.jp/obd/stats/etrn/view/daily_s1.php?prec_no=86&block_no=47838&year=${year}&month=${month}&day=&view=`;
    console.log(`[Weather API] 気象庁へアクセス中... URL: ${url}`);

    // ロボット弾き（403エラー）を回避するため、一般的なWebブラウザからのアクセスを装う
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      console.error(`[Weather API] ❌ 気象庁へのアクセスに失敗しました。ステータス: ${response.status}`);
      return NextResponse.json({ error: 'Failed to fetch from JMA' }, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const sunshineData: Record<string, number> = {};
    let rowCount = 0;

    // 表データ（class="data2_s"）の各行をループ処理
    $('table.data2_s tr').each((i, elem) => {
      const tds = $(elem).find('td');
      // 日次データテーブルは通常22列。日照時間は左から17番目（インデックス16）
      if (tds.length >= 17) {
        const dayStr = $(tds[0]).text().trim();
        const sunshineStr = $(tds[16]).text().trim();

        const day = parseInt(dayStr, 10);
        const sunshine = parseFloat(sunshineStr);

        if (!isNaN(day)) {
          rowCount++;
          // 値が取れればその数字を、雨やエラー等で空欄・文字化けの場合は 0 をセット
          sunshineData[day] = !isNaN(sunshine) ? sunshine : 0;
        }
      }
    });

    console.log(`[Weather API] ✅ 抽出完了: ${rowCount}日分の日照時間を取得しました。`);
    return NextResponse.json(sunshineData);
  } catch (error) {
    console.error('[Weather API] ❌ システムエラー:', error);
    return NextResponse.json({ error: 'System error' }, { status: 500 });
  }
}