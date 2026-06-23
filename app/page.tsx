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

export default function SolarEdgeApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState(4); 
  const [selectedMonth, setSelectedMonth] = useState('4');
  const [monthlyData, setMonthlyData] = useState<MonthlyDataItem[]>([]);
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
      setMonthlyData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpreadsheetData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  // 📂 CSVインポート処理のメインロジック
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

      // ヘッダー行から各列のインデックスを動的に特定
      const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
      const timeIdx = headers.indexOf('測定時間');
      const genIdx = headers.indexOf('発電 (MWh)');
      const consIdx = headers.indexOf('消費 (MWh)');
      const solarIdx = headers.indexOf('太陽光から (MWh)');

      if (timeIdx === -1 || genIdx === -1 || consIdx === -1 || solarIdx === -1) {
        alert("必須項目（測定時間、発電、消費、太陽光から）がCSV内に見つかりません。");
        return;
      }

      let totalGenMwh = 0;
      let totalConsMwh = 0;
      let totalSolarMwh = 0;
      let targetMonthStr = "";

      // 各行を走査して合計値を集計
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map(c => c.replace(/"/g, ''));
        if (columns.length < headers.length) continue;

        const timeValue = columns[timeIdx];
        const genValue = parseFloat(columns[genIdx]) || 0;
        const consValue = parseFloat(columns[consIdx]) || 0;
        const solarValue = parseFloat(columns[solarIdx]) || 0;

        totalGenMwh += genValue;
        totalConsMwh += consValue;
        totalSolarMwh += solarValue;

        // 最初に見つかった日付情報から「〇月」を抽出（例: 2026年4月1日 -> 4月）
        if (!targetMonthStr && timeValue) {
          const match = timeValue.match(/(\d+)月/);
          if (match) targetMonthStr = `${match[1]}月`;
        }
      }

      if (!targetMonthStr) {
        alert("CSV内から対象の月度を判定できませんでした。");
        return;
      }

      // MWh から kWh へ変換（1000倍）し、四捨五入して整数に
      const actualKwh = Math.round(totalGenMwh * 1000);
      // 自給率の自動計算 (%)
      const selfSufficiencyRate = totalConsMwh > 0 ? parseFloat(((totalSolarMwh / totalConsMwh) * 100).toFixed(1)) : 0;

      // バックエンドAPI経由でスプレッドシートへ書き込み
      try {
        const res = await fetch('/api/solar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: targetMonthStr,
            actual: actualKwh,
            selfSufficiency: selfSufficiencyRate
          })
        });

        if (!res.ok) throw new Error('データ保存失敗');
        
        alert(`🎉 インポート成功！\n対象期間: ${targetMonthStr}\n総発電量: ${actualKwh.toLocaleString()} kWh\n電力自給率: ${selfSufficiencyRate} %\n\nGoogleスプレッドシートへの永続保存が完了しました。`);
        
        // 選択された月をインポートした月に自動切り替え
        const monthNum = targetMonthStr.replace('月', '');
        setSelectedMonth(monthNum);
        
        // 最新データを再読み込みして画面を更新
        fetchSpreadsheetData();
      } catch (err) {
        console.error(err);
        alert("スプレッドシートへの保存中にエラーが発生しました。");
      }
    };

    reader.readAsText(file);
    // 同じファイルを再度選択できるようにリセット
    if (e.target) e.target.value = '';
  };

  const getAutoAnalysis = () => {
    if (isLoading || monthlyData.length === 0) {
      return { status: "info", title: "読み込み中...", message: "最新のデータを取得しています。", action: "少々お待ちください。" };
    }
    const currentData = monthlyData.find(d => d.month === `${selectedMonth}月`);
    if (!currentData || currentData.actual === null) {
      return { status: "info", title: "データ待機中", message: `${selectedMonth}月の実績データがまだ登録されていません。`, action: "「データインポート」ボタンからCSVを選択すると自動解析が実行されます。" };
    }
    const ratio = currentData.actual / currentData.sim;
    if (ratio >= 1.05) {
      return {
        status: "success",
        title: "🚀 【設備投資案】余剰電力の蓄電池活用をご検討ください",
        message: `シミュレーション比 +${Math.round((ratio - 1) * 100)}% の大幅な上振れです。完全自家消費モデルのため、使い切れない電力を「捨てる」のは機会損失です。`,
        action: "💡 推奨：産業用蓄電池を導入し、この余剰分を夜間に回すことで電気代をさらに削減可能です。補助金を活用したシミュレーションを作成しましょう。"
      };
    } else if (ratio < 0.95) {
      return {
        status: "warning",
        title: "⚠️ 【異常検知】発電効率の低下が見られます",
        message: "日照条件と比較して発電量が不足しています。周辺の木の影や、パネルの汚れが原因の可能性があります。",
        action: "💡 推奨：次回の定期巡回の際に、パネル表面の目視確認とパワーコンディショナのエラーチェックを推奨します。"
      };
    } else {
      return {
        status: "normal",
        title: "✨ 【安定運用】理想的な発電推移です",
        message: "乖離が5%以内であり、事前の投資計画通りに極めて健全に推移しています。",
        action: "💡 推奨：現在の運用を継続してください。定期的なフィルター清掃など、軽微なメンテナンス計画の確認のみお願いします。"
      };
    }
  };

  const analysis = getAutoAnalysis();

  const currentTarget = monthlyData.find(d => d.month === `${selectedMonth}月`);
  const displayActual = currentTarget && currentTarget.actual !== null ? (currentTarget.actual / 1000).toFixed(2) : "0.00";
  const displaySufficiency = currentTarget ? currentTarget.selfSufficiency.toFixed(1) : "0.0";
  const displayRatio = currentTarget && currentTarget.actual !== null && currentTarget.sim > 0 ? ((currentTarget.actual / currentTarget.sim - 1) * 100).toFixed(1) : "0.0";

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 p-4 rounded-2xl">
              <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">SolarEdge Analytics</h1>
          <p className="text-center text-slate-500 mb-8 text-sm">西岡勝次商店様向け分析レポート</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="ユーザー名（空欄でログイン可）" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-800" />
            <input type="password" placeholder="パスワード（空欄でログイン可）" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-800" />
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">ログイン</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      
      {/* 隠しファイルインプット */}
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:mb-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">西岡勝次商店 分析レポート</h1>
          <div className="flex items-center gap-4 mt-2 print:hidden">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm outline-none cursor-pointer">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}月度実績</option>)}
            </select>
            <button onClick={fetchSpreadsheetData} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-lg font-bold text-slate-700 transition-all">🔄 スプレッドシート同期</button>
            <span className="text-slate-400 text-sm font-medium">最終更新: 2026/06/23</span>
          </div>
        </div>
        <div className="flex gap-3 print:hidden">
          <button onClick={() => window.print()} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            レポート印刷
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg"
          >
            データインポート
          </button>
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition-all">ログアウト</button>
        </div>
      </header>

      <div className={`mb-8 p-6 rounded-3xl border-2 shadow-sm transition-all ${
        analysis.status === 'success' ? 'bg-emerald-50 border-emerald-100' :
        analysis.status === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${analysis.status === 'success' ? 'bg-emerald-500' : analysis.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{analysis.title}</h3>
            <p className="text-slate-600 text-sm mb-4">{analysis.message}</p>
            <div className="inline-block bg-white px-4 py-2 rounded-xl border border-slate-200 font-bold text-sm text-amber-700 shadow-sm">
              {analysis.action}
            </div>
          </div>
        </div>
      </div>

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
            <p className="text-xs font-bold text-slate-400 mt-1">{kpi.sub}</p>
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
            <div className="h-full flex items-center justify-center text-slate-400 font-medium">
              データを読み込み中...
            </div>
          ) : (
            <>
              {activeTab === 4 && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{fontSize: 12}} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                    <Legend />
                    <Bar dataKey="actual" name="実績 (kWh)" fill="#0f172a" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Line type="monotone" dataKey="sim" name="シミュレーション目標" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
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
              {activeTab <= 3 && (
                <div className="h-full flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">現在、詳細データを解析中...（Google Sheetsの日次詳細シートと連携時に表示）</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}