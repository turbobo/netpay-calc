'use client'

import { useState, useEffect } from 'react'
import { auth } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import Calculator from '../../components/Calculator'
import { formatMoney } from '../../lib/calculator'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])

  useEffect(() => {
    auth.getUser().then(({ user }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        loadHistory(user.id)
      }
      setLoading(false)
    })
  }, [router])

  const loadHistory = (userId) => {
    const saved = []
    try {
      const raw = localStorage.getItem(`netpay_history_${userId}`)
      if (raw) saved.push(...JSON.parse(raw))
    } catch (e) {
      console.error('加载历史记录失败', e)
    }
    setHistory(saved)
  }

  const handleSave = (result) => {
    if (!user) return
    const entry = {
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
    const updated = [entry, ...history]
    setHistory(updated)
    try {
      localStorage.setItem(`netpay_history_${user.id}`, JSON.stringify(updated))
    } catch (e) {
      console.error('保存失败', e)
    }
  }

  const handleDelete = (id) => {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    try {
      localStorage.setItem(`netpay_history_${user.id}`, JSON.stringify(updated))
    } catch (e) {
      console.error('删除失败', e)
    }
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
          {/* 上方：计算器 */}
          <div>
            <h2 className="font-semibold mb-4 text-slate-200">新建计算</h2>
            <Calculator onSave={handleSave} />
          </div>

          {/* 下方：历史记录 */}
          <div>
            <h2 className="font-semibold mb-4 text-slate-200">
              历史记录（{history.length}）
            </h2>
            {history.length === 0 ? (
              <div className="dashboard-panel p-8 text-center">
                <p className="text-slate-400">暂无记录，完成计算后点击“保存此次计算”</p>
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
