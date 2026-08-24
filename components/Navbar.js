'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { auth } from '../lib/supabase'

export default function Navbar({ appName = 'NetPay Calc', onUserChange }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.getUser().then(({ user }) => {
      setUser(user)
      onUserChange?.(user)
      setLoading(false)
    })

    const { data: { subscription } } = auth.onAuthChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      onUserChange?.(u)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="bg-slate-950/85 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 text-white hover:text-emerald-300 transition">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 font-black" aria-hidden="true">¥</span>
          <span>
            <span className="block text-sm font-bold tracking-wide">{appName}</span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400">Income Console</span>
          </span>
        </Link>
        
        {loading ? (
          <div className="w-20 h-8 bg-white/10 rounded animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-300 hover:text-white">
              历史记录
            </Link>
            <span className="text-sm text-slate-400 hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm text-slate-200 border border-white/15 hover:bg-white/10 rounded-lg transition"
            >
              退出
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-slate-300 hover:text-white"
            >
              登录
            </Link>
            <Link
              href="/login?mode=signup"
              className="px-4 py-2 text-sm bg-emerald-400 text-slate-950 font-semibold rounded-lg hover:bg-emerald-300 transition"
            >
              注册
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
