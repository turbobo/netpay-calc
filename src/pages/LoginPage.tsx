import { useState } from 'react'
import { auth } from '../utils/supabase'
import { useHashRoute } from '../hooks/useHashRoute'

export default function LoginPage() {
  const { params, navigate } = useHashRoute()
  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'login'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState(initialMode)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error } = await auth.signUp(email, password)
      if (error) {
        setError(error.message)
      } else {
        navigate('/dashboard')
      }
    } else {
      const { error } = await auth.signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        navigate('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="dashboard-panel p-8">
          <div className="text-center mb-8">
            <a href="#/" className="inline-flex items-center gap-2 text-xl font-bold text-slate-950">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950" aria-hidden="true">¥</span>
              NetPay Calc
            </a>
            <h1 className="text-xl font-semibold mt-4">
              {mode === 'login' ? '欢迎回来' : '创建免费账号'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'login' ? '登录以查看历史记录' : '保存每次计算结果，随时对比'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input"
                placeholder="至少 6 位"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            {mode === 'login' ? (
              <p className="text-gray-600">
                还没有账号？{' '}
                <button onClick={() => { setMode('signup'); setError('') }} className="text-emerald-600 hover:underline font-medium">
                  免费注册
                </button>
              </p>
            ) : (
              <p className="text-gray-600">
                已有账号？{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="text-emerald-600 hover:underline font-medium">
                  去登录
                </button>
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="#/" className="text-sm text-slate-400 hover:text-white">
            ← 返回首页
          </a>
        </div>
      </div>
    </div>
  )
}
