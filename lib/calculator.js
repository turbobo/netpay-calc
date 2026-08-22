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

// 五险一金缴纳比例（个人部分，可按城市调整）
const INSURANCE_RATES = {
  pension: 0.08,       // 养老保险 8%
  medical: 0.02,       // 医疗保险 2%
  unemployment: 0.005, // 失业保险 0.5%
  housing: 0.07,       // 住房公积金 7%（各地不同，默认7%）
}

// 各城市五险一金缴费基数上下限（2024 年参考值）
const CITY_LIMITS = {
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
const SPECIAL_DEDUCTIONS = {
  childEducation: 2000,   // 子女教育 2000/子女/月
  continuingEducation: 400, // 继续教育 400/月
  housingLoan: 1000,      // 住房贷款利息 1000/月
  housingRent: 1500,      // 住房租金 1500/月（按城市不同）
  elderlyCare: 3000,      // 赡养老人 3000/月
  childCare: 2000,        // 3岁以下婴幼儿照护 2000/子女/月
}

/**
 * 计算五险一金
 * @param {number} salary - 税前月薪
 * @param {string} city - 城市代码
 * @param {object} customRates - 自定义缴纳比例
 * @returns {object} 五险一金明细
 */
export function calculateInsurance(salary, city = 'default', customRates = {}) {
  const cityConfig = CITY_LIMITS[city] || CITY_LIMITS.default
  const rates = { ...INSURANCE_RATES, housing: cityConfig.housingRate, ...customRates }

  // 缴费基数：clamp 到上下限之间
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

/**
 * 计算个人所得税（单月，用于快速估算）
 * @param {number} taxableIncome - 应纳税所得额（月）
 * @returns {object} 个税明细
 */
export function calculateTax(taxableIncome) {
  if (taxableIncome <= 0) return { tax: 0, bracket: null }

  const bracket = TAX_BRACKETS.find(b => taxableIncome > b.min && taxableIncome <= b.max)
    || TAX_BRACKETS[TAX_BRACKETS.length - 1]

  const tax = Math.round((taxableIncome * bracket.rate - bracket.deduction) * 100) / 100
  return { tax: Math.max(0, tax), bracket }
}

const MONTH_COUNT = 12
const TAX_THRESHOLD = 5000

/**
 * 标准化每月额外收入，缺失或非法值按 0 处理。
 * @param {Array<{taxable?: number, nonTaxable?: number}>} monthlyExtraIncomes
 * @returns {Array<{taxable: number, nonTaxable: number}>}
 */
function normalizeMonthlyExtraIncomes(monthlyExtraIncomes = []) {
  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const item = monthlyExtraIncomes[index] || {}
    return {
      taxable: Math.max(0, Number(item.taxable) || 0),
      nonTaxable: Math.max(0, Number(item.nonTaxable) || 0),
    }
  })
}

/**
 * 累计预扣法：按每月实际应纳税所得额计算全年个税。
 * 中国个税按“累计应纳税所得额”查年度税率表，每月应缴 = 累计应缴 - 前几月已缴。
 * @param {number[]} monthlyTaxableIncomes - 12 个月分别对应的应纳税所得额
 * @returns {object} { months: [{month, taxableIncome, tax, cumulativeTax}], annualTax }
 */
function calculateAnnualTaxCumulative(monthlyTaxableIncomes) {
  const months = []
  let cumulativeTaxableIncome = 0
  let cumulativeTaxPaid = 0

  for (let index = 0; index < MONTH_COUNT; index++) {
    const taxableIncome = Math.max(0, monthlyTaxableIncomes[index] || 0)
    cumulativeTaxableIncome += taxableIncome
    const bracket = ANNUAL_TAX_BRACKETS.find(
      item => cumulativeTaxableIncome > item.min && cumulativeTaxableIncome <= item.max,
    ) || ANNUAL_TAX_BRACKETS[ANNUAL_TAX_BRACKETS.length - 1]

    const cumulativeTaxDue = Math.max(
      0,
      cumulativeTaxableIncome * bracket.rate - bracket.deduction,
    )
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

/**
 * 主计算函数：输入税前工资，输出税后到手收入
 * @param {object} params
 * @param {number} params.salary - 税前月薪
 * @param {string} params.city - 城市
 * @param {number} params.specialDeduction - 专项附加扣除合计
 * @param {object} params.customRates - 自定义缴纳比例
 * @param {Array<{taxable?: number, nonTaxable?: number}>} params.monthlyExtraIncomes - 每月额外收入
 * @param {number} params.selectedMonth - 当前查看月份（1-12）
 * @returns {object} 完整计算结果
 */
export function calculateNetPay({
  salary,
  city = 'default',
  specialDeduction = 0,
  customRates = {},
  monthlyExtraIncomes = [],
  selectedMonth = 1,
}) {
  const insurance = calculateInsurance(salary, city, customRates)
  const normalizedExtraIncomes = normalizeMonthlyExtraIncomes(monthlyExtraIncomes)
  const safeSelectedMonth = Math.min(MONTH_COUNT, Math.max(1, Number(selectedMonth) || 1))
  const taxableBaseBeforeExtra = salary - insurance.total - TAX_THRESHOLD - specialDeduction
  const monthlyTaxableIncomes = normalizedExtraIncomes.map(
    item => Math.max(0, taxableBaseBeforeExtra + item.taxable),
  )
  const annualTaxResult = calculateAnnualTaxCumulative(monthlyTaxableIncomes)
  const selectedExtraIncome = normalizedExtraIncomes[safeSelectedMonth - 1]
  const selectedTax = annualTaxResult.months[safeSelectedMonth - 1].tax
  const monthlyGross = salary + selectedExtraIncome.taxable + selectedExtraIncome.nonTaxable
  const netPay = Math.round((monthlyGross - insurance.total - selectedTax) * 100) / 100

  const annualTaxableExtraIncome = normalizedExtraIncomes.reduce(
    (total, item) => total + item.taxable,
    0,
  )
  const annualNonTaxableExtraIncome = normalizedExtraIncomes.reduce(
    (total, item) => total + item.nonTaxable,
    0,
  )
  const annualBaseSalary = salary * MONTH_COUNT
  const annualGross = annualBaseSalary + annualTaxableExtraIncome + annualNonTaxableExtraIncome
  const annualInsurance = Math.round(insurance.total * MONTH_COUNT * 100) / 100
  const annualTax = annualTaxResult.annualTax
  const annualNet = Math.round((annualGross - annualInsurance - annualTax) * 100) / 100

  return {
    monthly: {
      month: safeSelectedMonth,
      baseSalary: salary,
      gross: monthlyGross,
      taxableExtraIncome: selectedExtraIncome.taxable,
      nonTaxableExtraIncome: selectedExtraIncome.nonTaxable,
      insurance,
      tax: selectedTax,
      taxableIncome: monthlyTaxableIncomes[safeSelectedMonth - 1],
      netPay,
    },
    annual: {
      baseSalary: annualBaseSalary,
      taxableExtraIncome: annualTaxableExtraIncome,
      nonTaxableExtraIncome: annualNonTaxableExtraIncome,
      gross: annualGross,
      insurance: annualInsurance,
      tax: annualTax,
      net: annualNet,
      monthlyBreakdown: annualTaxResult.months,
    },
    cityInfo: CITY_LIMITS[city] || CITY_LIMITS.default,
  }
}

// 导出城市列表（排除内部 default）
export function getCityList() {
  return Object.entries(CITY_LIMITS)
    .filter(([key]) => key !== 'default')
    .map(([key, value]) => ({
      value: key,
      label: value.label,
    }))
}

// 导出专项附加扣除选项（带 label，供 UI 直接使用）
export function getSpecialDeductions() {
  return SPECIAL_DEDUCTIONS
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

// 格式化金额
export function formatMoney(amount) {
  return amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
