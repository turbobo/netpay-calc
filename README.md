# NetPay Calc - 税后工资计算器

免费在线税后工资计算器，支持五险一金、个税、专项附加扣除，覆盖全国 8 大主要城市。

## 功能

- 税前月薪 → 税后到手收入，3 秒出结果
- 五险一金明细（养老/医疗/失业/公积金）
- 个人所得税自动计算（七级超额累进税率）
- 专项附加扣除（子女教育、房贷、赡养老人等）
- 每月独立录入计税与不计税额外收入，并按累计预扣法计算全年个税
- 覆盖北京、上海、广州、深圳、杭州、成都、南京、武汉
- 注册用户可保存计算历史，随时对比

## 快速开始

```bash
cd netpay-calc

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase 配置

# 启动开发服务器
npm run dev
# 打开 http://localhost:5173
```

## 部署

推送到 GitHub 后，EdgeOne Pages 自动构建部署：

- 构建命令：`npm run build`
- 输出目录：`dist`

## 技术栈

- Vite 5 + React 18 + TypeScript 5
- Tailwind CSS 3.4
- Supabase (Auth)
- 部署：EdgeOne Pages
