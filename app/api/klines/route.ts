import { NextRequest, NextResponse } from 'next/server';

/**
 * 生成稳定的模拟K线数据
 * @param symbol 交易对
 * @param basePrice 基础价格
 * @param interval 时间间隔
 * @returns 模拟K线数据数组
 */
function generateStableMockKlines(
  symbol: string = 'SOLUSDT', 
  basePrice: number = 114.18, 
  interval: string = '30m'
) {
  // 时间间隔映射（毫秒）
  const intervalMap: Record<string, number> = {
    '1m': 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  
  const intervalMs = intervalMap[interval] || 30 * 60 * 1000;
  const now = Math.floor(Date.now() / intervalMs) * intervalMs;
  const klines: any[] = [];
  
  let currentPrice = basePrice;
  
  // 生成指定数量的K线
  for (let i = 99; i >= 0; i--) {
    const time = now - i * intervalMs;
    
    // 创建可重现的伪随机数
    const seed = (time + i * 12345) % 1000000;
    const pseudoRandoms = {
      r1: Math.sin(seed * 0.001) * 0.5 + 0.5,
      r2: Math.sin(seed * 0.002 + 100) * 0.5 + 0.5,
      r3: Math.sin(seed * 0.003 + 200) * 0.5 + 0.5,
      r4: Math.sin(seed * 0.004 + 300) * 0.5 + 0.5,
    };
    
    // 计算价格
    const open = currentPrice * (1 + (pseudoRandoms.r1 - 0.5) * 0.015);
    const close = open * (1 + (pseudoRandoms.r2 - 0.5) * 0.02);
    const high = Math.max(open, close) * (1 + pseudoRandoms.r3 * 0.005);
    const low = Math.min(open, close) * (1 - pseudoRandoms.r4 * 0.005);
    
    // 计算成交量
    const volume = 3000000 + (pseudoRandoms.r1 - 0.5) * 4000000;
    
    klines.push({
      time,
      open: parseFloat(open.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      volume: Math.max(100000, volume),
      quoteAssetVolume: volume * close,
    });
    
    currentPrice = close;
  }
  
  return klines;
}

/**
 * 从Binance API获取数据
 * @param url API地址
 * @returns 响应数据或null
 */
async function fetchBinanceData(url: string): Promise<any | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Binance API request failed:', error);
  }
  return null;
}

/**
 * 生成市场统计数据
 * @param klines K线数据
 * @param symbol 交易对
 * @returns 统计数据
 */
function generateMarketStats(klines: any[], symbol: string) {
  if (klines.length === 0) return null;
  
  const lastKline = klines[klines.length - 1];
  const firstKline = klines[0];
  const priceChange = ((lastKline.close - firstKline.close) / firstKline.close) * 100;
  const highPrice = Math.max(...klines.map(k => k.high));
  const lowPrice = Math.min(...klines.map(k => k.low));
  const totalVolume = klines.reduce((sum, k) => sum + k.volume, 0);

  return {
    symbol,
    lastPrice: lastKline.close,
    priceChangePercent: priceChange.toFixed(2),
    highPrice: parseFloat(highPrice.toFixed(4)),
    lowPrice: parseFloat(lowPrice.toFixed(4)),
    volume: totalVolume,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'SOLUSDT';
    const interval = searchParams.get('interval') || '30m';
    const limit = searchParams.get('limit') || '100';

    let klines: any[] | null = null;
    let stats: any = null;
    let funding = 0;
    let openInterest = '0';

    // 验证参数
    const validIntervals = ['1m', '15m', '30m', '1h', '4h', '1d'];
    if (!validIntervals.includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval. Valid intervals: 1m, 15m, 30m, 1h, 4h, 1d' },
        { status: 400 }
      );
    }

    // 尝试获取真实K线数据
    const klineData = await fetchBinanceData(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );

    if (klineData) {
      klines = klineData.map((k: any) => ({
        time: parseInt(k[0]),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[7]),
        quoteAssetVolume: parseFloat(k[8]),
      }));

      // 并行获取其他市场数据
      const [statsData, fundingData, oiData] = await Promise.all([
        fetchBinanceData(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`),
        fetchBinanceData(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`),
        fetchBinanceData(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`),
      ]);

      stats = statsData;
      funding = fundingData?.[0]?.fundingRate || 0;
      openInterest = oiData?.openInterest || '0';
    }

    // 使用模拟数据作为后备
    if (!klines) {
      klines = generateStableMockKlines(symbol, 114.18, interval);
    }

    // 生成统计数据（如果没有真实数据）
    if (!stats) {
      stats = generateMarketStats(klines, symbol);
    }

    return NextResponse.json({
      klines: klines || [],
      stats: stats || {
        symbol,
        lastPrice: 114.18,
        priceChangePercent: -1.22,
        highPrice: 119.09,
        lowPrice: 112.67,
        volume: 3111297101,
      },
      funding: parseFloat(funding.toString()) || 0,
      openInterest: typeof openInterest === 'string' ? openInterest : openInterest.toString(),
      isMockData: !klineData, // 标记是否使用了模拟数据
    });
  } catch (error) {
    console.error('API Error:', error);
    
    // 发生错误时返回模拟数据
    const symbol = request.nextUrl.searchParams.get('symbol') || 'SOLUSDT';
    const interval = request.nextUrl.searchParams.get('interval') || '30m';
    
    const klines = generateStableMockKlines(symbol, 114.18, interval);
    const stats = generateMarketStats(klines, symbol);
    
    return NextResponse.json({
      klines,
      stats,
      funding: 0,
      openInterest: '0',
      isMockData: true,
      error: 'API request failed, using mock data',
    });
  }
}
