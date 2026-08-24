import { useState, useEffect, useMemo, useCallback } from 'react'
import { calculateNetPay, getCityList, getDeductionOptions, formatMoney } from '../utils/calculator'
import type { CalcResult } from '../utils/calculator'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)

function createEmptyMonthlyExtraIncomes() {
  return MONTH_OPTIONS.map(() => ({ taxable: '', nonTaxable: '' }))
}

interface CalculatorProps {
  onSave?: (result: CalcResult) => void
}

export default function Calculator({ onSave }: CalculatorProps) {
  const [salary, setSalary] = useState('')
  const [salaryMode, setSalaryMode] = useState<'monthly' | 'annual'>('monthly')
  const [city, setCity] = useState('beijing')
  const [housingRate, setHousingRate] = useState(0.12)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [specialDeduction, setSpecialDeduction] = useState(0)
  const [selectedDeductions, setSelectedDeductions] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1)
  const [monthlyExtraIncomes, setMonthlyExtraIncomes] = useState(createEmptyMonthlyExtraIncomes)
  const [result, setResult] = useState<CalcResult | null>(null)

  const cities = useMemo(() => getCityList(), [])
  const deductionOptions = useMemo(() => getDeductionOptions(), [])

  // Sync housing rate when city changes
  useEffect(() => {
    const cityRates: Record<string, number> = { beijing: 0.12, shanghai: 0.07, guangzhou: 0.12, shenzhen: 0.05, hangzhou: 0.12, chengdu: 0.12, nanjing: 0.12, wuhan: 0.12 }
    setHousingRate(cityRates[city] || 0.07)
  }, [city])

  // Sum selected deductions
  useEffect(() => {
    const total = selectedDeductions.reduce((sum, key) => {
      const opt = deductionOptions.find(o => o.key === key)
      return sum + (opt ? opt.amount : 0)
    }, 0)
    setSpecialDeduction(total)
  }, [selectedDeductions, deductionOptions])

  // Real-time calculation
  const doCalculate = useCallback(() => {
    const raw = parseFloat(salary)
    if (isNaN(raw) || raw <= 0) { setResult(null); return }
    const monthlySalary = salaryMode === 'annual' ? raw / 12 : raw
    const calcResult = calculateNetPay({
      salary: monthlySalary,
      city,
      specialDeduction,
      customRates: { housing: housingRate },
      monthlyExtraIncomes,
      selectedMonth,
    })
    setResult(calcResult)
  }, [salary, salaryMode, city, specialDeduction, housingRate, monthlyExtraIncomes, selectedMonth])

  useEffect(() => { doCalculate() }, [doCalculate])

  const toggleDeduction = (key: string) => {
    setSelectedDeductions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const updateMonthlyExtraIncome = (field: 'taxable' | 'nonTaxable', value: string) => {
    setMonthlyExtraIncomes(previous => previous.map((item, index) => (
      index === selectedMonth - 1 ? { ...item, [field]: value } : item
    )))
  }

  const applyExtraIncomeToAllMonths = (field?: 'taxable' | 'nonTaxable') => {
    const selectedIncome = monthlyExtraIncomes[selectedMonth - 1]
    setMonthlyExtraIncomes(previous => previous.map(item => (
      field
        ? { ...item, [field]: selectedIncome[field] }
        : { ...selectedIncome }
    )))
  }

  const clearAllExtraIncomes = () => {
    setMonthlyExtraIncomes(createEmptyMonthlyExtraIncomes())
  }

  const selectedExtraIncome = monthlyExtraIncomes[selectedMonth - 1]

  const handleSave = () => {
    if (onSave && result) onSave(result)
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Input area */}
      <div className="dashboard-panel p-5 md:p-7 mb-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 pb-5 mb-5 border-b border-slate-200">
          <div>
            <p className="eyebrow mb-2">Income setup</p>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-950">收入与扣除设置</h2>
          </div>
          <p className="text-sm text-slate-500">修改任意字段后自动重新计算</p>
        </div>

        {/* Salary mode toggle */}
        <div className="flex items-center gap-2 mb-4">
          <label className="block text-sm font-medium text-gray-700">
            {salaryMode === 'monthly' ? '税前月薪（元）' : '税前年薪（元）'}
            <span className="ml-2 text-xs font-normal text-emerald-600">自动应用 12 个月</span>
          </label>
          <button
            onClick={() => setSalaryMode(prev => prev === 'monthly' ? 'annual' : 'monthly')}
            className="ml-auto text-xs px-2.5 py-1 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition"
          >
            切换{salaryMode === 'monthly' ? '年薪' : '月薪'}模式
          </button>
        </div>
        <input
          type="number"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder={salaryMode === 'monthly' ? '如 15000' : '如 300000'}
          className="input text-lg font-semibold tabular-nums"
        />

        {/* Monthly extra income */}
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700">每月额外收入</h3>
              <p className="text-xs text-gray-500 mt-0.5">基础月薪自动应用全年；奖金、补贴和福利可按月设置</p>
            </div>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              aria-label="选择额外收入月份"
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            >
              {MONTH_OPTIONS.map(month => (
                <option key={month} value={month}>{month} 月</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 text-sm text-gray-600 mb-1">
                <label htmlFor="taxable-extra-income">计税额外收入（元）</label>
                <button type="button" onClick={() => applyExtraIncomeToAllMonths('taxable')} className="text-xs text-emerald-600 hover:text-emerald-800">
                  应用全年
                </button>
              </div>
              <input
                id="taxable-extra-income"
                type="number"
                min="0"
                step="100"
                value={selectedExtraIncome.taxable}
                onChange={(event) => updateMonthlyExtraIncome('taxable', event.target.value)}
                placeholder="如奖金、佣金"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 text-sm text-gray-600 mb-1">
                <label htmlFor="non-taxable-extra-income">不计税额外收入（元）</label>
                <button type="button" onClick={() => applyExtraIncomeToAllMonths('nonTaxable')} className="text-xs text-emerald-600 hover:text-emerald-800">
                  应用全年
                </button>
              </div>
              <input
                id="non-taxable-extra-income"
                type="number"
                min="0"
                step="100"
                value={selectedExtraIncome.nonTaxable}
                onChange={(event) => updateMonthlyExtraIncome('nonTaxable', event.target.value)}
                placeholder="如报销、免税补贴"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button type="button" onClick={() => applyExtraIncomeToAllMonths()} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition">
              将 {selectedMonth} 月全部应用全年
            </button>
            <button type="button" onClick={clearAllExtraIncomes} className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-600 text-xs hover:bg-gray-50 transition">
              清空全年额外收入
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">计税部分参与累计预扣个税计算；不计税部分仅计入到手收入。</p>
        </div>

        {/* City */}
        <div className="mt-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">所在城市</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="input">
            {cities.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Housing fund slider */}
        <div className="mb-4">
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
            <span>住房公积金比例</span>
            <span className="text-emerald-600 font-semibold">{Math.round(housingRate * 100)}%</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="0.12"
            step="0.01"
            value={housingRate}
            onChange={(e) => setHousingRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5%</span>
            <span>12%</span>
          </div>
        </div>

        {/* Special deductions */}
        <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-emerald-600 hover:underline mb-2">
          {showAdvanced ? '收起' : '展开'}专项附加扣除（可选）
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">勾选你符合的扣除项目：</p>
            <div className="grid grid-cols-2 gap-2">
              {deductionOptions.map(opt => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDeductions.includes(opt.key)}
                    onChange={() => toggleDeduction(opt.key)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm">{opt.label}（{opt.amount}/月）</span>
                </label>
              ))}
            </div>
            {specialDeduction > 0 && (
              <p className="text-sm text-emerald-600 mt-3">专项附加扣除合计：¥{specialDeduction.toLocaleString()}/月</p>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Annual summary */}
          <div className="dashboard-panel p-5 md:p-7 overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="eyebrow mb-1">Annual overview</p>
                <h3 className="text-xl font-bold text-slate-950">年度汇总</h3>
              </div>
              <span className="text-xs text-slate-500">12 个月累计</span>
            </div>
            <div className="bg-slate-950 p-5 md:p-7 rounded-xl text-white border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex-1 text-left sm:text-center min-w-0">
                  <p className="text-slate-400 mb-1">年到手收入</p>
                  <p className="text-3xl sm:text-4xl font-bold text-emerald-400 tabular-nums">¥{formatMoney(result.annual.net)}</p>
                  <p className="text-sm text-slate-400 mt-2">
                    年总收入 ¥{formatMoney(result.annual.gross)} · 个税 ¥{formatMoney(result.annual.tax)}
                  </p>
                </div>
                <div className="flex-shrink-0 self-center">
                  <DonutChart netPay={result.annual.net} insurance={result.annual.insurance} tax={result.annual.tax} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
              <SummaryItem label="年基本工资" value={result.annual.baseSalary} />
              <SummaryItem label="年五险一金" value={result.annual.insurance} negative />
              <SummaryItem label="年个税" value={result.annual.tax} negative />
              <SummaryItem label="计税额外收入" value={result.annual.taxableExtraIncome} />
              <SummaryItem label="不计税额外收入" value={result.annual.nonTaxableExtraIncome} />
            </div>
          </div>

          {/* 12 month cards */}
          <div className="dashboard-panel p-5 md:p-7">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
              <div>
                <p className="eyebrow mb-1">Monthly cash flow</p>
                <h3 className="text-xl font-bold text-slate-950">12 个月收入明细</h3>
              </div>
              <p className="text-xs text-slate-500">点击卡片切换编辑月份</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {result.annual.monthlyResults.map(monthData => {
                const month = monthData.month
                const isSelected = selectedMonth === month
                return (
                  <button
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    aria-pressed={isSelected}
                    aria-label={`查看并编辑 ${month} 月收入`}
                    className={`text-left min-h-[188px] rounded-xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950 text-white shadow-lg shadow-emerald-950/20'
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-300' : 'text-slate-600'}`}>{month} 月</span>
                      {isSelected && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950 font-semibold">当前</span>}
                    </div>
                    <p className={`text-2xl font-bold mb-3 tabular-nums ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>¥{formatMoney(monthData.netPay)}</p>
                    <div className={`space-y-1 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      <div className="flex justify-between">
                        <span>总收入</span>
                        <span>¥{formatMoney(monthData.gross)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>五险一金</span>
                        <span className="text-red-500">-¥{formatMoney(monthData.insurance.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>个税</span>
                        <span className="text-red-500">-¥{formatMoney(monthData.tax)}</span>
                      </div>
                      {(monthData.taxableExtraIncome > 0 || monthData.nonTaxableExtraIncome > 0) && (
                        <div className={`pt-2 mt-2 border-t space-y-1 ${isSelected ? 'border-white/10' : 'border-slate-200'}`}>
                          {monthData.taxableExtraIncome > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>计税额外</span>
                              <span>+¥{formatMoney(monthData.taxableExtraIncome)}</span>
                            </div>
                          )}
                          {monthData.nonTaxableExtraIncome > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>不计税额外</span>
                              <span>+¥{formatMoney(monthData.nonTaxableExtraIncome)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-4">点击卡片可切换到对应月份，编辑该月额外收入。</p>
          </div>

          {/* Current month detail */}
          <div className="dashboard-panel p-5 md:p-7">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="eyebrow mb-1">Selected month</p>
                <h3 className="text-xl font-bold text-slate-950">{result.monthly.month} 月完整明细</h3>
              </div>
              <span className="text-sm font-semibold text-emerald-600">到手 ¥{formatMoney(result.monthly.netPay)}</span>
            </div>
            <div className="space-y-3">
              <DetailRow label="基础税前月薪" value={result.monthly.baseSalary} />
              {result.monthly.taxableExtraIncome > 0 && (
                <DetailRow label="计税额外收入" value={result.monthly.taxableExtraIncome} />
              )}
              {result.monthly.nonTaxableExtraIncome > 0 && (
                <DetailRow label="不计税额外收入" value={result.monthly.nonTaxableExtraIncome} />
              )}
              <DetailRow label="当月总收入" value={result.monthly.gross} bold />
              <DetailRow label={`养老保险（${result.monthly.insurance.rates.pension * 100}%）`} value={result.monthly.insurance.pension} negative />
              <DetailRow label={`医疗保险（${result.monthly.insurance.rates.medical * 100}%）`} value={result.monthly.insurance.medical} negative />
              <DetailRow label={`失业保险（${result.monthly.insurance.rates.unemployment * 100}%）`} value={result.monthly.insurance.unemployment} negative />
              <DetailRow label={`住房公积金（${Math.round(result.monthly.insurance.rates.housing * 100)}%）`} value={result.monthly.insurance.housing} negative />
              <DetailRow label="五险一金合计" value={result.monthly.insurance.total} negative bold />
              <DetailRow label="个人所得税" value={result.monthly.tax} negative bold />
              <div className="flex justify-between py-2 font-semibold text-lg border-t-2 border-gray-200 mt-2 pt-3">
                <span className="text-emerald-600">到手月薪</span>
                <span className="text-emerald-600 tabular-nums">¥{formatMoney(result.monthly.netPay)}</span>
              </div>
            </div>
          </div>

          {/* Tax note */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <strong>累计预扣法：</strong>年度实际个税 ¥{formatMoney(result.annual.tax)}，
            已按照 12 个月分别填写的计税额外收入逐月计算。
          </div>

          {onSave && (
            <button onClick={handleSave} className="btn-secondary w-full">
              保存此次计算
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryItem({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-semibold ${negative ? 'text-red-500' : 'text-gray-800'}`}>
        {negative ? '-' : ''}¥{formatMoney(value)}
      </p>
    </div>
  )
}

function DetailRow({ label, value, negative = false, bold = false }: { label: string; value: number; negative?: boolean; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-2 border-b border-gray-100 ${bold ? 'font-medium' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={negative ? 'text-red-500' : 'font-medium'}>
        {negative ? '-' : ''}¥{formatMoney(value)}
      </span>
    </div>
  )
}

function DonutChart({ netPay, insurance, tax }: { netPay: number; insurance: number; tax: number }) {
  const total = netPay + insurance + tax
  if (total <= 0) return null

  const pctNet = netPay / total
  const pctIns = insurance / total

  const r = 40
  const cx = 50
  const cy = 50
  const circumference = 2 * Math.PI * r

  const len1 = circumference * pctNet
  const len2 = circumference * pctIns
  const len3 = circumference - len1 - len2

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="drop-shadow-sm">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="14"
        strokeDasharray={`${len1} ${circumference - len1}`} strokeDashoffset={0} transform="rotate(-90 50 50)" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth="14"
        strokeDasharray={`${len2} ${circumference - len2}`} strokeDashoffset={-len1} transform="rotate(-90 50 50)" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="14"
        strokeDasharray={`${len3} ${circumference - len3}`} strokeDashoffset={-(len1 + len2)} transform="rotate(-90 50 50)" />
      <text x={cx} y={cy - 4} textAnchor="middle" className="text-[10px] fill-slate-400">到手</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="text-[13px] font-bold fill-white">
        {Math.round(pctNet * 100)}%
      </text>
    </svg>
  )
}
