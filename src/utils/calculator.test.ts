import { describe, expect, it } from 'vitest'
import {
  calculateBonusTaxSeparate,
  calculateInsurance,
  calculateNetPay,
  getCityHousingRate,
  POLICY_DATA_YEAR,
} from './calculator'

describe('社保公积金计算', () => {
  it('按城市缴费基数上下限钳制', () => {
    expect(calculateInsurance(3000, 'beijing').base).toBe(6326)
    expect(calculateInsurance(100000, 'beijing').base).toBe(35283)
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
