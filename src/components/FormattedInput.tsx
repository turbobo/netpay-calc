import { useState, useRef, useCallback, useEffect } from 'react'

interface FormattedInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  min?: number
  max?: number
  step?: number
  id?: string
  'aria-label'?: string
  suffix?: string
  prefix?: string
}

/**
 * 格式化金额输入框
 * - 输入时显示千分位格式（如 15,000）
 * - 聚焦时显示原始数字（如 15000）方便编辑
 * - 失焦时自动格式化
 * - 支持 prefix/suffix 显示
 */
export default function FormattedInput({
  value,
  onChange,
  placeholder,
  className = '',
  min,
  max,
  step,
  id,
  'aria-label': ariaLabel,
  suffix,
  prefix,
}: FormattedInputProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 格式化数字为千分位
  const formatNumber = useCallback((val: string): string => {
    if (!val || val === '') return ''
    const num = parseFloat(val)
    if (isNaN(num)) return val

    // 检查是否有小数部分
    const parts = val.split('.')
    const intPart = parts[0]
    const decPart = parts[1]

    // 格式化整数部分
    const formatted = parseInt(intPart, 10).toLocaleString('en-US')

    // 如果有小数部分，保留
    if (decPart !== undefined) {
      return `${formatted}.${decPart}`
    }
    return formatted
  }, [])

  // 显示值：聚焦时显示原始值，失焦时显示格式化值
  const displayValue = focused ? value : formatNumber(value)

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // 只允许数字、小数点和负号
    const cleaned = raw.replace(/[^0-9.\-]/g, '')

    // 确保只有一个小数点
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      const valid = parts[0] + '.' + parts.slice(1).join('')
      onChange(valid)
    } else {
      onChange(cleaned)
    }
  }

  // 失焦时钳制范围
  const handleBlur = () => {
    setFocused(false)
    if (value !== '' && (min !== undefined || max !== undefined)) {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        let clamped = num
        if (min !== undefined && clamped < min) clamped = min
        if (max !== undefined && clamped > max) clamped = max
        if (clamped !== num) {
          onChange(String(clamped))
        }
      }
    }
  }

  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-sm text-slate-400 pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={`${className} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-7' : ''} tabular-nums`}
      />
      {suffix && (
        <span className="absolute right-3 text-sm text-slate-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  )
}
