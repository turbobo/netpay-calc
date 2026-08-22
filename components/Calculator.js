'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { calculateNetPay, getCityList, getDeductionOptions, formatMoney } from '../lib/calculator'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1)

function createEmptyMonthlyExtraIncomes() {
  return MONTH_OPTIONS.map(() => ({ taxable: '', nonTaxable: '' }))
}

export default function Calculator({ onSave }) {
  const [salary, setSalary] = useState('')
  const [salaryMode, setSalaryMode] = useState('monthly') // 'monthly' | 'annual'
  const [city, setCity] = useState('beijing')
  const [housingRate, setHousingRate] = useState(0.12) // 公积金比例
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [specialDeduction, setSpecialDeduction] = useState(0)
  const [selectedDeductions, setSelectedDeductions] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1)
  const [monthlyExtraIncomes, setMonthlyExtraIncomes] = useState(createEmptyMonthlyExtraIncomes)
  const [result, setResult] = useState(null)

  const cities = useMemo(() => getCityList(), [])
  const deductionOptions = useMemo(() => getDeductionOptions(), [])

  // 城市变化时同步默认公积金比例
  useEffect(() => {
    const cityRates = { beijing: 0.12, shanghai: 0.07, guangzhou: 0.12, shenzhen: 0.05, hangzhou: 0.12, chengdu: 0.12, nanjing: 0.12, wuhan: 0.12 }
    setHousingRate(cityRates[city] || 0.07)
  }, [city])

  // 专项扣除合计
  useEffect(() => {
    const total = selectedDeductions.reduce((sum, key) => {
      const opt = deductionOptions.find(o => o.key === key)
      return sum + (opt ? opt.amount : 0)
    }, 0)
    setSpecialDeduction(total)
  }, [selectedDeductions, deductionOptions])

  // 实时计算
  const doCalculate = useCallback(() => {
    const raw = parseFloat(salary)
    if (isNaN(raw) || raw <= 0) { setResult(null); return }
    const monthlySalary = salaryMode === 'annual' ? raw / 12 : raw
    const result = calculateNetPay({
      salary: monthlySalary,
      city,
      specialDeduction,
      customRates: { housing: housingRate },
      monthlyExtraIncomes,
      selectedMonth,
    })
    setResult(result)
  }, [salary, salaryMode, city, specialDeduction, housingRate, monthlyExtraIncomes, selectedMonth])

  useEffect(() => { doCalculate() }, [doCalculate])

  const toggleDeduction = (key) => {
    setSelectedDeductions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const updateMonthlyExtraIncome = (field, value) => {
    setMonthlyExtraIncomes(previous => previous.map((item, index) => (
      index === selectedMonth - 1 ? { ...item, [field]: value } : item
    )))
  }

  const selectedExtraIncome = monthlyExtraIncomes[selectedMonth - 1]

  const handleSave = () => {
    if (onSave && result) onSave(result)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 输入区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        {/* 月薪 / 年薪切换 */}
        <div className="flex items-center gap-2 mb-4">
          <label className="block text-sm font-medium text-gray-700">
            {salaryMode === 'monthly' ? '税前月薪（元）' : '税前年薪（元）'}
          </label>
          <button
            onClick={() => setSalaryMode(prev => prev === 'monthly' ? 'annual' : 'monthly')}
            className="ml-auto text-xs px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition"
          >
            切换{salaryMode === 'monthly' ? '年薪' : '月薪'}模式
          </button>
        </div>
        <input
          type="number"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder={salaryMode === 'monthly' ? '如 15000' : '如 300000'}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />

        {/* 每月额外收入 */}
        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700">每月额外收入</h3>
              <p className="text-xs text-gray-500 mt-0.5">可分别记录奖金、补贴或报销等收入</p>
            </div>
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              aria-label="选择额外收入月份"
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              {MONTH_OPTIONS.map(month => (
                <option key={month} value={month}>{month} 月</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm text-gray-600 mb-1">计税额外收入（元）</span>
              <input
                type="number"
                min="0"
                step="100"
                value={selectedExtraIncome.taxable}
                onChange={(event) => updateMonthlyExtraIncome('taxable', event.target.value)}
                placeholder="如奖金、佣金"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-sm text-gray-600 mb-1">不计税额外收入（元）</span>
              <input
                type="number"
                min="0"
                step="100"
                value={selectedExtraIncome.nonTaxable}
                onChange={(event) => updateMonthlyExtraIncome('nonTaxable', event.target.value)}
                placeholder="如报销、免税补贴"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">计税部分参与累计预扣个税计算；不计税部分仅计入到手收入。</p>
        </div>

        <div className="mt-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">所在城市</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            {cities.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 公积金比例滑块 */}
        <div className="mb-4">
          <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
            <span>住房公积金比例</span>
            <span className="text-indigo-600 font-semibold">{Math.round(housingRate * 100)}%</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="0.12"
            step="0.01"
            value={housingRate}
            onChange={(e) => setHousingRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5%</span>
            <span>12%</span>
          </div>
        </div>

        {/* 专项附加扣除 */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-indigo-600 hover:underline mb-2"
        >
          {showAdvanced ? '收起' : '展开'}专项附加扣除（可选）
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-3">勾选你符合的扣除项目：</p>
            <div className="grid grid-cols-2 gap-2">
              {deductionOptions.map(opt => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDeductions.includes(opt.key)}
                    onChange={() => toggleDeduction(opt.key)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm">{opt.label}（{opt.amount}/月）</span>
                </label>
              ))}
            </div>
            {specialDeduction > 0 && (
              <p className="text-sm text-indigo-600 mt-3">专项附加扣除合计：¥{specialDeduction.toLocaleString()}/月</p>
            )}
          </div>
        )}
      </div>

      {/* 结果区域 */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">计算结果</h3>

          {/* 核心数字 + 饼图 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6">
            <div className="flex items-center gap-6">
              {/* 数字 */}
              <div className="flex-1 text-center">
                <p className="text-gray-600 mb-1">{result.monthly.month} 月税后到手收入</p>
                <p className="text-4xl font-bold text-green-600">¥{formatMoney(result.monthly.netPay)}</p>
                <p className="text-sm text-gray-500 mt-2">
                  年到手约 ¥{formatMoney(result.annual.net)}
                </p>
              </div>
              {/* 简易环形图 */}
              <div className="flex-shrink-0">
                <DonutChart
                  netPay={result.monthly.netPay}
                  insurance={result.monthly.insurance.total}
                  tax={result.monthly.tax}
                />
              </div>
            </div>
          </div>

          {/* 明细 */}
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
              <span>到手月薪</span>
              <span className="text-green-600">¥{formatMoney(result.monthly.netPay)}</span>
            </div>
          </div>

          {/* 年度个税提示 */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <strong>累计预扣法：</strong>年度实际个税 ¥{formatMoney(result.annual.tax)}，
            已按照 12 个月分别填写的计税额外收入逐月计算。
          </div>

          {onSave && (
            <button
              onClick={handleSave}
              className="w-full mt-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              保存此次计算
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// 明细行组件
function DetailRow({ label, value, negative = false, bold = false }) {
  return (
    <div className={`flex justify-between py-2 border-b border-gray-100 ${bold ? 'font-medium' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className={negative ? 'text-red-500' : 'font-medium'}>
        {negative ? '-' : ''}¥{formatMoney(value)}
      </span>
    </div>
  )
}

// 简易 SVG 环形图
function DonutChart({ netPay, insurance, tax }) {
  const total = netPay + insurance + tax
  if (total <= 0) return null

  const pctNet = netPay / total
  const pctIns = insurance / total
  // pctTax is the remainder

  const r = 40
  const cx = 50
  const cy = 50
  const circumference = 2 * Math.PI * r

  const offset1 = 0
  const len1 = circumference * pctNet
  const offset2 = len1
  const len2 = circumference * pctIns
  const offset3 = offset2 + len2
  const len3 = circumference - len1 - len2

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="drop-shadow-sm">
      {/* 到手 - 绿 */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth="14"
        strokeDasharray={`${len1} ${circumference - len1}`}
        strokeDashoffset={-offset1}
        transform="rotate(-90 50 50)" />
      {/* 五险一金 - 橙 */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth="14"
        strokeDasharray={`${len2} ${circumference - len2}`}
        strokeDashoffset={-offset2}
        transform="rotate(-90 50 50)" />
      {/* 个税 - 红 */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="14"
        strokeDasharray={`${len3} ${circumference - len3}`}
        strokeDashoffset={-offset3}
        transform="rotate(-90 50 50)" />
      {/* 中心百分比 */}
      <text x={cx} y={cy - 4} textAnchor="middle" className="text-[10px] fill-gray-500">到手</text>
      <text x={cx} y={cy + 10} textAnchor="middle" className="text-[13px] font-bold fill-gray-800">
        {Math.round(pctNet * 100)}%
      </text>
    </svg>
  )
}
