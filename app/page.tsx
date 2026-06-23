"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Line, ReferenceLine
} from 'recharts';

interface MonthlyDataItem {
  month: string;
  sim: number;
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

export default function SolarEdgeApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [activeTab, setActiveTab] = useState(4); 
  
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('4');
  
  const [monthlyData, setMonthlyData] = useState<MonthlyDataItem[]>([]);
  const [allDailyData, setAllDailyData] = useState<DailyDataItem[]>([]); // 全ての日次データ
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roiData = [
    { year: '0年', sim: -10000, actual: -10000 },
    { year: '1年', sim: -8547, actual: -8200 },
    { year: '2年', sim: -7099, actual: -6500 },
    { year: '3年', sim: -5658, actual: -5000 },
    { year: '4年', sim: -4223, actual: null },
    { year: '5年', sim: -2794, actual: null },
    { year: '6年', sim: -1371, actual: null },
    { year: '7年', sim: 46, actual: null }, 
  ];

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

  useEffect(() => {
    fetchSpreadsheetData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      if (lines.length <= 1) {
        alert("CSVデータが空か、構造が正しくありません。");
        return;
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      const timeIdx = headers.indexOf('測定時間');
      const genIdx = headers.indexOf('発電 (MWh)');
      const consIdx = headers.indexOf('消費 (MWh)');
      const solarIdx = headers.indexOf('太陽光から (MWh)');
      const gridFromIdx = headers.indexOf('系統から (MWh)');

      let totalGenMwh = 0;
      let totalConsMwh = 0;
      let totalSolarMwh = 0;
      let targetYearStr = "";
      let targetMonthStr = "";
      
      const parsedDailyData: DailyDataItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.replace(/"/g, ''));
        if (columns.length < headers.length) continue;

        const timeValue = columns[timeIdx];
        const genValue = parseFloat(columns[genIdx]) || 0;
        const consValue = parseFloat(columns[consIdx]) || 0;
        const solarValue = parseFloat(columns[solarIdx]) || 0;
        const gridFromValue = parseFloat(columns[gridFromIdx]) || 0;

        totalGenMwh += genValue;
        totalConsMwh += consValue;
        totalSolarMwh += solarValue;

        if (!targetMonthStr && timeValue) {
          const match = timeValue.match(/(\d{4})年(\d+)月/);
          if (match) {
            targetYearStr = match[1];
            targetMonthStr = match[2];
          }
        }

        if (timeValue) {
          const dateMatch = timeValue.split(' ')[0];
          parsedDailyData.push({
            yearMonth: `${targetYearStr}年${targetMonthStr}月`,
            date: dateMatch.replace(/^\d{4}年/, ''),
            generation: Math.round(genValue * 1000),
            consumption: Math.round(consValue * 1000),
            solarFrom: Math.round(solarValue * 1000),
            gridFrom: Math.round(gridFromValue * 1000),
            sunlight: 0
          });
        }
      }

      const actualKwh = Math.round(totalGenMwh * 1000);
      const selfSufficiencyRate = totalConsMwh > 0 ? parseFloat(((totalSolarMwh / totalConsMwh) * 100).toFixed(1)) : 0;
      const targetYearMonth = `${targetYearStr}年${targetMonthStr}月`;

      try {
        // APIに月次データと日次データを一緒に送る
        const res = await fetch('/api/solar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: targetYearMonth,
            actual: actualKwh,
            selfSufficiency: selfSufficiencyRate,
            dailyData: parsedDailyData
          })
        });

        if (!res.ok) throw new Error('データ保存失敗');
        
        alert(`🎉 インポート成功！\n\n日次データもスプレッドシートへ完全に保存されました。`);
        
        setSelectedYear(targetYearStr);
        setSelectedMonth(targetMonthStr);
        fetchSpreadsheetData(); // 最新のデータを再取得
      } catch (err) {
        console.error(err);
        alert("スプレッドシートへの保存中にエラーが発生しました。");
      }
    };

    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // 選択された年月（例: 2026年4月）のデータだけを抽出
  const currentTargetStr = `${selectedYear}年${selectedMonth}月`;
  const currentTarget = monthlyData.find(d => d.month === currentTargetStr) || monthlyData.find(d => d.month === `${selectedMonth}月`);
  
  // 日次データをフィルタリング（重複してインポートした場合は上書きして整理する）
  const rawDaily = allDailyData.filter(d => d.yearMonth === currentTargetStr);
  const dailyMap = new Map<string, DailyDataItem>();
  rawDaily.forEach(d => dailyMap.set(d.date, d));
  const dailyData = Array.from(dailyMap.values());

  const getAutoAnalysis = () => {
    if (isLoading || monthlyData.length === 0) return { status: "info", title: "読み込み中...", message: "最新のデータを取得しています。", action: "少々お待ちください。" };
    if (!currentTarget || currentTarget.actual === null) return { status: "info", title: "データ待機中", message: `${currentTargetStr}の実績データがまだ登録されていません。`, action: "「データインポート」ボタンからCSVを選択すると自動解析が実行されます。" };
    const ratio = currentTarget.actual / (currentTarget.sim || 1);
    if (ratio >= 1.05) return { status: "success", title: "🚀 【設備投資案】余剰電力の蓄電池活用をご検討ください", message: `シミュレーション比の大幅な上振れです。`, action: "💡 推奨：産業用蓄電池の導入検討" };
    if (ratio < 0.95) return { status: "warning", title: "⚠️ 【異常検知】発電効率の低下が見られます", message: "日照条件と比較して発電量が不足しています。", action: "💡 推奨：パネルとパワコンの目視確認" };
    return { status: "normal", title: "✨ 【安定運用】理想的な発電推移です", message: "事前の投資計画通りに健全に推移しています。", action: "💡 推奨：現在の運用を継続" };
  };

  const analysis = getAutoAnalysis();
  const displayActual = currentTarget && currentTarget.actual !== null ? (currentTarget.actual / 1000).toFixed(2) : "0.00";
  const displaySufficiency = currentTarget ? currentTarget.selfSufficiency.toFixed(1) : "0.0";
  const displayRatio = currentTarget && currentTarget.actual !== null && currentTarget.sim > 0 ? ((currentTarget.actual / currentTarget.sim - 1) * 100).toFixed(1) : "0.0";

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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:mb-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">西岡勝次商店 分析レポート</h1>
          <div className="flex items-center gap-2 mt-2 print:hidden">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm outline-none">
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm outline-none">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}月度実績</option>)}
            </select>
            <button onClick={fetchSpreadsheetData} className="ml-2 text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg font-bold text-slate-700 transition-all">🔄 同期</button>
          </div>
        </div>
        <div className="flex gap-3 print:hidden">
          <button onClick={() => fileInputRef.current?.click()} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg">データインポート</button>
        </div>
      </header>

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

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex flex-wrap gap-4 mb-8 border-b border-slate-100 pb-4 print:hidden">
          {['消費電力', '発電と日照時間', '相関分析', '発電予実', '投資回収'].map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i+1)} className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === i+1 ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="h-[400px] w-full">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-medium">データを読み込み中...</div>
          ) : (
            <>
              {activeTab === 1 && dailyData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                    <Legend />
                    <Bar dataKey="solarFrom" stackId="a" name="太陽光から (自家消費 kWh)" fill="#10b981" maxBarSize={40} />
                    <Bar dataKey="gridFrom" stackId="a" name="系統から (買電 kWh)" fill="#f43f5e" maxBarSize={40} />
                    <Line type="monotone" dataKey="consumption" name="総消費電力 (kWh)" stroke="#0f172a" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              {activeTab === 2 && dailyData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} />
                    <YAxis yAxisId="left" stroke="#94a3b8" tick={{fontSize: 12}} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tick={{fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="generation" name="日次発電量 (kWh)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Line yAxisId="right" type="monotone" dataKey="sunlight" name="日照時間 (時間)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              {activeTab <= 3 && dailyData.length === 0 && (
                <div className="h-full flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">対象月の日次データがスプレッドシートにありません。CSVをインポートしてください。</p>
                </div>
              )}
              {activeTab === 4 && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{fontSize: 12}} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="actual" name="実績 (kWh)" fill="#0f172a" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Line type="monotone" dataKey="sim" name="シミュレーション目標" stroke="#f59e0b" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              {activeTab === 5 && (
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