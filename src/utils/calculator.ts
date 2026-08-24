// 税后工资计算核心逻辑
// 基于 2024 年中国个人所得税法及五险一金政策

// 个税税率表（综合所得，按月换算）
const TAX_BRACKETS = [
  { min: 0, max: 3000, rate: 0.03, deduction: 0 },
  { min: 3000, max: 12000, rate: 0.10, deduction: 210 },
  { min: 12000, max: 25000, rate: 0.20, deduction: 1410 },
  { min: 25000, max: 35000, rate: 0.25, deduction: 2660 },
  { min: 35000, max: 55000, rate: 0.30, deduction: 4410 },
  { min: 55000, max: 80000, rate: 0.35, deduction: 7160 },
  { min: 80000, max: Infinity, rate: 0.45, deduction: 15160 },
]

// 累计预扣法年度税率表（累计应纳税所得额区间）
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
  base: number
  pension: number
  medical: number
  unemployment: number
  housing: number
  total: number
  rates: typeof INSURANCE_RATES & { housing: number }
}

export interface MonthResult {
  month: number
  baseSalary: number
  gross: number
  taxableExtraIncome: number
  nonTaxableExtraIncome: number
  insurance: InsuranceResult
  tax: number
  taxableIncome: number
  netPay: number
}

export interface CalcResult {
  monthly: MonthResult
  annual: {
    baseSalary: number
    taxableExtraIncome: number
    nonTaxableExtraIncome: number
    monthlyExtraIncomes: { taxable: number; nonTaxable: number }[]
    monthlyResults: MonthResult[]
    gross: number
    insurance: number
    tax: number
    net: number
    monthlyBreakdown: { month: number; taxableIncome: number; tax: number; cumulativeTax: number }[]
  }
  cityInfo: { min: number; max: number; label: string; housingRate: number }
}

interface CalcParams {
  salary: number
  city?: string
  specialDeduction?: number
  customRates?: { housing?: number }
  monthlyExtraIncomes?: { taxable?: string | number; nonTaxable?: string | number }[]
  selectedMonth?: number
}

// 计算五险一金
export function calculateInsurance(salary: number, city = 'default', customRates: { housing?: number } = {}): InsuranceResult {
  const cityConfig = CITY_LIMITS[city] || CITY_LIMITS.default
  const rates = { ...INSURANCE_RATES, housing: cityConfig.housingRate, ...customRates }
  const base = Math.max(cityConfig.min, Math.min(salary, cityConfig.max))

  const pension = Math.round(base * rates.pension * 100) / 100
  const medical = Math.round(base * rates.medical * 100) / 100
  const unemployment = Math.round(base * rates.unemployment * 100) / 100
  const housing = Math.round(base * rates.housing * 100) / 100

  return {
    base,
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

function calculateAnnualTaxCumulative(monthlyTaxableIncomes: number[]) {
  const months: { month: number; taxableIncome: number; tax: number; cumulativeTax: number }[] = []
  let cumulativeTaxableIncome = 0
  let cumulativeTaxPaid = 0

  for (let index = 0; index < MONTH_COUNT; index++) {
    const taxableIncome = Math.max(0, monthlyTaxableIncomes[index] || 0)
    cumulativeTaxableIncome += taxableIncome
    const bracket = ANNUAL_TAX_BRACKETS.find(
      item => cumulativeTaxableIncome > item.min && cumulativeTaxableIncome <= item.max,
    ) || ANNUAL_TAX_BRACKETS[ANNUAL_TAX_BRACKETS.length - 1]

    const cumulativeTaxDue = Math.max(0, cumulativeTaxableIncome * bracket.rate - bracket.deduction)
    const monthTax = Math.round((cumulativeTaxDue - cumulativeTaxPaid) * 100) / 100
    cumulativeTaxPaid = cumulativeTaxDue

    months.push({
      month: index + 1,
      taxableIncome,
      tax: monthTax,
      cumulativeTax: Math.round(cumulativeTaxPaid * 100) / 100,
    })
  }

  return { months, annualTax: Math.round(cumulativeTaxPaid * 100) / 100 }
}

// 主计算函数
export function calculateNetPay({
  salary,
  city = 'default',
  specialDeduction = 0,
  customRates = {},
  monthlyExtraIncomes = [],
  selectedMonth = 1,
}: CalcParams): CalcResult {
  const insurance = calculateInsurance(salary, city, customRates)
  const normalizedExtraIncomes = normalizeMonthlyExtraIncomes(monthlyExtraIncomes)
  const safeSelectedMonth = Math.min(MONTH_COUNT, Math.max(1, Number(selectedMonth) || 1))
  const taxableBaseBeforeExtra = salary - insurance.total - TAX_THRESHOLD - specialDeduction
  const monthlyTaxableIncomes = normalizedExtraIncomes.map(
    item => Math.max(0, taxableBaseBeforeExtra + item.taxable),
  )
  const annualTaxResult = calculateAnnualTaxCumulative(monthlyTaxableIncomes)
  const monthlyResults: MonthResult[] = annualTaxResult.months.map((taxResult, index) => {
    const extraIncome = normalizedExtraIncomes[index]
    const gross = salary + extraIncome.taxable + extraIncome.nonTaxable
    return {
      month: index + 1,
      baseSalary: salary,
      gross,
      taxableExtraIncome: extraIncome.taxable,
      nonTaxableExtraIncome: extraIncome.nonTaxable,
      insurance,
      tax: taxResult.tax,
      taxableIncome: taxResult.taxableIncome,
      netPay: Math.round((gross - insurance.total - taxResult.tax) * 100) / 100,
    }
  })
  const selectedMonthResult = monthlyResults[safeSelectedMonth - 1]

  const annualTaxableExtraIncome = normalizedExtraIncomes.reduce((total, item) => total + item.taxable, 0)
  const annualNonTaxableExtraIncome = normalizedExtraIncomes.reduce((total, item) => total + item.nonTaxable, 0)
  const annualBaseSalary = salary * MONTH_COUNT
  const annualGross = annualBaseSalary + annualTaxableExtraIncome + annualNonTaxableExtraIncome
  const annualInsurance = Math.round(insurance.total * MONTH_COUNT * 100) / 100
  const annualTax = annualTaxResult.annualTax
  const annualNet = Math.round((annualGross - annualInsurance - annualTax) * 100) / 100

  return {
    monthly: selectedMonthResult,
    annual: {
      baseSalary: annualBaseSalary,
      taxableExtraIncome: annualTaxableExtraIncome,
      nonTaxableExtraIncome: annualNonTaxableExtraIncome,
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
    { key: 'childEducation', label: '子女教育', amount: SPECIAL_DEDUCTIONS.childEducation },
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
