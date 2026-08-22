import './globals.css'

export const metadata = {
  title: 'NetPay Calc - 税后工资计算器 | 3秒算出到手收入',
  description: '免费在线税后工资计算器，支持五险一金、个税、专项附加扣除，覆盖北京上海广州深圳等全国主要城市。',
  keywords: '税后工资,工资计算,五险一金,个税,到手收入,薪资计算',
  openGraph: {
    title: 'NetPay Calc - 税后工资计算器',
    description: '3秒算出到手收入，支持五险一金和个税专项扣除',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
