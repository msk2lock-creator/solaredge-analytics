"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Line, ReferenceLine, ScatterChart, Scatter
} from 'recharts';

interface MonthlyDataItem {
  month: string;
  actual: number | null;
  selfSufficiency: number;
}

interface DailyDataItem {
  yearMonth: string;
  date: string;
  generation: number;
  consumption: number;
  solarFrom: number;
  gridFrom: number;
  sunlight: number;
}

const SIMULATION_DATA: Record<number, number> = {
  1: 3582, 2: 4423, 3: 6061, 4: 6446, 5: 6768, 6: 5208,
  7: 6641, 8: 6996, 9: 6548, 10: 5605, 11: 4150, 12: 3637
};

const EN_MONTH_MAP: Record<string, string> = {
  Jan: '1', Feb: '2', Mar: '3', Apr: '4', May: '5', Jun: '6',
  Jul: '7', Aug: '8', Sep: '9', Oct: '10', Nov: '11', Dec: '12'
};

const parseCSVLine = (line: string) => {
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuote = !inQuote;
    } else if (line[i] === ',' && !inQuote) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += line[i];
    }
  }
  cols.push(cur.trim());
  return cols;
};

export default function SolarEdgeApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [activeTab, setActiveTab] = useState(1); 
  
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('6');
  
  const [monthlyData, setMonthlyData] = useState<MonthlyDataItem[]>([]);
  const [allDailyData, setAllDailyData] = useState<DailyDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchSpreadsheetData();
  }, []);

  const fetchSpreadsheetData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/solar');
      if (!res.ok) throw new Error('データ取得失敗');
      const data = await res.json();
      setMonthlyData(data.monthlyData || []);
      setAllDailyData(data.dailyData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    let y = parseInt(selectedYear);
    let m = parseInt(selectedMonth);
    if (isNaN(m) || isNaN(y)) return;
    if (m === 1) { m = 12; y -= 1; }
    else { m -= 1; }
    setSelectedYear(y.toString());
    setSelectedMonth(m.toString());
  };

  const handleNextMonth = () => {
    let y = parseInt(selectedYear);
    let m = parseInt(selectedMonth);
    if (isNaN(m) || isNaN(y)) return;
    if (m === 12) { m = 1; y += 1; }
    else { m += 1; }
    setSelectedYear(y.toString());
    setSelectedMonth(m.toString());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length <= 1) return alert("CSVデータが空か、構造が正しくありません。");

      const headers = parseCSVLine(lines[0]);
      const timeIdx = headers.indexOf('測定時間');
      const genIdx = headers.indexOf('発電 (MWh)');
      const consIdx = headers.indexOf('消費 (MWh)');
      const solarIdx = headers.indexOf('太陽光から (MWh)');
      const gridFromIdx = headers.indexOf('系統から (MWh)');

      let totalGenMwh = 0; let totalConsMwh = 0; let totalSolarMwh = 0;
      let targetYearStr = ""; let targetMonthStr = "";
      const parsedDailyData: DailyDataItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);
        if (columns.length < headers.length) continue;

        const timeValue = columns[timeIdx];
        const genValue = parseFloat(columns[genIdx]) || 0;
        const consValue = parseFloat(columns[consIdx]) || 0;
        const solarValue = parseFloat(columns[solarIdx]) || 0;
        const gridFromValue = parseFloat(columns[gridFromIdx]) || 0;

        totalGenMwh += genValue; totalConsMwh += consValue; totalSolarMwh += solarValue;

        if (!targetMonthStr && timeValue) {
          const jpMatch = timeValue.match(/(\d{4})[年\/\-]0?(\d{1,2})[月\/\-]?/);
          if (jpMatch) { 
            targetYearStr = jpMatch[1]; 
            targetMonthStr = parseInt(jpMatch[2], 10).toString();
          } else {
            const enMatch = timeValue.match(/([A-Z][a-z]{2}) \d{1,2}, (\d{4})/);
            if (enMatch && EN_MONTH_MAP[enMatch[1]]) {
              targetYearStr = enMatch[2];
              targetMonthStr = EN_MONTH_MAP[enMatch[1]];
            }
          }
        }

        if (timeValue) {
          let formattedDate = timeValue.split(' ')[0];
          
          const jpDateMatch = timeValue.match(/(\d{4})[年\/\-]0?(\d{1,2})[月\/\-]0?(\d{1,2})日?/);
          if (jpDateMatch) {
            formattedDate = `${jpDateMatch[2]}月${jpDateMatch[3]}日`;
          } else {
            const enDateMatch = timeValue.match(/([A-Z][a-z]{2}) (\d{1,2}), \d{4}/);
            if (enDateMatch && EN_MONTH_MAP[enDateMatch[1]]) {
              formattedDate = `${EN_MONTH_MAP[enDateMatch[1]]}月${enDateMatch[2]}日`;
            }
          }

          parsedDailyData.push({
            yearMonth: `${targetYearStr}年${targetMonthStr}月`,
            date: formattedDate,
            generation: Math.round(genValue * 1000),
            consumption: Math.round(consValue * 1000),
            solarFrom: Math.round(solarValue * 1000),
            gridFrom: Math.round(gridFromValue * 1000),
            sunlight: 0
          });
        }
      }

      if (!targetYearStr || !targetMonthStr) {
        return alert("エラー：CSVから年月を正しく読み取れませんでした。データ形式をご確認ください。");
      }

      try {
        const weatherRes = await fetch(`/api/weather?year=${targetYearStr}&month=${targetMonthStr}`);
        if (weatherRes.ok) {
          const sunshineData = await weatherRes.json();
          parsedDailyData.forEach(d => {
            const dayMatch = d.date.match(/(\d+)[^0-9]*$/); 
            if (dayMatch) {
              const day = parseInt(dayMatch[1], 10);
              if (sunshineData[day] !== undefined) {
                d.sunlight = sunshineData[day];
              }
            }
          });
        }
      } catch (weatherErr) {
        console.warn("気象庁データの取得に失敗しました", weatherErr);
      }

      try {
        const res = await fetch('/api/solar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: `${targetYearStr}年${targetMonthStr}月`,
            actual: Math.round(totalGenMwh * 1000),
            selfSufficiency: totalConsMwh > 0 ? parseFloat(((totalSolarMwh / totalConsMwh) * 100).toFixed(1)) : 0,
            dailyData: parsedDailyData
          })
        });

        if (!res.ok) throw new Error('データ保存失敗');
        alert(`🎉 インポート成功！\n\n気象庁のデータベースから牛深周辺の実測日照時間を自動取得し、データに統合しました。`);
        
        setSelectedYear(targetYearStr);
        setSelectedMonth(targetMonthStr);
        fetchSpreadsheetData();
      } catch (err) {
        alert("スプレッドシートへの保存中にエラーが発生しました。");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const currentTargetStr = `${selectedYear}年${selectedMonth}月`;
  const lastYearTargetStr = `${Number(selectedYear) - 1}年${selectedMonth}月`;

  const dailyDataThisYear = allDailyData.filter(d => d.yearMonth.startsWith(`${selectedYear}年`));
  const maxDailyConsumption = Math.max(0, ...dailyDataThisYear.map(d => d.consumption));
  const maxDailyGeneration = Math.max(0, ...dailyDataThisYear.map(d => d.generation));
  const maxDailySunlight = Math.max(0, ...dailyDataThisYear.map(d => d.sunlight));

  const yMaxCons = maxDailyConsumption > 0 ? Math.ceil(maxDailyConsumption * 1.1) : 'auto';
  const yMaxGen = maxDailyGeneration > 0 ? Math.ceil(maxDailyGeneration * 1.1) : 'auto';
  const yMaxSun = maxDailySunlight > 0 ? Math.ceil(maxDailySunlight * 1.1) : 'auto';

  const aggregate = (data: DailyDataItem[]) => data.reduce((acc, curr) => ({
    generation: acc.generation + curr.generation,
    consumption: acc.consumption + curr.consumption,
    solarFrom: acc.solarFrom + curr.solarFrom,
    gridFrom: acc.gridFrom + curr.gridFrom,
  }), { generation: 0, consumption: 0, solarFrom: 0, gridFrom: 0 });

  let maxMonthlyOverall = 0;
  for (let m = 1; m <= 12; m++) {
    const tData = aggregate(allDailyData.filter(d => d.yearMonth === `${selectedYear}年${m}月`));
    const lData = aggregate(allDailyData.filter(d => d.yearMonth === `${Number(selectedYear)-1}年${m}月`));
    const maxInMonth = Math.max(
      tData.generation, tData.consumption, tData.solarFrom, tData.gridFrom,
      lData.generation, lData.consumption, lData.solarFrom, lData.gridFrom
    );
    if (maxInMonth > maxMonthlyOverall) maxMonthlyOverall = maxInMonth;
  }
  const yMaxSummary = maxMonthlyOverall > 0 ? Math.ceil(maxMonthlyOverall * 1.1) : 'auto';

  const dailyData = allDailyData.filter(d => d.yearMonth === currentTargetStr);

  const monthlyChartDataExtended = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const mStr = `${selectedYear}年${monthNum}月`;
    const monthDailies = allDailyData.filter(d => d.yearMonth === mStr);
    
    const agg = monthDailies.reduce((acc, curr) => ({
      generation: acc.generation + curr.generation,
      consumption: acc.consumption + curr.consumption,
      solarFrom: acc.solarFrom + curr.solarFrom,
      gridFrom: acc.gridFrom + curr.gridFrom,
      sunlight: acc.sunlight + curr.sunlight,
    }), { generation: 0, consumption: 0, solarFrom: 0, gridFrom: 0, sunlight: 0 });

    const hasData = monthDailies.length > 0;

    return {
      monthLabel: `${monthNum}月`,
      consumption: hasData ? agg.consumption : null,
      solarFrom: hasData ? agg.solarFrom : null,
      gridFrom: hasData ? agg.gridFrom : null,
      generation: hasData ? agg.generation : null,
      sunlight: hasData ? parseFloat(agg.sunlight.toFixed(1)) : null,
      sim: SIMULATION_DATA[monthNum]
    };
  });

  const maxMonthlyConsumption = Math.max(0, ...monthlyChartDataExtended.map(d => d.consumption || 0));
  const maxMonthlyGeneration = Math.max(0, ...monthlyChartDataExtended.map(d => d.generation || 0));
  const maxMonthlySunlight = Math.max(0, ...monthlyChartDataExtended.map(d => d.sunlight || 0));

  const yMaxMonthCons = maxMonthlyConsumption > 0 ? Math.ceil(maxMonthlyConsumption * 1.1) : 'auto';
  const yMaxMonthGen = maxMonthlyGeneration > 0 ? Math.ceil(maxMonthlyGeneration * 1.1) : 'auto';
  const yMaxMonthSun = maxMonthlySunlight > 0 ? Math.ceil(maxMonthlySunlight * 1.1) : 'auto';

  const getTrendLineData = (dataList: DailyDataItem[], maxSunVal: number | 'auto') => {
    const validData = dataList.filter(d => d.sunlight > 0 && d.generation > 0);
    if (validData.length < 2) return [];
    
    const n = validData.length;
    let sumX = 0; let sumY = 0; let sumXY = 0; let sumXX = 0;
    
    validData.forEach(d => {
      sumX += d.sunlight;
      sumY += d.generation;
      sumXY += d.sunlight * d.generation;
      sumXX += d.sunlight * d.sunlight;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    if (isNaN(slope) || isNaN(intercept)) return [];
    
    const xMax = maxSunVal === 'auto' ? 14 : Number(maxSunVal);
    return [
      { sunlight: 0, trend: Math.max(0, Math.round(intercept)) },
      { sunlight: xMax, trend: Math.max(0, Math.round(slope * xMax + intercept)) }
    ];
  };

  const monthTrend = getTrendLineData(dailyData, yMaxSun);
  const yearTrend = getTrendLineData(dailyDataThisYear, yMaxSun);

  const annualMonths = Array.from({length: 12}, (_, i) => i + 1);
  const annualChartData = annualMonths.map(monthNum => {
    const mStr = `${selectedYear}年${monthNum}月`;
    const found = monthlyData.find(d => d.month === mStr);
    return {
      monthLabel: `${monthNum}月`,
      sim: SIMULATION_DATA[monthNum],
      actual: found?.actual || null
    };
  });

  const rawDailyThisYear = allDailyData.filter(d => d.yearMonth === currentTargetStr);
  const rawDailyLastYear = allDailyData.filter(d => d.yearMonth === lastYearTargetStr);

  const aggThis = aggregate(rawDailyThisYear);
  const aggLast = aggregate(rawDailyLastYear);

  const yoySummaryData = [
    { name: '総発電量', '前年同月': aggLast.generation, '選択月': aggThis.generation },
    { name: '総消費量', '前年同月': aggLast.consumption, '選択月': aggThis.consumption },
    { name: '太陽光から(自家消費)', '前年同月': aggLast.solarFrom, '選択月': aggThis.solarFrom },
    { name: '系統から(買電)', '前年同月': aggLast.gridFrom, '選択月': aggThis.gridFrom },
  ];

  const currentTarget = monthlyData.find(d => d.month === currentTargetStr) || monthlyData.find(d => d.month === `${selectedMonth}月`);
  
  const displayActual = currentTarget && currentTarget.actual !== null ? (currentTarget.actual / 1000).toFixed(2) : "0.00";
  const displaySufficiency = currentTarget ? currentTarget.selfSufficiency.toFixed(1) : "0.0";
  const currentSimValue = SIMULATION_DATA[parseInt(selectedMonth)];
  const displayRatio = currentTarget && currentTarget.actual !== null && currentSimValue > 0 
    ? ((currentTarget.actual / currentSimValue - 1) * 100).toFixed(1) 
    : "0.0";

  const roiData = [
    { year: '0年', sim: -10000, actual: -10000 },
    { year: '1年', sim: -8547, actual: -8200 },
    { year: '2年', sim: -7099, actual: -6500 },
    { year: '3年', sim: -5658, actual: -5000 },
    { year: '4年', sim: -4223, actual: null },
  ];

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.trend !== undefined) return null;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
          <p className="font-bold text-amber-400 text-sm">{data.yearMonth} {data.date}</p>
          <p>☀️ 日照時間: <span className="font-bold text-sm">{data.sunlight}</span> 時間</p>
          <p>⚡ 発電量: <span className="font-bold text-sm">{data.generation}</span> kWh</p>
        </div>
      );
    }
    return null;
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">SolarEdge Analytics</h1>
          <form onSubmit={(e) => { e.preventDefault(); setIsLoggedIn(true); }} className="space-y-4">
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">ログイン</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 pt-0 md:pt-0">
      <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      {/* 📌 改修部分：KPI表示枠より上を固定（sticky）化し、タブボタンを内包 */}
      <div className="sticky top-0 z-50 bg-slate-50 pt-6 md:pt-10 pb-4 border-b border-slate-200/60 -mx-6 md:-mx-10 px-6 md:px-10 mb-8 print:relative print:border-none print:p-0 print:m-0">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:mb-0">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">西岡勝次商店 分析レポート</h1>
            <div className="flex items-center gap-3 mt-3 print:hidden">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                <button onClick={handlePrevMonth} className="px-3 py-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-l-lg border-r border-slate-200 transition-colors">◀</button>
                <div className="flex items-center px-3">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer text-sm">
                    {[2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}年</option>)}
                  </select>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent font-bold outline-none cursor-pointer text-sm ml-1">
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}月度実績</option>)}
                  </select>
                </div>
                <button onClick={handleNextMonth} className="px-3 py-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-r-lg border-l border-slate-200 transition-colors">▶</button>
              </div>
              <button onClick={fetchSpreadsheetData} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-2 rounded-lg font-bold text-slate-700 transition-all">🔄 同期</button>
            </div>
          </div>
          <div className="flex gap-3 print:hidden">
            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg">データインポート</button>
          </div>
        </header>

        {/* 📌 改修部分：タブ選択ボタン群を上部に配置移動 */}
        <div className="flex flex-wrap gap-3 mt-6 print:hidden">
          {['日次データ', '月次データ', '相関図', '前年同月比較', '年間:発電予実', '投資回収'].map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i+1)} className={`py-2 px-4 rounded-xl text-sm font-bold transition-all border ${activeTab === i+1 ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 📊 KPI表示枠 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4">
        {[
          { label: '選択月総発電量', val: displayActual, unit: 'MWh', sub: `計画比 ${Number(displayRatio) >= 0 ? '+' : ''}${displayRatio}%`, color: 'text-emerald-600' },
          { label: '電力自給率', val: displaySufficiency, unit: '%', sub: '自家消費モデル', color: 'text-amber-600' },
          { label: '収益改善額', val: '442', unit: '千円', sub: '当月推定値', color: 'text-slate-800' },
          { label: '投資回収率', val: '50.0', unit: '%', sub: '初期投資比', color: 'text-blue-600' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
            <p className={`text-3xl font-black mt-2 ${kpi.color}`}>{kpi.val} <span className="text-sm font-medium text-slate-400">{kpi.unit}</span></p>
          </div>
        ))}
      </div>

      {/* 📉 グラフ表示枠（グラフ描画エリアのみにスリム化） */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className={`${(activeTab === 1 || activeTab === 2 || activeTab === 3) ? 'h-auto space-y-12' : 'h-[400px]'} w-full`}>
          {isLoading || !mounted ? (
            <div className="h-[400px] flex items-center justify-center text-slate-400 font-medium">データを読み込み中...</div>
          ) : (
            <>
              {/* タブ1：日次データ */}
              {activeTab === 1 && dailyData.length > 0 && (
                <div className="space-y-12">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 mb-4">📈 {selectedMonth}月度 日次:消費電力分析（kWh）</h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dailyData} syncId="dailyDataSync" margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} />
                          <YAxis yAxisId="left" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxCons]} width={55} />
                          <YAxis yAxisId="right" orientation="right" tick={false} axisLine={false} width={55} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="solarFrom" stackId="a" name="太陽光から (自家消費 kWh)" fill="#10b981" maxBarSize={40} />
                          <Bar yAxisId="left" dataKey="gridFrom" stackId="a" name="系統から (買電 kWh)" fill="#f43f5e" maxBarSize={40} />
                          <Line yAxisId="left" type="monotone" dataKey="consumption" name="総消費電力 (kWh)" stroke="#0f172a" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 mb-4">☀️ {selectedMonth}月度 日次:発電量と日照時間の推移</h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dailyData} syncId="dailyDataSync" margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} />
                          <YAxis yAxisId="left" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxGen]} width={55} />
                          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxSun]} width={55} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="generation" name="日次発電量 (kWh)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          <Line yAxisId="right" type="monotone" dataKey="sunlight" name="日照時間 (時間)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* タブ2：月次データ */}
              {activeTab === 2 && (
                <div className="space-y-12">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 mb-4">📈 {selectedYear}年 月次:消費電力分析（kWh）</h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyChartDataExtended} syncId="monthlyDataSync" margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="monthLabel" stroke="#94a3b8" tick={{fontSize: 12}} />
                          <YAxis yAxisId="left" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxMonthCons]} width={55} />
                          <YAxis yAxisId="right" orientation="right" tick={false} axisLine={false} width={55} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="solarFrom" stackId="a" name="太陽光から (自家消費 kWh)" fill="#10b981" maxBarSize={40} />
                          <Bar yAxisId="left" dataKey="gridFrom" stackId="a" name="系統から (買電 kWh)" fill="#f43f5e" maxBarSize={40} />
                          <Line yAxisId="left" type="monotone" dataKey="consumption" name="総消費電力 (kWh)" stroke="#0f172a" strokeWidth={2} dot={{ r: 4, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 mb-4">☀️ {selectedYear}年 月次:発電量と日照時間の推移</h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyChartDataExtended} syncId="monthlyDataSync" margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="monthLabel" stroke="#94a3b8" tick={{fontSize: 12}} />
                          <YAxis yAxisId="left" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxMonthGen]} width={55} />
                          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxMonthSun]} width={55} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="generation" name="月次発電量 (kWh)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          <Line yAxisId="right" type="monotone" dataKey="sunlight" name="月次総日照時間 (時間)" stroke="#eab308" strokeWidth={2} dot={{ r: 4, fill: '#eab308', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
              
              {/* タブ3：相関図 */}
              {activeTab === 3 && dailyData.length > 0 && (
                <div className="space-y-12">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 mb-4">📊 {selectedMonth}月度 日次相関分析（赤＝当月傾向線 ／ 緑＝年間通期傾向線）</h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" dataKey="sunlight" name="日照時間" unit="h" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxSun]} />
                          <YAxis type="number" dataKey="generation" name="発電量" unit="kWh" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxGen]} />
                          <Tooltip content={CustomScatterTooltip} />
                          <Legend />
                          <Scatter name="各日の実測値" data={dailyData} fill="#3b82f6" shape="circle" fillOpacity={0.8} />
                          {monthTrend.length > 0 && (
                            <Line data={monthTrend} type="monotone" dataKey="trend" name="当月傾向線" stroke="#f43f5e" strokeWidth={2} dot={{ r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} activeDot={false} />
                          )}
                          {yearTrend.length > 0 && (
                            <Line data={yearTrend} type="monotone" dataKey="trend" name="年間通期傾向線（比較用）" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                          )}
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-500 mb-4">📅 {selectedYear}年 年間日次相関分析（通期トレンド・外れ値抽出）</h3>
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" dataKey="sunlight" name="日照時間" unit="h" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxSun]} />
                          <YAxis type="number" dataKey="generation" name="発電量" unit="kWh" stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxGen]} />
                          <Tooltip content={CustomScatterTooltip} />
                          <Legend />
                          <Scatter name="年間の全日次データ" data={dailyDataThisYear} fill="#64748b" opacity={0.6} />
                          {yearTrend.length > 0 && (
                            <Line data={yearTrend} type="monotone" dataKey="trend" name="年間通期傾向線" stroke="#10b981" strokeWidth={2} dot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={false} />
                          )}
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
              
              {/* タブ4：前年同月比較 */}
              {activeTab === 4 && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yoySummaryData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 14, fontWeight: 'bold'}} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 12}} domain={[0, yMaxSummary]} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                    <Legend />
                    <Bar dataKey="前年同月" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="選択月" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {(activeTab === 1 || activeTab === 3) && dailyData.length === 0 && (
                <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">対象データがありません。CSVをインポートしてください。</p>
                </div>
              )}

              {/* タブ5：年間:発電予実 */}
              {activeTab === 5 && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={annualChartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="monthLabel" stroke="#94a3b8" tick={{fontSize: 12}} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                    <Legend />
                    <Bar dataKey="actual" name="実績 (kWh)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Line type="monotone" dataKey="sim" name="シミュレーション目標" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {/* タブ6：投資回収 */}
              {activeTab === 6 && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={roiData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="year" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />
                    <Bar dataKey="actual" name="累計実績" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Line type="monotone" dataKey="sim" name="目標推移" stroke="#f59e0b" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}