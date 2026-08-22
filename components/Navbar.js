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
    <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-emerald-600 hover:text-emerald-700">
          💰 {appName}
        </Link>
        
        {loading ? (
          <div className="w-20 h-8 bg-gray-100 rounded animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              历史记录
            </Link>
            <span className="text-sm text-gray-500 hidden sm:inline">{user.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              退出
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              登录
            </Link>
            <Link
              href="/login?mode=signup"
              className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              注册
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
