import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { auth } from '../utils/supabase'
import { useHashRoute } from '../hooks/useHashRoute'
import Navbar from '../components/Navbar'
import Calculator from '../components/Calculator'
import { formatMoney } from '../utils/calculator'
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
    } else if (overflow) {
      setStorageNotice(`历史记录上限为 ${MAX_HISTORY_ENTRIES} 条，最早的记录已自动移除。`)
    } else {
      setStorageNotice('')
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
          <p className="eyebrow text-emerald-300 mb-2">Saved scenarios</p>
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
                  <div key={entry.id} className="dashboard-panel p-4 text-slate-950">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm text-gray-500">{entry.city}</span>
                        {entry.month && (
                          <span className="text-xs text-emerald-600 ml-2">{entry.month} 月</span>
                        )}
                        <span className="text-xs text-gray-400 ml-2">{entry.date}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        删除
                      </button>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div>
                        <p className="text-xs text-gray-400">当月总收入</p>
                        <p className="font-medium">¥{formatMoney(entry.gross)}</p>
                        {(entry.taxableExtraIncome > 0 || entry.nonTaxableExtraIncome > 0) && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            额外收入 ¥{formatMoney(
                              (entry.taxableExtraIncome || 0) + (entry.nonTaxableExtraIncome || 0),
                            )}
                          </p>
                        )}
                      </div>
                      <div className="text-gray-300">→</div>
                      <div>
                        <p className="text-xs text-gray-400">到手</p>
                        <p className="font-bold text-emerald-600">¥{formatMoney(entry.netPay)}</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-xs text-gray-400">扣除</p>
                        <p className="text-sm text-red-500">-¥{formatMoney(entry.insurance + entry.tax)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
