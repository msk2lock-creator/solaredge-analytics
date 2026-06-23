"use client";
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, Line, ReferenceLine
} from 'recharts';

// --- モックデータ ---
const dailyData = [
  { date: '4/1', generation: 0.05, consumption: 0.63, fromGrid: 0.57 },
  { date: '4/2', generation: 0.23, consumption: 0.61, fromGrid: 0.38 },
  { date: '4/3', generation: 0.22, consumption: 0.69, fromGrid: 0.47 },
  { date: '4/4', generation: 0.07, consumption: 0.71, fromGrid: 0.64 },
  { date: '4/5', generation: 0.22, consumption: 0.65, fromGrid: 0.43 },
  { date: '4/6', generation: 0.18, consumption: 0.74, fromGrid: 0.56 },
  { date: '4/7', generation: 0.26, consumption: 1.05, fromGrid: 0.79 },
  { date: '4/8', generation: 0.35, consumption: 1.12, fromGrid: 0.77 },
  { date: '4/9', generation: 0.04, consumption: 0.66, fromGrid: 0.62 },
  { date: '4/10', generation: 0.31, consumption: 0.88, fromGrid: 0.57 },
];

export default function SolarEdgeApp() {
  // --- 認証・表示状態管理 ---
  // 開発・テスト用に初期値を true に設定し、ログイン画面をスキップしています
  const [isLoggedIn, setIsLoggedIn] = useState(true); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState(4); 
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('4');

  // --- データの定義 ---
  const [monthlyData] = useState([
    { month: '1月', sim: 3582, actual: 3450, selfSufficiency: 15.2 },
    { month: '2月', sim: 4423, actual: 4620, selfSufficiency: 18.5 },
    { month: '3月', sim: 6061, actual: 5900, selfSufficiency: 21.0 },
    { month: '4月', sim: 6446, actual: 7090, selfSufficiency: 23.7 },
    { month: '5月', sim: 6768, actual: null, selfSufficiency: 0 },
    { month: '6月', sim: 5208, actual: null, selfSufficiency: 0 },
    { month: '7月', sim: 6641, actual: null, selfSufficiency: 0 },
    { month: '8月', sim: 6996, actual: null, selfSufficiency: 0 },
    { month: '9月', sim: 6548, actual: null, selfSufficiency: 0 },
    { month: '10月', sim: 5605, actual: null, selfSufficiency: 0 },
    { month: '11月', sim: 4150, actual: null, selfSufficiency: 0 },
    { month: '12月', sim: 3637, actual: null, selfSufficiency: 0 },
  ]);

  const [roiData] = useState([
    { year: '0年', sim: -10000, actual: -10000 },
    { year: '1年', sim: -8547, actual: -8200 },
    { year: '2年', sim: -7099, actual: -6500 },
    { year: '3年', sim: -5658, actual: -5000 },
    { year: '4年', sim: -4223, actual: null },
    { year: '5年', sim: -2794, actual: null },
    { year: '6年', sim: -1371, actual: null },
    { year: '7年', sim: 46, actual: null }, 
  ]);

  // --- ログイン処理 ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'admin' && password === 'admin') {
      setIsLoggedIn(true);
    } else {
      alert('ユーザー名またはパスワードが違います（demo: admin / admin）');
    }
  };

  // --- 勝手に分析機能のロジック（完全自家消費特化） ---
  const getAutoAnalysis = () => {
    const currentData = monthlyData.find(d => d.month === `${selectedMonth}月`);
    if (!currentData || currentData.actual === null) {
      return { status: "info", title: "データ待機中", message: "対象月のデータがインポートされると自動分析を開始します。", action: "SolarEdgeのCSVデータをアップロードしてください。" };
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

  // --- ログイン画面 ---
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
            <input type="text" placeholder="ユーザー名" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-800" />
            <input type="password" placeholder="パスワード" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-slate-800" />
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all">ログイン</button>
          </form>
        </div>
      </div>
    );
  }

  // --- メインダッシュボード ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10">
      
      {/* ヘッダー */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:mb-0">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">西岡勝次商店 分析レポート</h1>
          <div className="flex items-center gap-4 mt-2 print:hidden">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm outline-none cursor-pointer">
              {[1,2,3,4].map(m => <option key={m} value={m}>{m}月度実績</option>)}
            </select>
            <span className="text-slate-400 text-sm font-medium">最終更新: 2026/06/23</span>
          </div>
        </div>
        <div className="flex gap-3 print:hidden">
          <button onClick={() => window.print()} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            レポート印刷
          </button>
          <button className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg">データインポート</button>
          {/* 開発中にログアウトしてログイン画面を確認したい場合の隠しボタン */}
          <button onClick={() => setIsLoggedIn(false)} className="bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-300 transition-all">ロック確認</button>
        </div>
      </header>

      {/* 勝手に分析エリア */}
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

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4">
        {[
          { label: '当月総発電量', val: '1.84', unit: 'MWh', sub: '計画比 +12%', color: 'text-emerald-600' },
          { label: '電力自給率', val: '23.7', unit: '%', sub: '自家消費モデル', color: 'text-amber-600' },
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

      {/* メインエリア */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
        <div className="flex flex-wrap gap-4 mb-8 border-b border-slate-100 pb-4 print:hidden">
          {['消費電力', '発電と日照時間', '相関分析', '発電予実', '投資回収'].map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i+1)} className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === i+1 ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="h-[400px] w-full">
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
              <p className="text-slate-400 font-medium">現在、詳細データを解析中...（Google Sheets連携時に表示）</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}