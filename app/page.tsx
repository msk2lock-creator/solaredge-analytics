"use client";
import React, { useState } from 'react';

export default function SolarEdgeApp() {
  const [currentView, setCurrentView] = useState('login');

  // --- ログイン画面のコンポーネント ---
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
              onClick={() => setCurrentView('upload')}
              className="w-full bg-blue-600 hover:bg-blue-700 active:transform active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-200 mt-2"
            >
              サインイン
            </button>
            
            <p className="text-center text-xs text-gray-400 mt-4">
              パスワードをお忘れですか？
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- その他の画面（アップロード・ダッシュボード）は省略 ---
  return <div className="p-8">ダッシュボードへ遷移しました。</div>;
}