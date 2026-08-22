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
      <div className="min-h-screen bg-gray-50">
        <Navbar appName="NetPay Calc" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar appName="NetPay Calc" />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">历史记录</h1>
          <p className="text-gray-500">查看和对比每次计算结果</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：计算器 */}
          <div>
            <h2 className="font-semibold mb-4 text-gray-700">新建计算</h2>
            <Calculator onSave={handleSave} />
          </div>

          {/* 右侧：历史记录 */}
          <div>
            <h2 className="font-semibold mb-4 text-gray-700">
              历史记录（{history.length}）
            </h2>
            {history.length === 0 ? (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <p className="text-gray-400">暂无记录，在左侧计算后点击"保存"</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm text-gray-500">{entry.city}</span>
                        {entry.month && (
                          <span className="text-xs text-indigo-500 ml-2">{entry.month} 月</span>
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
                        <p className="font-bold text-green-600">¥{formatMoney(entry.netPay)}</p>
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
