"use client";
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, Line, ReferenceLine
} from 'recharts';

// 日次モックデータ（4月1日〜4月10日）
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
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState(4); 
  
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('4');

  // 月別データ（4月のみ実績が予測を大きく上回っている設定）
  const [monthlyData, setMonthlyData] = useState([
    { month: '1月', sim: 3582, actual: 3450, selfSufficiency: 15.2 },
    { month: '2月', sim: 4423, actual: 4620, selfSufficiency: 18.5 },
    { month: '3月', sim: 6061, actual: 5900, selfSufficiency: 21.0 },
    { month: '4月', sim: 6446, actual: 7090, selfSufficiency: 23.7 }, // 大幅上振れ
    { month: '5月', sim: 6768, actual: null, selfSufficiency: 0 },
    { month: '6月', sim: 5208, actual: null, selfSufficiency: 0 },
    { month: '7月', sim: 6641, actual: null, selfSufficiency: 0 },
    { month: '8月', sim: 6996, actual: null, selfSufficiency: 0 },
    { month: '9月', sim: 6548, actual: null, selfSufficiency: 0 },
    { month: '10月', sim: 5605, actual: null, selfSufficiency: 0 },
    { month: '11月', sim: 4150, actual: null, selfSufficiency: 0 },
    { month: '12月', sim: 3637, actual: null, selfSufficiency: 0 },
  ]);

  const [roiData, setRoiData] = useState([
    { year: '0年', sim: -10000, actual: -10000 },
    { year: '1年', sim: -8547, actual: -8200 },
    { year: '2年', sim: -7099, actual: -6500 },
    { year: '3年', sim: -5658, actual: -5000 },
    { year: '4年', sim: -4223, actual: null },
    { year: '5年', sim: -2794, actual: null },
    { year: '6年', sim: -1371, actual: null },
    { year: '7年', sim: 46, actual: null }, 
    { year: '8年', sim: 1457, actual: null },
    { year: '9年', sim: 2861, actual: null },
    { year: '10年', sim: 4260, actual: null },
  ]);

  // 🎯 【勝手に分析機能】完全自家消費特化の判定ロジック
  const getAutoAnalysis = () => {
    const currentData = monthlyData.find(d => d.month === `${selectedMonth}月`);
    
    if (!currentData || currentData.actual === null) {
      return {
        status: "info",
        title: "データ未インポート",
        message: "選択された月の実績データがまだ取り込まれていません。インポート完了後に自動分析が実行されます。",
        action: "右上の「データインポート」ボタンから、SolarEdgeのCSVデータをアップロードしてください。"
      };
    }

    const ratio = currentData.actual / currentData.sim;

    if (ratio >= 1.05) {
      // パターン1：【設備投資】余剰電力の発生
      return {
        status: "success",
        title: "🚀 【設備投資のご提案】使い切れない「もったいない電力」が発生しています",
        message: `今月はシミュレーション予測に対して実績が【+${Math.round((ratio - 1) * 100)}%】と大幅に上回っています。しかし、現在は完全自家消費（FITなし）での運用のため、使い切れずカット（出力抑制）された余剰電力が機会損失となっています。`,
        action: "💡 推奨アクション（次の一手）：小型〜中型の産業用蓄電池の導入を検討する最適なタイミングです。この捨てている電力を貯めて夕方以降の稼働に回すことで、電気代削減をさらに最大化できます。当財団経由で、『再エネ設備導入補助金』等の公的支援策を活用したシミュレーションの作成が可能です。ぜひ一度ご相談ください。"
      };
    } else if (ratio < 0.95) {
      // パターン3：【異常検知】発電効率の低下
      return {
        status: "warning",
        title: "⚠️ 【異常検知】好天にもかかわらず、発電効率が低下しています",
        message: `予測値に対して実績が【-${Math.round((1 - ratio) * 100)}%】に留まっています。地域の気象データ（日照時間）の推移と比較して、本来発揮されるべきパネルのパワーが出ていない可能性があります。`,
        action: "💡 推奨アクション（次の一手）：一時的な環境要因の可能性があります。周辺の樹木の成長による影落ちがないか、パネル表面への著しい汚れ（黄砂、鳥のフン等）の付着がないか、次回の見回りで目視点検をお願いします。また、パワーコンディショナーにエラー表示が出ていないかの確認も推奨します。"
      };
    } else if (ratio >= 0.95 && ratio < 0.99) {
      // パターン2：【運用改善】ピークシフトの余地あり
      return {
        status: "normal",
        title: "🔄 【運用改善アドバイス】機械の稼働時間をずらして、電気代を削減しましょう",
        message: "発電量は予測に近い水準ですが、夕方以降の買電量が多い一方で、日中（11時〜14時）の太陽光発電にはまだ自己消費を増やせる余力があります。",
        action: "💡 推奨アクション（次の一手）：現場の運用を見直し、フォークリフトやEVの充電、空調の予冷、電力を多く消費する加工機械の稼働時間を、お昼のピーク時へ意図的にシフト（移動）できないか検討してみてください。設備投資ゼロで、即座に電気代を引き下げることができます。"
      };
    } else {
      // パターン4：【安定稼働】計画通りの推移
      return {
        status: "normal",
        title: "✨ 【安定分析】シミュレーション計画通りの理想的な運用です",
        message: "予測値と実績値の乖離が極めて少なく、導入前の投資シミュレーションに沿った健全な推移となっています。",
        action: "💡 推奨アクション（次の一手）：現在の運用管理体制をそのまま維持してください。そろそろ導入から一定期間が経過するため、パワーコンディショナの吸気フィルター清掃など、日常的な自主メンテナンスのスケジュール確認をおすすめします。"
      };
    }
  };

  const analysis = getAutoAnalysis();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 print:bg-white print:text-slate-900 print:p-0">
      
      {/* 印刷・レポート用ヘッダー */}
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-slate-800 pb-6 print:border-b-2 print:border-slate-300">
        <div>
          <span className="text-amber-500 font-bold text-xs uppercase tracking-wider print:text-amber-600">MANAGEMENT REPORT</span>
          <h1 className="text-3xl font-bold text-white mt-1 print:text-slate-900">西岡勝次商店 発電・収支分析ダッシュボード</h1>
          
          <div className="flex items-center gap-2 mt-4 print:hidden">
            <span className="text-sm font-medium text-slate-400">対象データ期間:</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg text-sm px-3 py-1.5 outline-none text-slate-200 cursor-pointer">
              <option value="2026">2026年</option>
            </select>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg text-sm px-3 py-1.5 outline-none text-slate-200 cursor-pointer">
              {[...Array(4)].map((_, i) => <option key={i+1} value={i+1}>{i+1}月</option>)}
              {[...Array(8)].map((_, i) => <option key={i+5} value={i+5} disabled>{i+5}月（未インポート）</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 items-center print:hidden">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm"
          >
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            レポート印刷・PDF出力
          </button>
          
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm">
            データインポート
          </button>
        </div>
      </header>

      {/* 💡 新機能：勝手に分析＆ネクストアクションエリア */}
      <div className={`mb-8 p-6 rounded-2xl border transition-all ${
        analysis.status === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200 print:bg-emerald-50 print:border-emerald-300 print:text-emerald-900' :
        analysis.status === 'warning' ? 'bg-amber-950/40 border-amber-800 text-amber-200 print:bg-amber-50 print:border-amber-300 print:text-amber-900' :
        'bg-slate-800/60 border-slate-700 text-slate-200 print:bg-slate-50 print:border-slate-300 print:text-slate-900'
      }`}>
        <div className="flex items-start gap-4">
          <div className="mt-1">
            {analysis.status === 'success' && <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            {analysis.status === 'warning' && <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            {analysis.status === 'normal' && <svg className="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white print:text-slate-900 mb-1">{analysis.title}</h3>
            <p className="text-sm text-slate-300 print:text-slate-700 mb-3">{analysis.message}</p>
            <div className="p-3 bg-slate-900/60 border border-slate-700 rounded-xl font-semibold text-sm text-amber-400 print:bg-white print:border-slate-300 print:text-amber-800">
              {analysis.action}
            </div>
          </div>
        </div>
      </div>

      {/* 4枚のサマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 print:grid-cols-4">
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl print:border-slate-300 print:bg-slate-50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">当月総発電量</p>
          <p className="text-3xl font-bold text-white mt-2 print:text-slate-900">1.84 <span className="text-base font-medium text-slate-400">MWh</span></p>
          <span className="text-xs text-emerald-400 font-bold mt-1 block">計画比 +12.1%</span>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl print:border-slate-300 print:bg-slate-50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">電力自給率</p>
          <p className="text-3xl font-bold text-amber-500 mt-2 print:text-amber-600">23.7 <span className="text-base font-medium text-slate-400">%</span></p>
          <span className="text-xs text-slate-400 mt-1 block">自社消費比率の向上</span>
        </div>
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl print:border-slate-300 print:bg-slate-50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">当月収益改善額 (推定)</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2 print:text-emerald-600">442 <span className="text-base font-medium text-slate-400">千円</span></p>
          <span className="text-xs text-slate-400 mt-1 block">売電＋自家消費削減分</span>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/40 border border-amber-500/30 p-6 rounded-2xl print:border-slate-300 print:bg-slate-50">
          <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">累計投資回収額</p>
          <p className="text-3xl font-bold text-white mt-2 print:text-slate-900">5,000 <span className="text-base font-medium text-slate-400">千円</span></p>
          <span className="text-xs text-amber-500 font-bold mt-1 block">初期投資の 50.0% 回収完了</span>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-6 border-b border-slate-800 overflow-x-auto print:hidden">
        <nav className="-mb-px flex space-x-8 min-w-max">
          {[1, 2, 3, 4, 5].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors ${
                activeTab === tab ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 1 && '① 消費電力データ'}
              {tab === 2 && '② 発電電力 ＋ 日照時間'}
              {tab === 3 && '③ 日照時間との相関'}
              {tab === 4 && '④ 発電量 予実シミュレーション'}
              {tab === 5 && '⑤ 投資回収 予実シミュレーション'}
            </button>
          ))}
        </nav>
      </div>

      {/* グラフ・データ表示エリア */}
      <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl h-[450px] print:border-slate-300 print:bg-white print:h-[350px]">
        {activeTab === 4 && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-bold text-white print:text-slate-900 text-base">月間発電量：事前の予測値と実際のシミュレーション比較</h3>
              <div className="text-xs bg-slate-900 border border-slate-700 text-amber-500 px-3 py-1 rounded-full font-bold print:border-slate-300 print:text-slate-800">
                年間予測合計: 66,065 kWh
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" name="実績発電量 (kWh)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Area type="monotone" dataKey="sim" name="シミュレーション予測" fill="#f59e0b" stroke="#d97706" opacity={0.1} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="sim" name="予測目標ライン" stroke="#d97706" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 5 && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-bold text-white print:text-slate-900 text-base">費用対効果（投資回収）：シミュレーション予測と実績の推移</h3>
              <div className="text-xs bg-slate-900 border border-slate-700 text-amber-500 px-3 py-1 rounded-full font-bold print:border-slate-300 print:text-slate-800">
                目標採算年数: 6年11ヶ月
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={roiData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `${v.toLocaleString()}`} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />
                <Bar dataKey="actual" name="実績の累計損益 (千円)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={35} />
                <Line type="monotone" dataKey="sim" name="シミュレーション予測 (目標)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* タブ1〜3を選択した際の簡易表示 */}
        {[1, 2, 3].includes(activeTab) && (
          <div className="h-full flex items-center justify-center text-slate-400">
            <p>※ 日次詳細データ（タブ①〜③）は、上部の期間切り替え（月別）に連動してグラフが描画されます。</p>
          </div>
        )}
      </div>

    </div>
  );
}