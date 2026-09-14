// 税后工资计算核心逻辑
// 基于 2024 年中国个人所得税法及五险一金政策

// 政策数据适用年度：下方个税税率表、城市缴费基数上下限、专项附加扣除标准均按此年度政策整理。
// 年终奖单独计税政策依据财税〔2018〕164 号，现行有效期延续至 2027 年 12 月 31 日。
export const POLICY_DATA_YEAR = 2024

// 按月换算的综合所得税率表
// 用于年终奖单独计税：年终奖 ÷ 12 查表确定适用税率与速算扣除数
const MONTHLY_TAX_BRACKETS = [
  { min: 0, max: 3000, rate: 0.03, deduction: 0 },
  { min: 3000, max: 12000, rate: 0.10, deduction: 210 },
  { min: 12000, max: 25000, rate: 0.20, deduction: 1410 },
  { min: 25000, max: 35000, rate: 0.25, deduction: 2660 },
  { min: 35000, max: 55000, rate: 0.30, deduction: 4410 },
  { min: 55000, max: 80000, rate: 0.35, deduction: 7160 },
  { min: 80000, max: Infinity, rate: 0.45, deduction: 15160 },
]

// 累计预扣法年度税率表（累计应纳税所得额区间）
// 对应个税规则：7级超额累进税率，速算扣除数单位元
const ANNUAL_TAX_BRACKETS = [
  { min: 0, max: 36000, rate: 0.03, deduction: 0 },
  { min: 36000, max: 144000, rate: 0.10, deduction: 2520 },
  { min: 144000, max: 300000, rate: 0.20, deduction: 16920 },
  { min: 300000, max: 420000, rate: 0.25, deduction: 31920 },
  { min: 420000, max: 660000, rate: 0.30, deduction: 52920 },
  { min: 660000, max: 960000, rate: 0.35, deduction: 85920 },
  { min: 960000, max: Infinity, rate: 0.45, deduction: 181920 },
]

// 五险一金缴纳比例（个人部分）
const INSURANCE_RATES = {
  pension: 0.08,
  medical: 0.02,
  unemployment: 0.005,
  housing: 0.07,
}

// 各城市五险一金缴费基数上下限（2024 年参考值）
const CITY_LIMITS: Record<string, { min: number; max: number; label: string; housingRate: number }> = {
  beijing: { min: 6326, max: 35283, label: '北京', housingRate: 0.12 },
  shanghai: { min: 7310, max: 36549, label: '上海', housingRate: 0.07 },
  guangzhou: { min: 5500, max: 27501, label: '广州', housingRate: 0.12 },
  shenzhen: { min: 2360, max: 34860, label: '深圳', housingRate: 0.05 },
  hangzhou: { min: 4812, max: 24060, label: '杭州', housingRate: 0.12 },
  chengdu: { min: 4511, max: 22555, label: '成都', housingRate: 0.12 },
  nanjing: { min: 4494, max: 24042, label: '南京', housingRate: 0.12 },
  wuhan: { min: 4077, max: 20385, label: '武汉', housingRate: 0.12 },
  default: { min: 3000, max: 20000, label: '自定义', housingRate: 0.07 },
}

// 城市公积金默认比例：UI 与计算共用的单一数据源
export function getCityHousingRate(city: string): number {
  return (CITY_LIMITS[city] || CITY_LIMITS.default).housingRate
}

// 专项附加扣除标准（月）
const SPECIAL_DEDUCTIONS: Record<string, number> = {
  childEducation: 2000,
  continuingEducation: 400,
  housingLoan: 1000,
  housingRent: 1500,
  elderlyCare: 3000,
  childCare: 2000,
}

// Types
export interface InsuranceResult {
  // 社保缴费基数（养老/医疗/失业），可与公积金基数分开设置
  socialBase: number
  // 公积金缴费基数
  housingBase: number
  pension: number
  medical: number
  unemployment: number
  housing: number
  total: number
  rates: { pension: number; medical: number; unemployment: number; housing: number }
}

export interface MonthResult {
  month: number
  baseSalary: number
  gross: number
  taxableExtraIncome: number
  nonTaxableExtraIncome: number
  // 年终奖（全年一次性）默认计入 12 月
  yearEndBonus: number
  insurance: InsuranceResult
  tax: number
  // 年终奖单独计税税额（并入综合所得模式为 0）
  bonusTax: number
  cumulativeTaxableIncome: number
  netPay: number
}

export interface CalcResult {
  monthly: MonthResult
  annual: {
    baseSalary: number
    taxableExtraIncome: number
    nonTaxableExtraIncome: number
    yearEndBonus: number
    bonusTax: number
    monthlyExtraIncomes: { taxable: number; nonTaxable: number }[]
    monthlyResults: MonthResult[]
    gross: number
    insurance: number
    tax: number
    net: number
    monthlyBreakdown: { month: number; cumulativeTaxableIncome: number; tax: number; cumulativeTax: number }[]
  }
  cityInfo: { min: number; max: number; label: string; housingRate: number }
}

// 年终奖计税口径：并入综合所得（累计预扣）或单独计税（月度换算税率表）
export type BonusTaxMode = 'combined' | 'separate'

interface CalcParams {
  salary: number
  city?: string
  specialDeduction?: number
  // 其他扣除（补充医保、企业年金等税前扣除项，月度金额）
  otherDeduction?: number
  customRates?: { pension?: number; medical?: number; unemployment?: number; housing?: number }
  monthlyExtraIncomes?: { taxable?: string | number; nonTaxable?: string | number }[]
  selectedMonth?: number
  yearEndBonus?: number
  bonusTaxMode?: BonusTaxMode
  // 缴费基数：留空则按城市上下限自动计算（Math.max(min, Math.min(salary, max))），社保与公积金可分开设置
  socialBase?: number
  housingBase?: number
}

// 计算五险一金：customBases 支持社保、公积金基数分开指定，缺省按城市上下限自动计算
export function calculateInsurance(salary: number, city = 'default', customRates: { pension?: number; medical?: number; unemployment?: number; housing?: number } = {}, customBases: { social?: number; housing?: number } = {}): InsuranceResult {
  const cityConfig = CITY_LIMITS[city] || CITY_LIMITS.default
  const rates = { ...INSURANCE_RATES, housing: cityConfig.housingRate, ...customRates }
  const autoBase = Math.max(cityConfig.min, Math.min(salary, cityConfig.max))
  const socialBase = customBases.social !== undefined ? customBases.social : autoBase
  const housingBase = customBases.housing !== undefined ? customBases.housing : autoBase

  const pension = Math.round(socialBase * rates.pension * 100) / 100
  const medical = Math.round(socialBase * rates.medical * 100) / 100
  const unemployment = Math.round(socialBase * rates.unemployment * 100) / 100
  const housing = Math.round(housingBase * rates.housing * 100) / 100

  return {
    socialBase,
    housingBase,
    pension,
    medical,
    unemployment,
    housing,
    total: Math.round((pension + medical + unemployment + housing) * 100) / 100,
    rates,
  }
}

const MONTH_COUNT = 12
const TAX_THRESHOLD = 5000

function normalizeMonthlyExtraIncomes(monthlyExtraIncomes: { taxable?: string | number; nonTaxable?: string | number }[] = []) {
  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const item = monthlyExtraIncomes[index] || {}
    return {
      taxable: Math.max(0, Number(item.taxable) || 0),
      nonTaxable: Math.max(0, Number(item.nonTaxable) || 0),
    }
  })
}

// 累计预扣法：逐月累加应纳税所得额增量（可为负），累计后再取 0 下限计税。
// 低薪月份未用满的减除费用与专项扣除会形成负增量，结转到后续月份抵扣年终奖等收入。
function calculateAnnualTaxCumulative(monthlyTaxableDeltas: number[]) {
  const months: { month: number; cumulativeTaxableIncome: number; tax: number; cumulativeTax: number }[] = []
  let cumulativeTaxableIncome = 0
  let cumulativeTaxPaid = 0

  for (let index = 0; index < MONTH_COUNT; index++) {
    cumulativeTaxableIncome += monthlyTaxableDeltas[index] || 0
    const taxableBase = Math.max(0, cumulativeTaxableIncome)
    const bracket = ANNUAL_TAX_BRACKETS.find(
      item => taxableBase > item.min && taxableBase <= item.max,
    ) || ANNUAL_TAX_BRACKETS[ANNUAL_TAX_BRACKETS.length - 1]

    const cumulativeTaxDue = Math.max(0, taxableBase * bracket.rate - bracket.deduction)
    const monthTax = Math.round((cumulativeTaxDue - cumulativeTaxPaid) * 100) / 100
    cumulativeTaxPaid = cumulativeTaxDue

    months.push({
      month: index + 1,
      cumulativeTaxableIncome: taxableBase,
      tax: monthTax,
      cumulativeTax: Math.round(cumulativeTaxPaid * 100) / 100,
    })
  }

  return { months, annualTax: Math.round(cumulativeTaxPaid * 100) / 100 }
}

// 年终奖单独计税：年终奖 ÷ 12 按月表确定税率与速算扣除数，税额 = 年终奖 × 税率 - 速算扣除数
export function calculateBonusTaxSeparate(bonus: number): number {
  const safeBonus = Math.max(0, Number(bonus) || 0)
  if (safeBonus === 0) return 0

  const monthlyAverage = safeBonus / MONTH_COUNT
  const bracket = MONTHLY_TAX_BRACKETS.find(
    item => monthlyAverage > item.min && monthlyAverage <= item.max,
  ) || MONTHLY_TAX_BRACKETS[MONTHLY_TAX_BRACKETS.length - 1]

  return Math.round(Math.max(0, safeBonus * bracket.rate - bracket.deduction) * 100) / 100
}

// 主计算函数
export function calculateNetPay({
  salary,
  city = 'default',
  specialDeduction = 0,
  otherDeduction = 0,
  customRates = {},
  monthlyExtraIncomes = [],
  selectedMonth = 1,
  yearEndBonus = 0,
  bonusTaxMode = 'combined',
  socialBase,
  housingBase,
}: CalcParams): CalcResult {
  const safeSocialBase = socialBase !== undefined ? Math.max(0, Number(socialBase) || 0) : undefined
  const safeHousingBase = housingBase !== undefined ? Math.max(0, Number(housingBase) || 0) : undefined
  const insurance = calculateInsurance(salary, city, customRates, { social: safeSocialBase, housing: safeHousingBase })
  const normalizedExtraIncomes = normalizeMonthlyExtraIncomes(monthlyExtraIncomes)
  const safeSelectedMonth = Math.min(MONTH_COUNT, Math.max(1, Number(selectedMonth) || 1))
  const safeYearEndBonus = Math.max(0, Number(yearEndBonus) || 0)
  // 并入综合所得：年终奖计入 12 月累计预扣；单独计税：按月度换算税率表独立计税
  const combinedBonusIncome = bonusTaxMode === 'separate' ? 0 : safeYearEndBonus
  const separateBonusTax = bonusTaxMode === 'separate' ? calculateBonusTaxSeparate(safeYearEndBonus) : 0

  // 月度增量允许为负，扣除缺口由累计预扣法在累计层面抵扣
  const safeOtherDeduction = Math.max(0, Number(otherDeduction) || 0)
  const taxableBaseBeforeExtra = salary - insurance.total - TAX_THRESHOLD - specialDeduction - safeOtherDeduction
  const monthlyTaxableDeltas = normalizedExtraIncomes.map(
    (item, index) => taxableBaseBeforeExtra + item.taxable + (index === MONTH_COUNT - 1 ? combinedBonusIncome : 0),
  )
  const annualTaxResult = calculateAnnualTaxCumulative(monthlyTaxableDeltas)
  const monthlyResults: MonthResult[] = annualTaxResult.months.map((taxResult, index) => {
    const extraIncome = normalizedExtraIncomes[index]
    const isBonusMonth = index === MONTH_COUNT - 1
    const monthBonus = isBonusMonth ? safeYearEndBonus : 0
    const monthBonusTax = isBonusMonth ? separateBonusTax : 0
    const gross = salary + extraIncome.taxable + extraIncome.nonTaxable + monthBonus
    const tax = Math.round((taxResult.tax + monthBonusTax) * 100) / 100
    return {
      month: index + 1,
      baseSalary: salary,
      gross,
      taxableExtraIncome: extraIncome.taxable,
      nonTaxableExtraIncome: extraIncome.nonTaxable,
      yearEndBonus: monthBonus,
      insurance,
      tax,
      bonusTax: monthBonusTax,
      cumulativeTaxableIncome: taxResult.cumulativeTaxableIncome,
      netPay: Math.round((gross - insurance.total - tax) * 100) / 100,
    }
  })
  const selectedMonthResult = monthlyResults[safeSelectedMonth - 1]

  const annualTaxableExtraIncome = normalizedExtraIncomes.reduce((total, item) => total + item.taxable, 0)
  const annualNonTaxableExtraIncome = normalizedExtraIncomes.reduce((total, item) => total + item.nonTaxable, 0)
  const annualBaseSalary = salary * MONTH_COUNT
  const annualGross = annualBaseSalary + annualTaxableExtraIncome + annualNonTaxableExtraIncome + safeYearEndBonus
  const annualInsurance = Math.round(insurance.total * MONTH_COUNT * 100) / 100
  const annualTax = Math.round((annualTaxResult.annualTax + separateBonusTax) * 100) / 100
  const annualNet = Math.round((annualGross - annualInsurance - annualTax) * 100) / 100

  return {
    monthly: selectedMonthResult,
    annual: {
      baseSalary: annualBaseSalary,
      taxableExtraIncome: annualTaxableExtraIncome,
      nonTaxableExtraIncome: annualNonTaxableExtraIncome,
      yearEndBonus: safeYearEndBonus,
      bonusTax: separateBonusTax,
      monthlyExtraIncomes: normalizedExtraIncomes,
      monthlyResults,
      gross: annualGross,
      insurance: annualInsurance,
      tax: annualTax,
      net: annualNet,
      monthlyBreakdown: annualTaxResult.months,
    },
    cityInfo: CITY_LIMITS[city] || CITY_LIMITS.default,
  }
}

export function getCityList() {
  return Object.entries(CITY_LIMITS)
    .filter(([key]) => key !== 'default')
    .map(([key, value]) => ({ value: key, label: value.label }))
}

export function getDeductionOptions() {
  return [
    {
      key: 'childEducation',
      label: '子女教育',
      amount: SPECIAL_DEDUCTIONS.childEducation,
      description: '学前教育（满3岁至小学入学前）及学历教育（小学至博士），2023年起每子女2000元/月。父母可各扣50%或一方全额扣除，年度内不可变更。境内外公办/民办学校均可享受。',
    },
    { key: 'continuingEducation', label: '继续教育', amount: SPECIAL_DEDUCTIONS.continuingEducation },
    { key: 'housingLoan', label: '住房贷款利息', amount: SPECIAL_DEDUCTIONS.housingLoan },
    { key: 'housingRent', label: '住房租金', amount: SPECIAL_DEDUCTIONS.housingRent },
    { key: 'elderlyCare', label: '赡养老人', amount: SPECIAL_DEDUCTIONS.elderlyCare },
    { key: 'childCare', label: '婴幼儿照护', amount: SPECIAL_DEDUCTIONS.childCare },
  ]
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
