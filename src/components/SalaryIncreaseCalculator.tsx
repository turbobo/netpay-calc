import { useState, useMemo } from 'react'
import { calculateNetPay, getCityList, formatMoney } from '../utils/calculator'

interface SalaryIncreaseCalculatorProps {
  onClose: () => void
}

// Default insurance rates (personal portion, in percentage)
const DEFAULT_RATES = {
  pension: 8,
  medical: 2,
  unemployment: 0.5,
  housing: 12,
}

interface JobConfig {
  city: string
  salary: string
  bonus: string
  pensionRate: number
  medicalRate: number
  unemploymentRate: number
  housingRate: number
}

const createDefaultJobConfig = (city = 'beijing', housingRate = 12): JobConfig => ({
  city,
  salary: '',
  bonus: '',
  pensionRate: DEFAULT_RATES.pension,
  medicalRate: DEFAULT_RATES.medical,
  unemploymentRate: DEFAULT_RATES.unemployment,
  housingRate,
})

export default function SalaryIncreaseCalculator({ onClose }: SalaryIncreaseCalculatorProps) {
  const cities = useMemo(() => getCityList(), [])

  // Previous job config
  const [prevJob, setPrevJob] = useState<JobConfig>(createDefaultJobConfig('beijing', 12))

  // Current job config
  const [currJob, setCurrJob] = useState<JobConfig>(createDefaultJobConfig('beijing', 12))

  // Calculate result for a job config
  const calcJob = (job: JobConfig) => {
    const salary = parseFloat(job.salary)
    const bonus = parseFloat(job.bonus) || 0
    if (isNaN(salary) || salary <= 0) return null

    const monthlyExtraIncomes = Array(12).fill({ taxable: 0, nonTaxable: 0 })
    monthlyExtraIncomes[11] = { taxable: bonus, nonTaxable: 0 }

    return calculateNetPay({
      salary,
      city: job.city,
      monthlyExtraIncomes,
      specialDeduction: 0,
      customRates: {
        pension: job.pensionRate / 100,
        medical: job.medicalRate / 100,
        unemployment: job.unemploymentRate / 100,
        housing: job.housingRate / 100,
      },
    })
  }

  const prevResult = useMemo(() => calcJob(prevJob), [prevJob])
  const currResult = useMemo(() => calcJob(currJob), [currJob])

  const comparison = useMemo(() => {
    if (!prevResult || !currResult) return null

    const prevGross = prevResult.annual.gross
    const currGross = currResult.annual.gross
    const grossDiff = currGross - prevGross
    const grossPct = prevGross > 0 ? (grossDiff / prevGross) * 100 : 0

    const prevNet = prevResult.annual.net
    const currNet = currResult.annual.net
    const netDiff = currNet - prevNet
    const netPct = prevNet > 0 ? (netDiff / prevNet) * 100 : 0

    return {
      grossDiff,
      grossPct,
      netDiff,
      netPct,
      prevGross,
      currGross,
      prevNet,
      currNet,
      prevInsurance: prevResult.annual.insurance,
      currInsurance: currResult.annual.insurance,
    }
  }, [prevResult, currResult])

  // City housing rate map
  const cityHousingRates: Record<string, number> = {
    beijing: 12, shanghai: 7, guangzhou: 12, shenzhen: 5,
    hangzhou: 12, chengdu: 12, nanjing: 12, wuhan: 12,
  }

  const handleCityChange = (setter: (j: JobConfig) => void, current: JobConfig, newCity: string) => {
    setter({ ...current, city: newCity, housingRate: cityHousingRates[newCity] || 7 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">涨薪计算器</h2>
            <p className="text-sm text-slate-500">分别配置前后两份工作的薪资与社保公积金，对比涨薪幅度</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          {/* Two job config panels — inlined to avoid re-mount on every render */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Previous job */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-800">上一份工作</h3>
                <p className="text-xs text-slate-500">旧公司的薪资与缴费配置</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">税前月薪</label>
                  <input type="number" value={prevJob.salary} onChange={(e) => setPrevJob({ ...prevJob, salary: e.target.value })} placeholder="如 15000" className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">年终奖</label>
                  <input type="number" value={prevJob.bonus} onChange={(e) => setPrevJob({ ...prevJob, bonus: e.target.value })} placeholder="如 30000" className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">参保城市</label>
                <select value={prevJob.city} onChange={(e) => handleCityChange(setPrevJob, prevJob, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
                  {cities.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">养老</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="20" step="0.5" value={prevJob.pensionRate} onChange={(e) => setPrevJob({ ...prevJob, pensionRate: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">医疗</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="10" step="0.5" value={prevJob.medicalRate} onChange={(e) => setPrevJob({ ...prevJob, medicalRate: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">失业</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="2" step="0.1" value={prevJob.unemploymentRate} onChange={(e) => setPrevJob({ ...prevJob, unemploymentRate: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">公积金</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="24" step="1" value={prevJob.housingRate} onChange={(e) => setPrevJob({ ...prevJob, housingRate: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current job */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-800">当前工作</h3>
                <p className="text-xs text-slate-500">新公司的薪资与缴费配置</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">税前月薪</label>
                  <input type="number" value={currJob.salary} onChange={(e) => setCurrJob({ ...currJob, salary: e.target.value })} placeholder="如 15000" className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">年终奖</label>
                  <input type="number" value={currJob.bonus} onChange={(e) => setCurrJob({ ...currJob, bonus: e.target.value })} placeholder="如 30000" className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">参保城市</label>
                <select value={currJob.city} onChange={(e) => handleCityChange(setCurrJob, currJob, e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
                  {cities.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">养老</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="20" step="0.5" value={currJob.pensionRate} onChange={(e) => setCurrJob({ ...currJob, pensionRate: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">医疗</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="10" step="0.5" value={currJob.medicalRate} onChange={(e) => setCurrJob({ ...currJob, medicalRate: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">失业</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="2" step="0.1" value={currJob.unemploymentRate} onChange={(e) => setCurrJob({ ...currJob, unemploymentRate: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">公积金</label>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="24" step="1" value={currJob.housingRate} onChange={(e) => setCurrJob({ ...currJob, housingRate: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Results */}
          {comparison ? (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                  <p className="text-sm text-emerald-700 mb-1 font-medium">年度总包涨幅</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${comparison.grossPct >= 0 ? 'text-emerald-900' : 'text-red-600'}`}>
                      {comparison.grossPct >= 0 ? '+' : ''}{comparison.grossPct.toFixed(1)}%
                    </span>
                    <span className={`text-sm ${comparison.grossDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {comparison.grossDiff >= 0 ? '¥' : '-¥'}{formatMoney(Math.abs(comparison.grossDiff))}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                  <p className="text-sm text-blue-700 mb-1 font-medium">年到手涨幅</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${comparison.netPct >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                      {comparison.netPct >= 0 ? '+' : ''}{comparison.netPct.toFixed(1)}%
                    </span>
                    <span className={`text-sm ${comparison.netDiff >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {comparison.netDiff >= 0 ? '¥' : '-¥'}{formatMoney(Math.abs(comparison.netDiff))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Comparison Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-500">对比项</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-500">上一份工作</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-500">当前工作</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-500">涨幅</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-4 text-slate-600 font-medium">年度总包 (Gross)</td>
                      <td className="px-4 py-4 text-right text-slate-900 tabular-nums">¥{formatMoney(comparison.prevGross)}</td>
                      <td className="px-4 py-4 text-right text-emerald-600 font-bold tabular-nums">¥{formatMoney(comparison.currGross)}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <span className={comparison.grossPct >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {comparison.grossPct >= 0 ? '+' : ''}{comparison.grossPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-4 text-slate-600 font-medium">年度五险一金</td>
                      <td className="px-4 py-4 text-right text-red-500 tabular-nums">-¥{formatMoney(comparison.prevInsurance)}</td>
                      <td className="px-4 py-4 text-right text-red-500 tabular-nums">-¥{formatMoney(comparison.currInsurance)}</td>
                      <td className="px-4 py-4 text-right text-slate-400 tabular-nums">—</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-4 text-slate-600 font-medium">年度到手 (Net)</td>
                      <td className="px-4 py-4 text-right text-slate-900 tabular-nums">¥{formatMoney(comparison.prevNet)}</td>
                      <td className="px-4 py-4 text-right text-emerald-600 font-bold tabular-nums">¥{formatMoney(comparison.currNet)}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <span className={comparison.netPct >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {comparison.netPct >= 0 ? '+' : ''}{comparison.netPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-4 text-slate-600 font-medium italic">平均月度到手</td>
                      <td className="px-4 py-4 text-right text-slate-500 tabular-nums">¥{formatMoney(comparison.prevNet / 12)}</td>
                      <td className="px-4 py-4 text-right text-emerald-500 tabular-nums">¥{formatMoney(comparison.currNet / 12)}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <span className={comparison.netPct >= 0 ? 'text-emerald-500' : 'text-red-400'}>
                          {comparison.netPct >= 0 ? '+' : ''}{comparison.netPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
              <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400">请分别填写两份工作的月薪，系统将自动计算涨薪幅度</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition shadow-lg shadow-slate-950/20"
          >
            返回计算器
          </button>
        </div>
      </div>
    </div>
  )
}
