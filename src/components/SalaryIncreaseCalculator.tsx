import { useState, useMemo } from 'react'
import { formatMoney } from '../utils/calculator'

interface SalaryIncreaseCalculatorProps {
  onClose: () => void
}

interface JobConfig {
  salary: string
  bonus: string
}

interface JobResult {
  monthlySalary: number
  bonus: number
  annualPackage: number
  averageMonthly: number
}

const createDefaultJobConfig = (): JobConfig => ({
  salary: '',
  bonus: '',
})

// 仅按税前口径计算：年度总包 = 月薪 × 12 + 年终奖
const calcJob = (job: JobConfig): JobResult | null => {
  const salary = parseFloat(job.salary)
  if (isNaN(salary) || salary <= 0) return null

  const bonus = Math.max(0, parseFloat(job.bonus) || 0)
  const annualPackage = salary * 12 + bonus

  return {
    monthlySalary: salary,
    bonus,
    annualPackage,
    averageMonthly: annualPackage / 12,
  }
}

function pctText(diff: number, pct: number | null): string {
  if (pct === null) return '—'
  return `${diff >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}

function pctClass(diff: number, pct: number | null): string {
  if (pct === null) return 'text-slate-400'
  return diff >= 0 ? 'text-emerald-600' : 'text-red-500'
}

interface JobConfigPanelProps {
  title: string
  description: string
  accent: 'slate' | 'emerald'
  job: JobConfig
  onChange: (job: JobConfig) => void
}

function JobConfigPanel({ title, description, accent, job, onChange }: JobConfigPanelProps) {
  const panelClass = accent === 'emerald'
    ? 'border-emerald-200 bg-emerald-50/30'
    : 'border-slate-200 bg-slate-50/30'

  return (
    <div className={`rounded-xl border ${panelClass} p-5 space-y-4`}>
      <div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">税前月薪</label>
          <input type="number" min="0" value={job.salary} onChange={(e) => onChange({ ...job, salary: e.target.value })} placeholder="如 15000" className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">年终奖</label>
          <input type="number" min="0" value={job.bonus} onChange={(e) => onChange({ ...job, bonus: e.target.value })} placeholder="如 30000" className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none tabular-nums" />
        </div>
      </div>
    </div>
  )
}

export default function SalaryIncreaseCalculator({ onClose }: SalaryIncreaseCalculatorProps) {
  const [prevJob, setPrevJob] = useState<JobConfig>(createDefaultJobConfig)
  const [currJob, setCurrJob] = useState<JobConfig>(createDefaultJobConfig)

  const prevResult = useMemo(() => calcJob(prevJob), [prevJob])
  const currResult = useMemo(() => calcJob(currJob), [currJob])

  const comparison = useMemo(() => {
    if (!prevResult || !currResult) return null

    const packageDiff = currResult.annualPackage - prevResult.annualPackage
    const packagePct = prevResult.annualPackage > 0 ? (packageDiff / prevResult.annualPackage) * 100 : 0

    const salaryDiff = currResult.monthlySalary - prevResult.monthlySalary
    const salaryPct = prevResult.monthlySalary > 0 ? (salaryDiff / prevResult.monthlySalary) * 100 : 0

    const bonusDiff = currResult.bonus - prevResult.bonus
    const bonusPct = prevResult.bonus > 0 ? (bonusDiff / prevResult.bonus) * 100 : null

    return {
      prev: prevResult,
      curr: currResult,
      packageDiff,
      packagePct,
      salaryDiff,
      salaryPct,
      bonusDiff,
      bonusPct,
    }
  }, [prevResult, currResult])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">涨薪计算器</h2>
            <p className="text-sm text-slate-500">分别填写两份工作的税前薪资与年终奖，仅对比税前收入</p>
          </div>
          <button onClick={onClose} aria-label="关闭" className="p-2 hover:bg-slate-200 rounded-full transition">
            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <JobConfigPanel
              title="上一份工作"
              description="旧公司的税前薪资"
              accent="slate"
              job={prevJob}
              onChange={setPrevJob}
            />
            <JobConfigPanel
              title="当前工作"
              description="新公司的税前薪资"
              accent="emerald"
              job={currJob}
              onChange={setCurrJob}
            />
          </div>

          {/* Comparison Results */}
          {comparison ? (
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                  <p className="text-sm text-emerald-700 mb-1 font-medium">年度总包涨幅</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${comparison.packagePct >= 0 ? 'text-emerald-900' : 'text-red-600'}`}>
                      {comparison.packagePct >= 0 ? '+' : ''}{comparison.packagePct.toFixed(1)}%
                    </span>
                    <span className={`text-sm ${comparison.packageDiff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {comparison.packageDiff >= 0 ? '¥' : '-¥'}{formatMoney(Math.abs(comparison.packageDiff))}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                  <p className="text-sm text-blue-700 mb-1 font-medium">税前月薪涨幅</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${comparison.salaryPct >= 0 ? 'text-blue-900' : 'text-red-600'}`}>
                      {comparison.salaryPct >= 0 ? '+' : ''}{comparison.salaryPct.toFixed(1)}%
                    </span>
                    <span className={`text-sm ${comparison.salaryDiff >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {comparison.salaryDiff >= 0 ? '¥' : '-¥'}{formatMoney(Math.abs(comparison.salaryDiff))}
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
                      <td className="px-4 py-4 text-slate-600 font-medium">税前月薪</td>
                      <td className="px-4 py-4 text-right text-slate-900 tabular-nums">¥{formatMoney(comparison.prev.monthlySalary)}</td>
                      <td className="px-4 py-4 text-right text-emerald-600 font-bold tabular-nums">¥{formatMoney(comparison.curr.monthlySalary)}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <span className={pctClass(comparison.salaryDiff, comparison.salaryPct)}>
                          {pctText(comparison.salaryDiff, comparison.salaryPct)}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-4 text-slate-600 font-medium">年终奖</td>
                      <td className="px-4 py-4 text-right text-slate-900 tabular-nums">¥{formatMoney(comparison.prev.bonus)}</td>
                      <td className="px-4 py-4 text-right text-emerald-600 font-bold tabular-nums">¥{formatMoney(comparison.curr.bonus)}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <span className={pctClass(comparison.bonusDiff, comparison.bonusPct)}>
                          {pctText(comparison.bonusDiff, comparison.bonusPct)}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-4 text-slate-600 font-medium">年度总包（月薪 × 12 + 年终奖）</td>
                      <td className="px-4 py-4 text-right text-slate-900 tabular-nums">¥{formatMoney(comparison.prev.annualPackage)}</td>
                      <td className="px-4 py-4 text-right text-emerald-600 font-bold tabular-nums">¥{formatMoney(comparison.curr.annualPackage)}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <span className={pctClass(comparison.packageDiff, comparison.packagePct)}>
                          {pctText(comparison.packageDiff, comparison.packagePct)}
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-4 text-slate-600 font-medium italic">平均月税前（年度总包 ÷ 12）</td>
                      <td className="px-4 py-4 text-right text-slate-500 tabular-nums">¥{formatMoney(comparison.prev.averageMonthly)}</td>
                      <td className="px-4 py-4 text-right text-emerald-500 tabular-nums">¥{formatMoney(comparison.curr.averageMonthly)}</td>
                      <td className="px-4 py-4 text-right tabular-nums">
                        <span className={pctClass(comparison.packageDiff, comparison.packagePct)}>
                          {pctText(comparison.packageDiff, comparison.packagePct)}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400">仅按税前口径对比，不包含五险一金、个税与股权等未列项目。</p>
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
              <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-400">请分别填写两份工作的税前月薪，系统将自动对比税前收入变化</p>
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
