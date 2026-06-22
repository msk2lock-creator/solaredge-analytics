"use client";
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, ScatterChart, Scatter, Line, ReferenceLine
} from 'recharts';

// 日次モックデータ（4月1日〜4月10日）
const dailyData = [
  { date: '4/1', generation: 0.05, consumption: 0.63, fromGrid: 0.57, sunHours: 0.5 },
  { date: '4/2', generation: 0.23, consumption: 0.61, fromGrid: 0.38, sunHours: 4.2 },
  { date: '4/3', generation: 0.22, consumption: 0.69, fromGrid: 0.47, sunHours: 4.0 },
  { date: '4/4', generation: 0.07, consumption: 0.71, fromGrid: 0.64, sunHours: 1.2 },
  { date: '4/5', generation: 0.22, consumption: 0.65, fromGrid: 0.43, sunHours: 4.5 },
  { date: '4/6', generation: 0.18, consumption: 0.74, fromGrid: 0.56, sunHours: 3.1 },
  { date: '4/7', generation: 0.26, consumption: 1.05, fromGrid: 0.79, sunHours: 5.8 },
  { date: '4/8', generation: 0.35, consumption: 1.12, fromGrid: 0.77, sunHours: 7.2 },
  { date: '4/9', generation: 0.04, consumption: 0.66, fromGrid: 0.62, sunHours: 0.2 },
  { date: '4/10', generation: 0.31, consumption: 0.88, fromGrid: 0.57, sunHours: 6.5 },
];

export default function SolarEdgeApp() {
  const [currentView, setCurrentView] = useState('login');
  const [activeTab, setActiveTab] = useState(4); 
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('4');

  // --- 状態管理：月別シミュレーションデータ ---
  const [monthlyData, setMonthlyData] = useState([
    { month: '1月', sim: 3582, actual: 3450 },
    { month: '2月', sim: 4423, actual: 4620 },
    { month: '3月', sim: 6061, actual: 5900 },
    { month: '4月', sim: 6446, actual: 2150 }, 
    { month: '5月', sim: 6768, actual: null },
    { month: '6月', sim: 5208, actual: null },
    { month: '7月', sim: 6641, actual: null },
    { month: '8月', sim: 6996, actual: null },
    { month: '9月', sim: 6548, actual: null },
    { month: '10月', sim: 5605, actual: null },
    { month: '11月', sim: 4150, actual: null },
    { month: '12月', sim: 3637, actual: null },
  ]);

  // --- 状態管理：投資回収シミュレーションデータ ---
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
    { year: '11年', sim: 5652, actual: null },
    { year: '12年', sim: 7038, actual: null },
    { year: '13年', sim: 8418, actual: null },
    { year: '14年', sim: 9793, actual: null },
    { year: '15年', sim: 11160, actual: null },
    { year: '16年', sim: 12522, actual: null },
    { year: '17年', sim: 13878, actual: null },
    { year: '18年', sim: 15228, actual: null },
    { year: '19年', sim: 16571, actual: null },
    { year: '20年', sim: 17909, actual: null },
  ]);

  // 1. ログイン画面
  if (currentView === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md animate-in fade-in duration-700">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SolarEdge Analytics</h1>
            <p className="text-gray-500 mt-2 text-sm font-medium">発電データ分析プラットフォームへログイン</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">メールアドレス</label>
              <input type="email" placeholder="admin@solaredge.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">パスワード</label>
              <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button onClick={() => setCurrentView('dashboard')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg mt-2">サインイン</button>
          </div>
        </div>
      </div>
    );
  }

  // 2. アップロード画面
  if (currentView === 'upload') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">データインポート</h1>
          <button onClick={() => setCurrentView('dashboard')} className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">← ダッシュボードへ戻る</button>
        </header>
        <div className="max-w-3xl mx-auto bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center mt-12 animate-in fade-in duration-500">
          <h2 className="text-xl font-bold mb-6 text-gray-800">SolarEdge CSVデータのアップロード</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 mb-6 bg-gray-50 hover:bg-gray-100 cursor-pointer">
            <p className="text-gray-600 font-medium">CSVファイルをここにドラッグ＆ドロップ</p>
          </div>
          <button 
            onClick={() => { setIsUploading(true); setTimeout(() => { setIsUploading(false); setCurrentView('dashboard'); }, 1500); }}
            disabled={isUploading}
            className={`px-8 py-3.5 rounded-xl font-bold text-white transition-all shadow-sm ${isUploading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isUploading ? 'データを解析中...' : 'アップロードして分析を開始'}
          </button>
        </div>
      </div>
    );
  }

  // 3. シミュレーション設定画面（新規追加）
  if (currentView === 'settings') {
    return (
      <div className="min-h-screen bg-gray-50 p-8 pb-20">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">シミュレーション値の初期設定</h1>
          <button onClick={() => setCurrentView('dashboard')} className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
            ← 保存せずに戻る
          </button>
        </header>

        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          
          {/* 月間発電量設定 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg></span>
              月間発電量 シミュレーション予測値 (単位: kWh)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {monthlyData.map((data, index) => (
                <div key={data.month} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">{data.month}</label>
                  <input 
                    type="number" 
                    value={data.sim}
                    onChange={(e) => {
                      const newData = [...monthlyData];
                      newData[index].sim = Number(e.target.value);
                      setMonthlyData(newData);
                    }}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-semibold focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 text-right">
              <p className="text-sm font-bold text-gray-600">年間予測合計: <span className="text-xl text-orange-600">{monthlyData.reduce((acc, cur) => acc + cur.sim, 0).toLocaleString()}</span> kWh</p>
            </div>
          </div>

          {/* 投資回収設定 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
              費用対効果（投資回収）推定表 (単位: 千円)
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
              {roiData.map((data, index) => (
                <div key={data.year} className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">{data.year}</label>
                  <input 
                    type="number" 
                    value={data.sim}
                    onChange={(e) => {
                      const newData = [...roiData];
                      newData[index].sim = Number(e.target.value);
                      setRoiData(newData);
                    }}
                    className={`w-full bg-white border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none ${data.sim < 0 ? 'text-red-600' : 'text-blue-700'}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="bg-gray-800 hover:bg-gray-900 text-white px-10 py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              設定を保存してダッシュボードへ反映
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 4. ダッシュボード画面本編
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4 animate-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">西岡勝次商店 発電分析ダッシュボード</h1>
          
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm font-medium text-gray-500">対象データ:</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700 shadow-sm cursor-pointer">
              <option value="2024">2024年</option>
              <option value="2025">2025年</option>
              <option value="2026">2026年</option>
            </select>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-gray-700 shadow-sm cursor-pointer">
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}月</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          {/* 新規：設定ボタン */}
          <button onClick={() => setCurrentView('settings')} className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 active:scale-[0.98] text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            シミュレーション設定
          </button>
          
          <button onClick={() => setCurrentView('upload')} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            データインポート
          </button>
          <button onClick={() => setCurrentView('login')} className="text-sm font-medium text-gray-500 hover:text-gray-800 py-2 ml-2 transition-colors">ログアウト</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">当月総発電量</p>
          <p className="text-3xl font-bold text-gray-800">1.84 <span className="text-base font-medium text-gray-500">MWh</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">電力自給率</p>
          <p className="text-3xl font-bold text-blue-600">23.7 <span className="text-base font-medium text-gray-500">%</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 mb-1">CO2排出削減量 (累計実績)</p>
          <p className="text-3xl font-bold text-green-600">8.2 <span className="text-base font-medium text-gray-500">t-CO2</span></p>
          <p className="text-xs text-green-600 mt-2 font-medium">杉の木換算: 約376本分</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl shadow-sm border border-orange-200">
          <p className="text-sm font-medium text-orange-700 mb-1">累計投資回収額 (実績推定)</p>
          <p className="text-3xl font-bold text-orange-600">5,000 <span className="text-base font-medium text-orange-500">千円</span></p>
          <p className="text-xs text-orange-600 mt-2 font-medium">進捗率: 50.0% / 導入費10,000千円</p>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-8 min-w-max">
          {[1, 2, 3, 4, 5].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-colors ${
                activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab === 1 && '① 消費電力データ'}
              {tab === 2 && '② 発電電力 ＋ 日照時間'}
              {tab === 3 && '③ 日照時間との相関'}
              {tab === 4 && '④ 発電量 シミュレーション比較'}
              {tab === 5 && '⑤ 投資回収 シミュレーション比較'}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[500px]">
        {activeTab === 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="generation" name="発電（太陽光から）" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fromGrid" name="買電（系統から）" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 2 && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area yAxisId="right" type="monotone" dataKey="sunHours" name="日照時間" fill="#86efac" stroke="#22c55e" opacity={0.5} />
              <Bar yAxisId="left" dataKey="generation" name="発電量" fill="#f97316" barSize={30} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {activeTab === 3 && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" dataKey="sunHours" name="日照時間" unit="h" />
              <YAxis type="number" dataKey="generation" name="発電量" unit="MWh" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="日別データ" data={dailyData} fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {activeTab === 4 && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 px-4">
              <h3 className="font-bold text-gray-700">月間発電量：シミュレーション予測と実績の比較</h3>
              <div className="text-sm bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full font-bold border border-orange-200">
                年間予測: {monthlyData.reduce((acc, cur) => acc + cur.sim, 0).toLocaleString()} kWh
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} kWh`, '']} labelFormatter={(label) => `${label} のデータ`} />
                <Legend />
                <Bar dataKey="actual" name="実績発電量" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Area type="monotone" dataKey="sim" name="シミュレーション予測" fill="#f97316" stroke="#ea580c" opacity={0.15} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="sim" name="予測ライン" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 5 && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 px-4">
              <h3 className="font-bold text-gray-700">費用対効果（投資回収）：シミュレーション予測と実績の比較</h3>
              <div className="text-sm bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-bold border border-blue-200">
                目標 採算年数: 6年11ヶ月
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={roiData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${value.toLocaleString()}`} domain={[-12000, 20000]} />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} 千円`, '']} labelFormatter={(label) => `${label} 経過時点`} />
                <Legend />
                <ReferenceLine y={0} stroke="#666" strokeWidth={2} />
                <Bar dataKey="actual" name="実績累計損益" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="sim" name="シミュレーション予測 (目標ライン)" stroke="#ea580c" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}