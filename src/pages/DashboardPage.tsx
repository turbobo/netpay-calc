import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { auth } from '../utils/supabase'
import { useHashRoute } from '../hooks/useHashRoute'
import Navbar from '../components/Navbar'
import Calculator from '../components/Calculator'
import { formatMoney } from '../utils/calculator'
import Toast from '../components/Toast'
import type { CalcResult } from '../utils/calculator'

interface HistoryEntry {
  id: number
  date: string
  city: string
  month: number
  baseSalary: number
  taxableExtraIncome: number
  nonTaxableExtraIncome: number
  gross: number
  netPay: number
  insurance: number
  tax: number
}

// 历史记录容量上限：超出后保留最新记录，自动移除最早的记录
const MAX_HISTORY_ENTRIES = 100

export default function DashboardPage() {
  const { navigate } = useHashRoute()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [storageNotice, setStorageNotice] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    auth.getUser().then(({ user }) => {
      if (!user) {
        navigate('/login')
      } else {
        setUser(user)
        loadHistory(user.id)
      }
      setLoading(false)
    })
  }, [navigate])

  const loadHistory = (userId: string) => {
    const saved: HistoryEntry[] = []
    try {
      const raw = localStorage.getItem(`netpay_history_${userId}`)
      if (raw) saved.push(...(JSON.parse(raw) as HistoryEntry[]).slice(0, MAX_HISTORY_ENTRIES))
    } catch (e) {
      console.error('加载历史记录失败', e)
    }
    setHistory(saved)
  }

  // 持久化历史记录，返回是否写入成功
  const persistHistory = (updated: HistoryEntry[]): boolean => {
    if (!user) return false
    try {
      localStorage.setItem(`netpay_history_${user.id}`, JSON.stringify(updated))
      return true
    } catch (e) {
      console.error('保存失败', e)
      return false
    }
  }

  const handleSave = (result: CalcResult) => {
    if (!user) return
    const entry: HistoryEntry = {
      id: Date.now(),
      date: new Date().toLocaleString('zh-CN'),
      city: result.cityInfo.label,
      month: result.monthly.month,
      baseSalary: result.monthly.baseSalary,
      taxableExtraIncome: result.monthly.taxableExtraIncome,
      nonTaxableExtraIncome: result.monthly.nonTaxableExtraIncome,
      gross: result.monthly.gross,
      netPay: result.monthly.netPay,
      insurance: result.monthly.insurance.total,
      tax: result.monthly.tax,
    }
    const withNewEntry = [entry, ...history]
    const overflow = withNewEntry.length > MAX_HISTORY_ENTRIES
    const updated = withNewEntry.slice(0, MAX_HISTORY_ENTRIES)
    setHistory(updated)
    const persisted = persistHistory(updated)
    if (!persisted) {
      setStorageNotice('本地存储空间不足，最新记录暂未写入浏览器存储，请删除部分历史记录后重试。')
      setToast({ message: '保存失败：存储空间不足', type: 'error' })
    } else if (overflow) {
      setStorageNotice(`历史记录上限为 ${MAX_HISTORY_ENTRIES} 条，最早的记录已自动移除。`)
      setToast({ message: '已保存（自动移除最早记录）', type: 'info' })
    } else {
      setStorageNotice('')
      setToast({ message: '✓ 计算结果已保存', type: 'success' })
    }
  }

  const handleDelete = (id: number) => {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    const persisted = persistHistory(updated)
    setStorageNotice(persisted ? '' : '本地存储空间不足，删除结果暂未写入浏览器存储。')
  }

  if (loading) {
    return (
      <div className="min-h-screen text-white">
        <Navbar appName="NetPay Calc" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen text-white">
      <Navbar appName="NetPay Calc" />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="mb-8">
          <p className="eyebrow text-emerald-300 mb-2">已保存方案</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white">年度收入工作台</h1>
          <p className="text-slate-400 mt-1">新建计算，并查看已保存的收入方案</p>
        </div>

        <div className="space-y-10">
          {/* Calculator */}
          <div>
            <h2 className="font-semibold mb-4 text-slate-200">新建计算</h2>
            <Calculator onSave={handleSave} />
          </div>

          {/* History */}
          <div>
            <h2 className="font-semibold mb-4 text-slate-200">
              历史记录（{history.length}）
            </h2>
            {storageNotice && (
              <div className="mb-4 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                {storageNotice}
              </div>
            )}
            {history.length === 0 ? (
              <div className="dashboard-panel p-8 text-center">
                <p className="text-slate-400">暂无记录，完成计算后点击"保存此次计算"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {history.map((entry) => (
                  <div key={entry.id} className="dashboard-panel p-4 text-slate-950 hover:shadow-lg transition-shadow duration-200">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-700">{entry.city}</span>
                          {entry.month && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{entry.month} 月</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{entry.date}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="删除记录"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Main amounts */}
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">总收入</p>
                        <p className="text-lg font-semibold tabular-nums">¥{formatMoney(entry.gross)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-0.5">到手</p>
                        <p className="text-xl font-bold text-emerald-600 tabular-nums">¥{formatMoney(entry.netPay)}</p>
                      </div>
                    </div>
                    
                    {/* Progress bar visualization */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">扣除明细</span>
                        <span className="text-red-500 font-medium tabular-nums">
                          -¥{formatMoney(entry.insurance + entry.tax)} ({entry.gross > 0 ? Math.round(((entry.insurance + entry.tax) / entry.gross) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full flex">
                          <div 
                            className="bg-amber-400 transition-all duration-300"
                            style={{ width: `${entry.gross > 0 ? (entry.insurance / entry.gross) * 100 : 0}%` }}
                            title={`五险一金: ¥${formatMoney(entry.insurance)}`}
                          />
                          <div 
                            className="bg-red-400 transition-all duration-300"
                            style={{ width: `${entry.gross > 0 ? (entry.tax / entry.gross) * 100 : 0}%` }}
                            title={`个税: ¥${formatMoney(entry.tax)}`}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <span>五险一金 ¥{formatMoney(entry.insurance)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-400" />
                          <span>个税 ¥{formatMoney(entry.tax)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Extra income if any */}
                    {(entry.taxableExtraIncome > 0 || entry.nonTaxableExtraIncome > 0) && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-gray-400 mb-1">额外收入</p>
                        <p className="text-sm text-emerald-600 font-medium tabular-nums">
                          +¥{formatMoney((entry.taxableExtraIncome || 0) + (entry.nonTaxableExtraIncome || 0))}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
