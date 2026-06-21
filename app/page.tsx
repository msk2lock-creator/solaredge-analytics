"use client";
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, ScatterChart, Scatter
} from 'recharts';

// モックデータ（4月1日〜4月10日）
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
  const [activeTab, setActiveTab] = useState(1);

  // 1. ログイン画面（モダンデザイン）
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
              <input 
                type="email" 
                placeholder="admin@solaredge.com" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">パスワード</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
              />
            </div>
            
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-700 active:transform active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-200 mt-2"
            >
              サインイン
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ダッシュボード画面（元の3つのグラフ）
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">発電分析ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">対象データ: 2026年4月</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setCurrentView('login')} className="text-sm text-gray-500 hover:text-gray-700 py-2">ログアウト</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">当月総発電量</p>
          <p className="text-3xl font-bold text-gray-800">1.84 <span className="text-base font-normal text-gray-500">MWh</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">当月総消費量</p>
          <p className="text-3xl font-bold text-gray-800">7.74 <span className="text-base font-normal text-gray-500">MWh</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">電力自給率</p>
          <p className="text-3xl font-bold text-blue-600">23.7 <span className="text-base font-normal text-gray-500">%</span></p>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[1, 2, 3].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 1 && '① 消費電力データ'}
              {tab === 2 && '② 発電電力 ＋ 日照時間'}
              {tab === 3 && '③ 発電電力と日照時間の相関'}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px]">
        {activeTab === 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="generation" name="発電（太陽光から）" stackId="a" fill="#f97316" />
              <Bar dataKey="fromGrid" name="買電（系統から）" stackId="a" fill="#3b82f6" />
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
              <Bar yAxisId="left" dataKey="generation" name="発電量" fill="#f97316" barSize={30} />
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
      </div>
    </div>
  );
}