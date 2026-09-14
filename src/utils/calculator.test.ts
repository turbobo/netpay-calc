import { describe, expect, it } from 'vitest'
import {
  calculateBonusTaxSeparate,
  calculateInsurance,
  calculateMajorMedicalDeduction,
  calculateNetPay,
  getCityHousingRate,
  POLICY_DATA_YEAR,
} from './calculator'

describe('社保公积金计算', () => {
  it('按城市缴费基数上下限钳制', () => {
    expect(calculateInsurance(3000, 'beijing').socialBase).toBe(6326)
    expect(calculateInsurance(100000, 'beijing').socialBase).toBe(35283)
    // 未手动指定时，社保与公积金基数相同（均为自动基数）
    expect(calculateInsurance(100000, 'beijing').housingBase).toBe(35283)
  })

  it('使用城市默认公积金比例并合计五险一金', () => {
    const result = calculateInsurance(20000, 'beijing')
    expect(result.pension).toBe(1600)
    expect(result.medical).toBe(400)
    expect(result.unemployment).toBe(100)
    expect(result.housing).toBe(2400)
    expect(result.total).toBe(4500)
  })

  it('自定义比例覆盖默认值', () => {
    const result = calculateInsurance(20000, 'beijing', { pension: 0.04, housing: 0.05 })
    expect(result.pension).toBe(800)
    expect(result.housing).toBe(1000)
  })

  it('支持手动指定缴费基数，覆盖城市上下限', () => {
    // 20000 月薪北京自动基数应为 20000；手动指定 10000 后按 10000 计算
    const autoBase = calculateInsurance(20000, 'beijing')
    expect(autoBase.socialBase).toBe(20000)
    expect(autoBase.housingBase).toBe(20000)
    expect(autoBase.total).toBe(4500)

    const customBase = calculateInsurance(20000, 'beijing', {}, { social: 10000, housing: 10000 })
    expect(customBase.socialBase).toBe(10000)
    expect(customBase.housingBase).toBe(10000)
    expect(customBase.total).toBe(2250)
  })

  it('社保与公积金基数可分开设置', () => {
    // 仅指定社保基数：养老/医疗/失业按 10000，公积金仍按自动基数 20000
    const socialOnly = calculateInsurance(20000, 'beijing', {}, { social: 10000 })
    expect(socialOnly.socialBase).toBe(10000)
    expect(socialOnly.housingBase).toBe(20000)
    // 800 + 200 + 50 + 2400 = 3450
    expect(socialOnly.total).toBe(3450)

    // 仅指定公积金基数：公积金按 10000，社保仍按自动基数 20000
    const housingOnly = calculateInsurance(20000, 'beijing', {}, { housing: 10000 })
    expect(housingOnly.socialBase).toBe(20000)
    expect(housingOnly.housingBase).toBe(10000)
    // 1600 + 400 + 100 + 1200 = 3300
    expect(housingOnly.total).toBe(3300)

    // 通过 calculateNetPay 分开传入两个基数
    const result = calculateNetPay({ salary: 20000, city: 'beijing', socialBase: 10000, housingBase: 10000 })
    expect(result.cityInfo.min).toBe(6326)
    expect(result.annual.baseSalary).toBe(240000)
    // annualInsurance = 2250 * 12 = 27000
    expect(result.annual.insurance).toBe(27000)
  })
})

describe('城市配置单一数据源', () => {
  it('返回城市默认公积金比例', () => {
    expect(getCityHousingRate('beijing')).toBe(0.12)
    expect(getCityHousingRate('shenzhen')).toBe(0.05)
  })

  it('未知城市回退到默认配置', () => {
    expect(getCityHousingRate('unknown-city')).toBe(0.07)
  })

  it('政策数据标注适用年度', () => {
    expect(POLICY_DATA_YEAR).toBe(2024)
  })
})

describe('累计预扣法', () => {
  it('固定月薪逐月按累计税率预扣', () => {
    const result = calculateNetPay({ salary: 30000, city: 'beijing' })
    // 月增量 30000 - 6750 - 5000 = 18250；12 月累计 219000 → 20% 档
    expect(result.annual.monthlyBreakdown[0].tax).toBe(547.5)
    expect(result.annual.monthlyBreakdown[1].tax).toBe(582.5)
    expect(result.annual.tax).toBe(26880)
  })

  it('低薪月份扣除缺口结转到后续月份抵扣年终奖', () => {
    // 月增量 5500 - 1423.35 - 5000 = -923.35，全年缺口 -11080.2
    const result = calculateNetPay({
      salary: 5500,
      city: 'beijing',
      yearEndBonus: 10000,
      bonusTaxMode: 'combined',
    })
    // 累计 10000 - 11080.2 < 0 → 不产生个税
    expect(result.annual.tax).toBe(0)
  })

  it('缺口结转后仅对超出部分计税', () => {
    const result = calculateNetPay({
      salary: 5500,
      city: 'beijing',
      yearEndBonus: 20000,
      bonusTaxMode: 'combined',
    })
    // 累计 20000 - 11080.2 = 8919.8 → 3% → 267.59
    expect(result.annual.tax).toBe(267.59)
  })

  it('与个税规则截图案例一致：30000月薪+4500三险一金+2000专项扣除', () => {
    // 截取样例：某职员每月应发工资30000元，减除费用5000，"三险一金"4500，
    // 子女教育/赡养老人专项附加扣除2000，无减免收入及免税额。
    const result = calculateNetPay({
      salary: 30000,
      city: 'beijing',
      specialDeduction: 2000,
      customRates: { pension: 0.08, medical: 0.02, unemployment: 0.005, housing: 0.045 },
    })
    // 1月：(30000-5000-4500-2000) × 3% = 555
    expect(result.annual.monthlyBreakdown[0].tax).toBe(555)
    // 2月：(累计37000) × 10% - 2520 - 555 = 625
    expect(result.annual.monthlyBreakdown[1].tax).toBe(625)
    // 3月：(累计55500) × 10% - 2520 - 1180 = 1850

    expect(result.annual.monthlyBreakdown[2].tax).toBe(1850)
  })
})

describe('年终奖单独计税', () => {
  it('按年终奖 ÷ 12 查月度税率表', () => {
    expect(calculateBonusTaxSeparate(36000)).toBe(1080)
    expect(calculateBonusTaxSeparate(120000)).toBe(11790)
    expect(calculateBonusTaxSeparate(960000)).toBe(328840)
    expect(calculateBonusTaxSeparate(1000000)).toBe(434840)
  })

  it('临界值取较低档，超出临界点进入下一档', () => {
    expect(calculateBonusTaxSeparate(36000)).toBe(1080)
    expect(calculateBonusTaxSeparate(36001)).toBe(3390.1)
  })

  it('金额为 0 或负数时税额为 0', () => {
    expect(calculateBonusTaxSeparate(0)).toBe(0)
    expect(calculateBonusTaxSeparate(-100)).toBe(0)
  })
})

describe('年终奖两种计税口径', () => {
  const base = { salary: 20000, city: 'beijing', yearEndBonus: 36000 }

  it('并入综合所得：年终奖计入 12 月累计预扣', () => {
    const result = calculateNetPay({ ...base, bonusTaxMode: 'combined' })
    // 累计 162000 → 20% 档 → 15480
    expect(result.annual.tax).toBe(15480)
    expect(result.annual.bonusTax).toBe(0)
    expect(result.annual.monthlyResults[11].yearEndBonus).toBe(36000)
    expect(result.annual.monthlyResults[11].gross).toBe(56000)
  })

  it('单独计税：年终奖独立计税，不进入累计预扣', () => {
    const result = calculateNetPay({ ...base, bonusTaxMode: 'separate' })
    // 工资累计 126000 → 10080；年终奖 36000 → 1080
    expect(result.annual.tax).toBe(11160)
    expect(result.annual.bonusTax).toBe(1080)
    expect(result.annual.monthlyResults[11].bonusTax).toBe(1080)
    expect(result.annual.monthlyResults[11].tax).toBe(2130)
    expect(result.annual.net).toBe(210840)
  })

  it('非法年终奖金额安全回退为 0', () => {
    const result = calculateNetPay({
      salary: 20000,
      city: 'beijing',
      yearEndBonus: -5000,
      bonusTaxMode: 'separate',
    })
    expect(result.annual.yearEndBonus).toBe(0)
    expect(result.annual.bonusTax).toBe(0)
  })
})

describe('大病医疗专项附加扣除', () => {
  it('按超过 15000 元的部分据实扣除，限额 80000 元', () => {
    expect(calculateMajorMedicalDeduction(0)).toBe(0)
    expect(calculateMajorMedicalDeduction(15000)).toBe(0)
    expect(calculateMajorMedicalDeduction(30000)).toBe(15000)
    expect(calculateMajorMedicalDeduction(95000)).toBe(80000)
    expect(calculateMajorMedicalDeduction(1000000)).toBe(80000)
    expect(calculateMajorMedicalDeduction(-100)).toBe(0)
  })

  it('年末汇算抵扣：年度个税减少，12 月体现退税', () => {
    // 20000 月薪北京无大病医疗时年个税 10080
    const without = calculateNetPay({ salary: 20000, city: 'beijing' })
    expect(without.annual.tax).toBe(10080)

    // 个人负担 30000 → 可扣除 15000 → 年末累计 126000 - 15000 = 111000 → 10% 档 = 8580
    const result = calculateNetPay({ salary: 20000, city: 'beijing', majorMedicalExpense: 30000 })
    expect(result.annual.tax).toBe(8580)
    // 12 月按汇算口径退税 450
    expect(result.annual.monthlyResults[11].tax).toBe(-450)
  })
})
