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
    // 熊本地方気象台（熊本市）の過去データURL
    const url = `https://www.data.jma.go.jp/obd/stats/etrn/view/daily_s1.php?prec_no=86&block_no=47819&year=${year}&month=${month}&day=&view=`;
    
    // 気象庁のページを読み込む
    const response = await fetch(url);
    const html = await response.text();
    
    // HTMLの中から表データだけを解析（スクレイピング）
    const $ = cheerio.load(html);
    const sunshineData: Record<string, number> = {};

    $('table.data2_s tr').each((i, elem) => {
      const tds = $(elem).find('td');
      // 日次データテーブルは通常20列。日照時間は左から17番目（インデックス16）
      if (tds.length >= 17) {
        const dayStr = $(tds[0]).text().trim();
        const sunshineStr = $(tds[16]).text().trim();

        const day = parseInt(dayStr, 10);
        const sunshine = parseFloat(sunshineStr);

        if (!isNaN(day)) {
          if (!isNaN(sunshine)) {
            sunshineData[day] = sunshine;
          } else {
            // 雨の日などで日照ゼロの場合への対応
            sunshineData[day] = 0;
          }
        }
      }
    });

    return NextResponse.json(sunshineData);
  } catch (error) {
    console.error('Weather fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}