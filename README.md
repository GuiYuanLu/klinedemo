# Crypto Trading Dashboard

一个基于Next.js的加密货币交易仪表盘，支持显示K线图表、成交量、市场信息和技术指标。

## 技术栈

- **框架**: Next.js 16.0.10
- **语言**: TypeScript
- **样式**: Tailwind CSS 4.1.9
- **UI组件**: Radix UI
- **图表库**: Recharts
- **状态管理**: React useState
- **数据来源**: Binance API (或模拟数据)

## 功能特性

- 📊 **实时K线图表** - 支持多种时间间隔
- 📈 **成交量分析** - 包含成交量均线
- 📋 **市场信息面板** - 显示价格、涨跌幅、高低价等
- 📉 **技术指标** - 支持MA(5/10/30)等指标
- 🔄 **自动更新** - 每分钟自动刷新数据
- 🌐 **响应式设计** - 适配不同屏幕尺寸
- 🛡️ **容错机制** - 当API不可用时自动使用模拟数据

## 快速开始

### 安装依赖

```bash
# 使用npm
npm install

# 或使用yarn
yarn install

# 或使用pnpm
pnpm install
```

### 运行开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

服务器将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
# 或
yarn build
# 或
pnpm build
```

### 启动生产服务器

```bash
npm start
# 或
yarn start
# 或
pnpm start
```

## 项目结构

```
├── app/
│   ├── api/              # API路由
│   │   └── klines/       # K线数据接口
│   ├── layout.tsx        # 应用布局
│   ├── page.tsx          # 主页面
│   └── globals.css       # 全局样式
├── components/           # 组件目录
│   ├── KlineChart.tsx    # K线图表组件
│   ├── VolumeChart.tsx   # 成交量图表组件
│   ├── MarketInfo.tsx    # 市场信息面板
│   ├── IndicatorsPanel.tsx # 指标面板
│   └── ui/               # Radix UI组件
├── lib/                  # 工具函数
│   └── chartUtils.ts     # 图表工具函数
├── public/               # 静态资源
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript配置
└── README.md             # 项目说明
```

## API接口

### GET /api/klines

获取K线数据和市场信息。

**参数**:
- `symbol` (可选): 交易对，默认 `SOLUSDT`
- `interval` (可选): 时间间隔，默认 `30m`
- `limit` (可选): 数据点数量，默认 `100`

**返回数据**:
```json
{
  "klines": [
    {
      "time": 1634567890000,
      "open": 114.18,
      "high": 114.50,
      "low": 113.90,
      "close": 114.25,
      "volume": 1000000
    },
    // 更多K线数据...
  ],
  "stats": {
    "symbol": "SOLUSDT",
    "lastPrice": 114.18,
    "priceChangePercent": -1.22,
    "highPrice": 119.09,
    "lowPrice": 112.67,
    "volume": 3111297101
  },
  "funding": 0.01,
  "openInterest": "408720000"
}
```

## 数据来源

- **真实数据**: Binance Futures API
- **模拟数据**: 当Binance API不可用时自动使用

## 环境要求

- Node.js 18.0 或更高版本
- npm 9.0 或更高版本

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)


## 贡献

欢迎提交Issue和Pull Request！

## 注意事项

- 本项目使用Binance API获取数据，可能受到API访问限制
- 模拟数据仅用于演示目的，不反映真实市场情况
- 建议在生产环境中使用真实数据来源并添加适当的错误处理