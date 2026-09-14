import { useState, useEffect, useMemo, useCallback } from 'react'
import { calculateNetPay, getCityList, getDeductionOptions, getCityHousingRate, formatMoney, POLICY_DATA_YEAR } from '../utils/calculator'
import type { CalcResult, BonusTaxMode } from '../utils/calculator'
import SalaryIncreaseCalculator from './SalaryIncreaseCalculator'
import FormattedInput from './FormattedInput'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)

// 比例输入钳制：非法值回退到下限，超出范围自动收敛
function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

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
  const [housingPercent, setHousingPercent] = useState(12)
  const [pensionRate, setPensionRate] = useState(8)
  const [medicalRate, setMedicalRate] = useState(2)
  const [unemploymentRate, setUnemploymentRate] = useState(0.5)
  const [showInsuranceSettings, setShowInsuranceSettings] = useState(false)
  const [socialBase, setSocialBase] = useState('')
  const [housingBase, setHousingBase] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [activeTab, setActiveTab] = useState<'income' | 'insurance' | 'bonus'>('income')
  const [showInsuranceHelp, setShowInsuranceHelp] = useState(false)
  const [specialDeduction, setSpecialDeduction] = useState(0)
  const [otherDeduction, setOtherDeduction] = useState(0)
  const [selectedDeductions, setSelectedDeductions] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1)
  const [monthlyExtraIncomes, setMonthlyExtraIncomes] = useState(createEmptyMonthlyExtraIncomes)
  const [yearEndBonus, setYearEndBonus] = useState('')
  const [bonusTaxMode, setBonusTaxMode] = useState<BonusTaxMode>('combined')
  const [result, setResult] = useState<CalcResult | null>(null)

  const cities = useMemo(() => getCityList(), [])
  const deductionOptions = useMemo(() => getDeductionOptions(), [])

  // Sync housing rate when city changes（单一数据源：calculator.ts 的 CITY_LIMITS）
  useEffect(() => {
    setHousingPercent(Math.round(getCityHousingRate(city) * 100))
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
      otherDeduction,
      customRates: {
        pension: pensionRate / 100,
        medical: medicalRate / 100,
        unemployment: unemploymentRate / 100,
        housing: housingPercent / 100,
      },
      monthlyExtraIncomes,
      selectedMonth,
      yearEndBonus: Math.max(0, parseFloat(yearEndBonus) || 0),
      bonusTaxMode,
      socialBase: parseFloat(socialBase) || undefined,
      housingBase: parseFloat(housingBase) || undefined,
    })
    setResult(calcResult)
  }, [salary, salaryMode, city, specialDeduction, otherDeduction, housingPercent, pensionRate, medicalRate, unemploymentRate, monthlyExtraIncomes, selectedMonth, yearEndBonus, bonusTaxMode, socialBase, housingBase])

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
      {/* Input area with tabs */}
      <div className="dashboard-panel mb-6">
        {/* Panel header */}
        <div className="px-5 md:px-7 pt-5 md:pt-7 pb-4 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-5">
            <div>
              <p className="eyebrow mb-2">收入设置</p>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-950">收入与扣除设置</h2>
            </div>
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              涨薪对比
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 -mb-px" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'income'}
              onClick={() => setActiveTab('income')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition ${
                activeTab === 'income'
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                收入
              </span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'insurance'}
              onClick={() => setActiveTab('insurance')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition ${
                activeTab === 'insurance'
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                五险一金
              </span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'bonus'}
              onClick={() => setActiveTab('bonus')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition ${
                activeTab === 'bonus'
                  ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                </svg>
                年终奖与扣除
              </span>
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5 md:p-7">
          {/* Tab: Income */}
          {activeTab === 'income' && (
            <div className="space-y-5">
              {/* Salary mode toggle */}
              <div className="flex items-center gap-2">
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
              <FormattedInput
                value={salary}
                onChange={setSalary}
                prefix="¥"
                placeholder={salaryMode === 'monthly' ? '如 15,000' : '如 300,000'}
                className="input text-lg font-semibold"
              />

              {/* Monthly extra income */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 md:p-5">
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
                    <FormattedInput
                      id="taxable-extra-income"
                      value={selectedExtraIncome.taxable}
                      onChange={(v) => updateMonthlyExtraIncome('taxable', v)}
                      prefix="¥"
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
                    <FormattedInput
                      id="non-taxable-extra-income"
                      value={selectedExtraIncome.nonTaxable}
                      onChange={(v) => updateMonthlyExtraIncome('nonTaxable', v)}
                      prefix="¥"
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

              <p className="text-xs text-slate-400">💡 修改任意字段后自动重新计算，无需手动提交。</p>
            </div>
          )}

          {/* Tab: Insurance */}
          {activeTab === 'insurance' && (
            <div className="space-y-5">
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所在城市</label>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="input">
                  {cities.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">切换城市会自动更新公积金默认比例和社保基数上下限。</p>
              </div>

              {/* Insurance rates */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:p-5">
                <h3 className="text-sm font-medium text-slate-700 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  个人缴纳比例
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">养老保险</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={pensionRate}
                        onChange={(e) => setPensionRate(clampNumber(parseFloat(e.target.value), 0, 20))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums"
                      />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">医疗保险</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={medicalRate}
                        onChange={(e) => setMedicalRate(clampNumber(parseFloat(e.target.value), 0, 10))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums"
                      />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">失业保险</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={unemploymentRate}
                        onChange={(e) => setUnemploymentRate(clampNumber(parseFloat(e.target.value), 0, 2))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums"
                      />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">住房公积金</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="1"
                        value={housingPercent}
                        onChange={(e) => setHousingPercent(clampNumber(parseFloat(e.target.value), 0, 24))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums"
                      />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social/housing base */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:p-5 space-y-3">
                <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  缴费基数（可选）
                </h3>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-500 whitespace-nowrap w-36">社保基数（元/月）</label>
                  <FormattedInput
                    value={socialBase}
                    onChange={setSocialBase}
                    prefix="¥"
                    placeholder="自动计算"
                    className="w-full max-w-52 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-500 whitespace-nowrap w-36">公积金基数（元/月）</label>
                  <FormattedInput
                    value={housingBase}
                    onChange={setHousingBase}
                    prefix="¥"
                    placeholder="自动计算"
                    className="w-full max-w-52 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400">留空则按城市上下限自动计算，手动输入后生效全部 12 个月。</p>
                <button
                  onClick={() => setShowInsuranceHelp(!showInsuranceHelp)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline mt-2 flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {showInsuranceHelp ? '收起说明' : '了解更多'}
                </button>
                {showInsuranceHelp && (
                  <div className="mt-3 p-3 bg-slate-100 rounded-lg text-xs text-slate-600 leading-relaxed">
                    <p className="mb-2">
                      <strong>个人缴纳比例说明：</strong>以上比例为个人承担部分，切换城市会自动更新公积金默认比例，其他比例可手动调整。
                    </p>
                    <p className="mb-2">
                      <strong>范围限制：</strong>养老 0-20%、医疗 0-10%、失业 0-2%、公积金 0-24%，超出范围的值会自动收敛。
                    </p>
                    <p>
                      <strong>缴费基数：</strong>社保与公积金基数可分开设置，留空则按城市上下限自动计算，手动输入后生效全部 12 个月。
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Bonus & Deductions */}
          {activeTab === 'bonus' && (
            <div className="space-y-5">
              {/* Year-end bonus */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 md:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">年终奖（全年一次性）</h3>
                    <p className="text-xs text-gray-500 mt-0.5">默认发放于 12 月，可选择计税口径</p>
                  </div>
                  <div className="sm:w-52">
                    <FormattedInput
                      value={yearEndBonus}
                      onChange={setYearEndBonus}
                      prefix="¥"
                      placeholder="如 36,000"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="年终奖计税口径">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={bonusTaxMode === 'combined'}
                    onClick={() => setBonusTaxMode('combined')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      bonusTaxMode === 'combined'
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    并入综合所得
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={bonusTaxMode === 'separate'}
                    onClick={() => setBonusTaxMode('separate')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      bonusTaxMode === 'separate'
                        ? 'border-emerald-500 bg-emerald-600 text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    单独计税
                  </button>
                  <span className="text-xs text-gray-500">
                    {bonusTaxMode === 'combined'
                      ? '并入 12 月综合所得，随累计预扣法计税'
                      : '年终奖 ÷ 12 查月度税率表独立计税'}
                  </span>
                </div>
              </div>

              {/* Special deductions */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    专项附加扣除（可选）
                  </h3>
                  {specialDeduction > 0 && (
                    <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      合计 ¥{specialDeduction.toLocaleString()}/月
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">勾选你符合的扣除项目，每月可减免相应应税收入：</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deductionOptions.map(opt => {
                    const isSelected = selectedDeductions.includes(opt.key)
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-center justify-between cursor-pointer p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDeduction(opt.key)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
                              {opt.label}
                            </span>
                            {'description' in opt && opt.description && (
                              <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                {opt.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold tabular-nums ${
                          isSelected ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          ¥{opt.amount}/月
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Other deductions (其他扣除) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 md:p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                    其他扣除（可选）
                  </h3>
                  {otherDeduction > 0 && (
                    <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      ¥{otherDeduction.toLocaleString()}/月
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">补充医疗保险、企业年金、商业健康险等税前扣除项：</p>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={otherDeduction || ''}
                  onChange={(e) => setOtherDeduction(parseFloat(e.target.value) || 0)}
                  placeholder="如 300"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Annual summary */}
          <div className="dashboard-panel p-5 md:p-7 overflow-hidden">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="eyebrow mb-1">年度汇总</p>
                <h3 className="text-xl font-bold text-slate-950">年度汇总</h3>
              </div>
              <span className="text-xs text-slate-500">12 个月累计</span>
            </div>
            <div className="bg-slate-950 p-5 md:p-7 rounded-xl text-white border border-slate-800">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 mb-1">年到手收入</p>
                  <p className="text-3xl sm:text-4xl font-bold text-emerald-400 tabular-nums">¥{formatMoney(result.annual.net)}</p>
                  <p className="text-sm text-slate-400 mt-2">
                    年总收入 ¥{formatMoney(result.annual.gross)} · 总扣除 ¥{formatMoney(result.annual.insurance + result.annual.tax)}
                  </p>
                  
                  {/* Key metrics */}
                  <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-800">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">月均到手</p>
                      <p className="text-lg font-semibold text-white tabular-nums">¥{formatMoney(result.annual.net / 12)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">到手比例</p>
                      <p className="text-lg font-semibold text-emerald-400 tabular-nums">
                        {result.annual.gross > 0 ? Math.round((result.annual.net / result.annual.gross) * 100) : 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">总扣除比例</p>
                      <p className="text-lg font-semibold text-red-400 tabular-nums">
                        {result.annual.gross > 0 ? Math.round(((result.annual.insurance + result.annual.tax) / result.annual.gross) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 self-center lg:self-auto">
                  <DonutChart netPay={result.annual.net} insurance={result.annual.insurance} tax={result.annual.tax} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
              <SummaryItem label="年基本工资" value={result.annual.baseSalary} />
              {result.annual.yearEndBonus > 0 && (
                <SummaryItem label="年终奖" value={result.annual.yearEndBonus} />
              )}
              <SummaryItem label="年五险一金" value={result.annual.insurance} negative />
              <SummaryItem label="年个税" value={result.annual.tax} negative />
              {result.annual.bonusTax > 0 && (
                <SummaryItem label="年终奖个税（单独计税）" value={result.annual.bonusTax} negative />
              )}
              <SummaryItem label="计税额外收入" value={result.annual.taxableExtraIncome} />
              <SummaryItem label="不计税额外收入" value={result.annual.nonTaxableExtraIncome} />
            </div>
          </div>

          {/* 12 month compact view */}
          <div className="dashboard-panel p-5 md:p-7">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5">
              <div>
                <p className="eyebrow mb-1">月度明细</p>
                <h3 className="text-xl font-bold text-slate-950">12 个月收入明细</h3>
              </div>
              <p className="text-xs text-slate-500">点击行查看详情并编辑该月额外收入</p>
            </div>

            {/* Compact table view */}
            <div className="overflow-x-auto -mx-5 md:-mx-7 px-5 md:px-7">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-3 font-medium text-slate-500 w-16">月份</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">到手收入</th>
                    <th className="pb-3 font-medium text-slate-500 text-right hidden sm:table-cell">总收入</th>
                    <th className="pb-3 font-medium text-slate-500 text-right hidden md:table-cell">五险一金</th>
                    <th className="pb-3 font-medium text-slate-500 text-right hidden md:table-cell">个税</th>
                    <th className="pb-3 font-medium text-slate-500 text-right hidden lg:table-cell">额外收入</th>
                  </tr>
                </thead>
                <tbody>
                  {result.annual.monthlyResults.map(monthData => {
                    const month = monthData.month
                    const isSelected = selectedMonth === month
                    const extraTotal = monthData.taxableExtraIncome + monthData.nonTaxableExtraIncome + monthData.yearEndBonus
                    return (
                      <tr
                        key={month}
                        onClick={() => setSelectedMonth(month)}
                        className={`border-b border-slate-100 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-emerald-50 hover:bg-emerald-100'
                            : 'hover:bg-slate-50 hover:scale-[1.01] hover:shadow-md'
                        }`}
                      >
                        <td className="py-3 font-medium">
                          <span className={isSelected ? 'text-emerald-700' : 'text-slate-700'}>
                            {month} 月
                          </span>
                          {isSelected && (
                            <span className="ml-2 inline-flex text-xs px-1.5 py-0.5 rounded bg-emerald-500 text-white font-medium whitespace-nowrap">
                              编辑中
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right font-semibold tabular-nums text-emerald-600">
                          ¥{formatMoney(monthData.netPay)}
                        </td>
                        <td className="py-3 text-right tabular-nums text-slate-600 hidden sm:table-cell">
                          ¥{formatMoney(monthData.gross)}
                        </td>
                        <td className="py-3 text-right tabular-nums text-red-500 hidden md:table-cell">
                          -¥{formatMoney(monthData.insurance.total)}
                        </td>
                        <td className="py-3 text-right tabular-nums text-red-500 hidden md:table-cell">
                          -¥{formatMoney(monthData.tax)}
                        </td>
                        <td className="py-3 text-right tabular-nums hidden lg:table-cell">
                          {extraTotal > 0 ? (
                            <span className="text-emerald-600">+¥{formatMoney(extraTotal)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500 mt-4">💡 点击任意月份可切换到该月，在下方编辑额外收入。</p>
          </div>

          {/* Current month detail */}
          <div className="dashboard-panel p-5 md:p-7">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="eyebrow mb-1">当前月份</p>
                <h3 className="text-xl font-bold text-slate-950">{result.monthly.month} 月完整明细</h3>
              </div>
              <span className="text-sm font-semibold text-emerald-600">到手 ¥{formatMoney(result.monthly.netPay)}</span>
            </div>
            <div className="space-y-3">
              <DetailRow label="基础税前月薪" value={result.monthly.baseSalary} />
              {result.monthly.yearEndBonus > 0 && (
                <DetailRow label="年终奖（全年一次性）" value={result.monthly.yearEndBonus} />
              )}
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
              <DetailRow label="个人所得税" value={result.monthly.tax - result.monthly.bonusTax} negative bold />
              {result.monthly.bonusTax > 0 && (
                <DetailRow label="年终奖个税（单独计税）" value={result.monthly.bonusTax} negative bold />
              )}
              <div className="flex justify-between py-2 font-semibold text-lg border-t-2 border-gray-200 mt-2 pt-3">
                <span className="text-emerald-600">到手月薪</span>
                <span className="text-emerald-600 tabular-nums">¥{formatMoney(result.monthly.netPay)}</span>
              </div>
            </div>
          </div>

          {/* Tax note */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <strong>累计预扣法：</strong>年度实际个税 ¥{formatMoney(result.annual.tax)}
            {result.annual.bonusTax > 0 && <>（含年终奖单独计税 ¥{formatMoney(result.annual.bonusTax)}）</>}，
            已按照 12 个月分别填写的计税额外收入逐月计算。
            <p className="text-xs text-amber-700 mt-1.5">
              政策数据适用年度：{POLICY_DATA_YEAR}（个税税率表、社保公积金基数上下限、专项附加扣除标准均按该年度政策整理）。请留意年度政策调整，实际以最新政策与发放口径为准。
            </p>
          </div>

          {onSave && (
            <button onClick={handleSave} className="btn-secondary w-full">
              保存此次计算
            </button>
          )}
        </div>
      )}

      {showComparison && (
        <SalaryIncreaseCalculator
          onClose={() => setShowComparison(false)}
        />
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

  const r = 55
  const cx = 70
  const cy = 70
  const circumference = 2 * Math.PI * r

  const len1 = circumference * pctNet
  const len2 = circumference * pctIns
  const len3 = circumference - len1 - len2

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-lg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="18"
        strokeDasharray={`${len1} ${circumference - len1}`} strokeDashoffset={0} transform="rotate(-90 70 70)" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth="18"
        strokeDasharray={`${len2} ${circumference - len2}`} strokeDashoffset={-len1} transform="rotate(-90 70 70)" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="18"
        strokeDasharray={`${len3} ${circumference - len3}`} strokeDashoffset={-(len1 + len2)} transform="rotate(-90 70 70)" />
      <text x={cx} y={cy - 6} textAnchor="middle" className="text-[11px] fill-slate-300 font-medium">到手</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="text-[18px] font-bold fill-white">
        {Math.round(pctNet * 100)}%
      </text>
    </svg>
  )
}
