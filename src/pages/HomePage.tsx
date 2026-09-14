import { useState } from 'react'
import Navbar from '../components/Navbar'
import Calculator from '../components/Calculator'
import type { User } from '@supabase/supabase-js'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)

  return (
    <div className="min-h-screen text-slate-950">
      <Navbar appName="NetPay Calc" onUserChange={setUser} />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
        {/* Hero */}
        <div className="mb-8 md:mb-10 max-w-3xl">
          <p className="eyebrow text-emerald-300 mb-3">Annual income planning</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
            看清每个月，算准全年到手收入
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl leading-relaxed">
            统一管理月薪、奖金、补贴和福利，按累计预扣法拆解 12 个月个税与实际到手收入。
          </p>
        </div>

        {/* Calculator */}
        <Calculator onSave={user ? () => {} : undefined} />

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          <div className="border border-white/10 bg-white/[0.06] p-5 rounded-xl text-white group hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-emerald-500/30">
            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="eyebrow text-emerald-300 mb-3">01 · Coverage</p>
            <h3 className="font-semibold mb-1">覆盖 8 大城市</h3>
            <p className="text-sm text-slate-400 leading-relaxed">自动匹配当地五险一金基数与默认公积金比例。</p>
          </div>
          <div className="border border-white/10 bg-white/[0.06] p-5 rounded-xl text-white group hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-emerald-500/30">
            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="eyebrow text-emerald-300 mb-3">02 · Breakdown</p>
            <h3 className="font-semibold mb-1">逐月收入明细</h3>
            <p className="text-sm text-slate-400 leading-relaxed">月薪、奖金、补贴、福利和扣除项一目了然。</p>
          </div>
          <div className="border border-white/10 bg-white/[0.06] p-5 rounded-xl text-white group hover:bg-white/[0.08] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-emerald-500/30">
            <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="eyebrow text-emerald-300 mb-3">03 · Tax</p>
            <h3 className="font-semibold mb-1">累计预扣计算</h3>
            <p className="text-sm text-slate-400 leading-relaxed">根据每月实际计税收入计算全年个税变化。</p>
          </div>
        </div>

        {/* CTA */}
        {!user && (
          <div className="text-center mt-10 py-7 px-5 border border-white/10 bg-white/[0.06] rounded-xl text-white">
            <h3 className="text-xl font-semibold mb-2">保存你的年度收入方案</h3>
            <p className="text-slate-400 mb-4">免费创建账号，保存每次计算结果，随时查看对比</p>
            <a href="#/login?mode=signup" className="btn-primary">
              免费注册
            </a>
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-slate-500 text-sm">
        <p>© 2026 NetPay Calc · 数据仅供参考，以实际发放为准</p>
      </footer>
    </div>
  )
}
