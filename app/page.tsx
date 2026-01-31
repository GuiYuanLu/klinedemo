'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CandlestickChart } from '@/components/CandlestickChart';
import { VolumeBarChart } from '@/components/VolumeBarChart';
import { MarketInfo } from '@/components/MarketInfo';
import { IndicatorsPanel } from '@/components/IndicatorsPanel';
import { calculateMovingAverages, enrichKlineData, calculateMA } from '@/lib/chartUtils';
import { createBinanceWebSocketService } from '@/lib/websocketService';
import { Button } from '@/components/ui/button';

/**
 * 交易页面组件
 * 显示加密货币K线图表、市场信息和技术指标
 * 支持实时数据更新和移动端交互
 */

export default function TradingPage() {
  // 状态管理
  const [symbol, setSymbol] = useState('SOLUSDT'); // 交易对
  const [timeInterval, setTimeInterval] = useState('30m'); // 时间间隔
  const [klines, setKlines] = useState<any[]>([]); // K线数据
  const [stats, setStats] = useState<any>(null); // 市场统计数据
  const [funding, setFunding] = useState(0); // 资金费率
  const [openInterest, setOpenInterest] = useState('0'); // 持仓量
  const [loading, setLoading] = useState(false); // 加载状态
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null); // 悬停索引
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false); // WebSocket连接状态
  
  // WebSocket服务引用
  const wsServiceRef = useRef<any>(null);

  /**
   * 生成本地模拟K线数据作为后备
   */
  const generateLocalMockData = useCallback(() => {
    const mockKlines = [];
    const now = Date.now();
    const intervalMap: Record<string, number> = {
      '1m': 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    
    const intervalMs = intervalMap[timeInterval] || 30 * 60 * 1000;
    let currentPrice = 114.18;
    
    for (let i = 99; i >= 0; i--) {
      const time = now - i * intervalMs;
      const open = currentPrice * (1 + (Math.random() - 0.5) * 0.01);
      const close = open * (1 + (Math.random() - 0.5) * 0.015);
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      const volume = 3000000 + (Math.random() - 0.5) * 4000000;
      
      mockKlines.push({
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
    
    return mockKlines;
  }, [timeInterval]);

  /**
   * 获取K线数据
   * 从API获取历史K线数据，并计算相关技术指标
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/klines?symbol=${symbol}&interval=${timeInterval}&limit=100`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();

      if (data.klines && data.klines.length > 0) {
        // 计算均线
        const movingAverages = calculateMovingAverages(data.klines);
        
        // 计算成交量均线
        const volumeMA5 = calculateMA(data.klines, 5);
        const volumeMA10 = calculateMA(data.klines, 10);

        // 增强K线数据，添加均线和其他指标
        const enrichedData = enrichKlineData(data.klines, movingAverages).map(
          (candle: any, i: number) => ({
            ...candle,
            volumeMA5: volumeMA5[i],
            volumeMA10: volumeMA10[i],
          })
        );

        // 更新状态
        setKlines(enrichedData);
        setStats(data.stats || null);
        setFunding(typeof data.funding === 'number' ? data.funding : 0);
        setOpenInterest(data.openInterest?.toString() || '0');
      } else {
        console.error('No klines data received from API, using local mock data');
        // 使用本地模拟数据
        const mockKlines = generateLocalMockData();
        const movingAverages = calculateMovingAverages(mockKlines);
        const volumeMA5 = calculateMA(mockKlines, 5);
        const volumeMA10 = calculateMA(mockKlines, 10);
        
        const enrichedData = enrichKlineData(mockKlines, movingAverages).map(
          (candle: any, i: number) => ({
            ...candle,
            volumeMA5: volumeMA5[i],
            volumeMA10: volumeMA10[i],
          })
        );
        
        setKlines(enrichedData);
        setStats({
          symbol,
          lastPrice: mockKlines[mockKlines.length - 1].close,
          priceChangePercent: '0.00',
          highPrice: Math.max(...mockKlines.map(k => k.high)),
          lowPrice: Math.min(...mockKlines.map(k => k.low)),
          volume: mockKlines.reduce((sum, k) => sum + k.volume, 0),
        });
      }
    } catch (error) {
      console.error('Error fetching data, using local mock data:', error);
      // 使用本地模拟数据作为最后后备
      const mockKlines = generateLocalMockData();
      const movingAverages = calculateMovingAverages(mockKlines);
      const volumeMA5 = calculateMA(mockKlines, 5);
      const volumeMA10 = calculateMA(mockKlines, 10);
      
      const enrichedData = enrichKlineData(mockKlines, movingAverages).map(
        (candle: any, i: number) => ({
          ...candle,
          volumeMA5: volumeMA5[i],
          volumeMA10: volumeMA10[i],
        })
      );
      
      setKlines(enrichedData);
      setStats({
        symbol,
        lastPrice: mockKlines[mockKlines.length - 1].close,
        priceChangePercent: '0.00',
        highPrice: Math.max(...mockKlines.map(k => k.high)),
        lowPrice: Math.min(...mockKlines.map(k => k.low)),
        volume: mockKlines.reduce((sum, k) => sum + k.volume, 0),
      });
    } finally {
      setLoading(false);
    }
  }, [symbol, timeInterval, generateLocalMockData]);

  // 处理实时K线数据
  const handleRealTimeKline = useCallback((kline: any) => {
    setKlines(prevKlines => {
      if (prevKlines.length === 0) {
        return [kline];
      }
      
      let updatedKlines;
      // 检查是否是新的K线
      const lastKline = prevKlines[prevKlines.length - 1];
      if (kline.timestamp > lastKline.timestamp) {
        // 是新的K线，添加到数组末尾
        updatedKlines = [...prevKlines, kline];
      } else {
        // 更新最后一根K线
        updatedKlines = [...prevKlines];
        updatedKlines[updatedKlines.length - 1] = kline;
      }
      
      // 重新计算所有均线值，确保数据一致性
      const movingAverages = calculateMovingAverages(updatedKlines);
      const volumeMA5 = calculateMA(updatedKlines, 5);
      const volumeMA10 = calculateMA(updatedKlines, 10);
      
      // 增强所有K线数据
      return enrichKlineData(updatedKlines, movingAverages).map(
        (candle: any, i: number) => ({
          ...candle,
          volumeMA5: volumeMA5[i],
          volumeMA10: volumeMA10[i],
        })
      );
    });
    
    // 更新统计数据
    setStats((prevStats: any) => ({
      ...prevStats,
      lastPrice: kline.close,
      highPrice: Math.max(prevStats?.highPrice || kline.low, kline.high),
      lowPrice: Math.min(prevStats?.lowPrice || kline.high, kline.low),
    }));
  }, []);

  // 初始化WebSocket连接
  const initWebSocket = useCallback(() => {
    // 断开之前的连接
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
    }
    
    console.log('Initializing WebSocket connection for', symbol, 'with interval', timeInterval);
    
    // 创建新的WebSocket服务
    wsServiceRef.current = createBinanceWebSocketService(
      symbol,
      timeInterval,
      {
        onKline: handleRealTimeKline,
        onError: (error: Error) => {
          console.error('WebSocket error:', error);
          setIsWebSocketConnected(false);
          // 使用API获取的模拟数据作为后备
          console.log('Using API mock data as fallback');
        },
        onClose: () => {
          console.log('WebSocket connection closed');
          setIsWebSocketConnected(false);
        },
      }
    );
    
    // 连接WebSocket
    try {
      wsServiceRef.current.connect();
      setIsWebSocketConnected(true);
      console.log('WebSocket connection initiated');
    } catch (error) {
      console.error('Failed to initiate WebSocket connection:', error);
      setIsWebSocketConnected(false);
      // 使用API获取的模拟数据作为后备
      console.log('Using API mock data as fallback');
      // 确保有数据显示
      if (klines.length === 0) {
        fetchData();
      }
    }
  }, [symbol, timeInterval, handleRealTimeKline, fetchData, klines.length]);

  useEffect(() => {
    fetchData();
    initWebSocket();
    
    // 根据时间间隔设置自动更新频率
    const updateInterval = timeInterval === '1m' ? 10000 : // 1分钟K线：10秒更新一次
                          timeInterval === '15m' ? 30000 : // 15分钟K线：30秒更新一次
                          timeInterval === '1h' ? 60000 :  // 1小时K线：1分钟更新一次
                          timeInterval === '1d' ? 300000 : // 1天K线：5分钟更新一次
                          30000; // 30分钟K线：30秒更新一次
    
    const intervalId = setInterval(fetchData, updateInterval);
    
    return () => {
      clearInterval(intervalId);
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
      }
    };
  }, [fetchData, timeInterval, initWebSocket]);

  const lastCandle = klines[klines.length - 1];
  const currentMA5 = lastCandle?.ma5;
  const currentMA10 = lastCandle?.ma10;
  const currentMA30 = lastCandle?.ma30;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* 顶部选择器 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Binance {symbol}</h1>
            <span className="text-xl text-gray-400">Perpetual</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 bg-gray-900 rounded p-1">
              {['1m', '15m', '1h', '1d', '30m'].map((t) => (
                <Button
                  key={t}
                  onClick={() => setTimeInterval(t)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    timeInterval === t
                      ? 'bg-yellow-400 text-black'
                      : 'bg-transparent text-gray-400 hover:text-white'
                  }`}
                  variant="ghost"
                  size="sm"
                >
                  {t}
                </Button>
              ))}
            </div>
            <Button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* 左侧市场信息 - 在移动端放在顶部 */}
          <div className="lg:col-span-1">
            {stats && (
              <MarketInfo
                symbol={symbol}
                lastPrice={stats.lastPrice}
                priceChangePercent={stats.priceChangePercent}
                highPrice={stats.highPrice}
                lowPrice={stats.lowPrice}
                volume={stats.volume}
                ma5={currentMA5}
                ma10={currentMA10}
                ma30={currentMA30}
              />
            )}
          </div>

          {/* 中间图表区域 - 在移动端占满宽度 */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* K线图 */}
            <div className="bg-slate-950 rounded-lg overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-slate-700">
                <div className="text-sm font-semibold text-gray-300">
                  Price: ${lastCandle?.close?.toFixed(4)} 
                  <span className="ml-4 text-yellow-400">MA(5):{lastCandle?.ma5?.toFixed(2)}</span>
                  <span className="ml-2 text-green-400">MA(10):{lastCandle?.ma10?.toFixed(2)}</span>
                  <span className="ml-2 text-purple-400">MA(30):{lastCandle?.ma30?.toFixed(2)}</span>
                </div>
              </div>
              <CandlestickChart 
                data={klines} 
                width={1200} 
                height={350} 
                hoveredIndex={hoveredIndex}
                onHoverIndexChange={setHoveredIndex}
                enableMobileInteraction={true}
              />
            </div>

            {/* 成交量图 */}
            <div className="bg-slate-950 rounded-lg overflow-hidden">
              <div className="px-4 pt-4 pb-2 border-b border-slate-700">
                <div className="text-sm font-semibold text-gray-300">
                  Volume: {(lastCandle?.volume / 1e6).toFixed(2)}M
                </div>
              </div>
              <VolumeBarChart 
                data={klines} 
                width={1200} 
                height={120} 
                hoveredIndex={hoveredIndex}
                onHoverIndexChange={setHoveredIndex}
                enableMobileInteraction={true}
              />
            </div>
          </div>

          {/* 右侧指标面板 - 在移动端放在底部 */}
          <div className="lg:col-span-1">
            {stats && (
              <IndicatorsPanel
                fundingRate={funding}
                openInterest={Number(openInterest)}
                volume={stats.volume}
              />
            )}
          </div>
        </div>

        {/* 底部信息提示 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          实时市场数据模拟 • 每30秒更新一次
        </div>
      </div>
    </div>
  );
}
