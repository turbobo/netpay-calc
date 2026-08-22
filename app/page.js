'use client'

import { useState } from 'react'
import Navbar from '../components/Navbar'
import Calculator from '../components/Calculator'

export default function Home() {
  const [user, setUser] = useState(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <Navbar appName="NetPay Calc" onUserChange={setUser} />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            税后工资计算器
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            输入税前月薪，3 秒算出到手收入。支持五险一金、个税、专项附加扣除，覆盖全国主要城市。
          </p>
        </div>

        {/* Calculator */}
        <Calculator onSave={user ? () => {} : null} />

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-3xl mb-3">🏙️</div>
            <h3 className="font-semibold mb-1">覆盖 8 大城市</h3>
            <p className="text-sm text-gray-500">北京、上海、广州、深圳等，自动匹配当地五险一金基数</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold mb-1">五险一金明细</h3>
            <p className="text-sm text-gray-500">养老、医疗、失业、公积金逐项列出，一目了然</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold mb-1">专项附加扣除</h3>
            <p className="text-sm text-gray-500">子女教育、房贷、赡养老人等，精准计算到手收入</p>
          </div>
        </div>

        {/* CTA */}
        {!user && (
          <div className="text-center mt-12 py-8 bg-white rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold mb-2">注册保存计算记录</h3>
            <p className="text-gray-500 mb-4">免费创建账号，保存每次计算结果，随时查看对比</p>
            <a href="/login?mode=signup" className="inline-block px-8 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
              免费注册
            </a>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-gray-400 text-sm">
        <p>© 2026 NetPay Calc · 数据仅供参考，以实际发放为准</p>
      </footer>
    </div>
  )
}
