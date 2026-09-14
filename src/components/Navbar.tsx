import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { auth } from '../utils/supabase'

interface NavbarProps {
  appName?: string
  onUserChange?: (user: User | null) => void
}

export default function Navbar({ appName = 'NetPay Calc', onUserChange }: NavbarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    auth.getUser().then(({ user }) => {
      setUser(user)
      onUserChange?.(user)
      setLoading(false)
    })

    const { data: { subscription } } = auth.onAuthChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      onUserChange?.(u)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await auth.signOut()
    window.location.hash = '/'
    window.location.reload()
  }

  // Close mobile menu on route change
  useEffect(() => {
    const onHashChange = () => setMobileMenuOpen(false)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <>
      <nav className="bg-slate-950/85 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex justify-between items-center">
          <a href="#/" className="flex items-center gap-3 text-white hover:text-emerald-300 transition">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 font-black" aria-hidden="true">¥</span>
            <span>
              <span className="block text-sm font-bold tracking-wide">{appName}</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400">Income Console</span>
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-8 bg-white/10 rounded animate-pulse" />
            ) : user ? (
              <>
                <a href="#/dashboard" className="text-sm text-slate-300 hover:text-white">
                  历史记录
                </a>
                <span className="text-sm text-slate-400">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm text-slate-200 border border-white/15 hover:bg-white/10 rounded-lg transition"
                >
                  退出
                </button>
              </>
            ) : (
              <>
                <a href="#/login" className="px-4 py-2 text-sm text-slate-300 hover:text-white">
                  登录
                </a>
                <a href="#/login?mode=signup" className="px-4 py-2 text-sm bg-emerald-400 text-slate-950 font-semibold rounded-lg hover:bg-emerald-300 transition">
                  注册
                </a>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={closeMobile}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* Mobile menu drawer */}
      <div
        className={`fixed top-16 right-0 w-72 max-w-[85vw] z-50 md:hidden
          bg-slate-900 border-l border-b border-white/10 rounded-bl-xl shadow-2xl
          transform transition-transform duration-200 ease-out
          ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-5 space-y-1">
          {loading ? (
            <div className="space-y-3 px-3">
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
            </div>
          ) : user ? (
            <>
              <div className="px-3 py-2 mb-3 border-b border-white/10">
                <p className="text-xs text-slate-500 uppercase tracking-wider">已登录</p>
                <p className="text-sm text-slate-300 truncate mt-0.5">{user.email}</p>
              </div>
              <a
                href="#/dashboard"
                onClick={closeMobile}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-white/10 transition"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                历史记录
              </a>
              <button
                onClick={() => { handleLogout(); closeMobile() }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-200 hover:bg-white/10 transition"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出登录
              </button>
            </>
          ) : (
            <>
              <a
                href="#/login"
                onClick={closeMobile}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-white/10 transition"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                登录
              </a>
              <a
                href="#/login?mode=signup"
                onClick={closeMobile}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                免费注册
              </a>
            </>
          )}
        </div>
      </div>
    </>
  )
}
