/**
 * 市场信息组件
 * 显示加密货币的当前价格、涨跌幅、24小时数据和移动平均线
 */

'use client';

import { formatPrice, formatPercent, formatVolume } from '@/lib/chartUtils';

interface MarketInfoProps {
  symbol: string;           // 交易对
  lastPrice: number;        // 当前价格
  priceChangePercent: number | string; // 涨跌幅
  highPrice: number;        // 24小时最高价
  lowPrice: number;         // 24小时最低价
  volume: number;           // 24小时成交量
  ma5?: number;             // 5日均线
  ma10?: number;            // 10日均线
  ma30?: number;            // 30日均线
}

/**
 * 市场信息组件
 * @param props 组件属性
 * @returns 市场信息UI
 */
export function MarketInfo({
  symbol,
  lastPrice,
  priceChangePercent,
  highPrice,
  lowPrice,
  volume,
  ma5,
  ma10,
  ma30,
}: MarketInfoProps) {
  // 判断涨跌幅是否为正
  const isPositive = typeof priceChangePercent === 'string' ? parseFloat(priceChangePercent) >= 0 : priceChangePercent >= 0;

  return (
    <div className="space-y-4">
      {/* 头部价格信息 */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-4">
          <div className="text-5xl font-bold text-green-400">{formatPrice(lastPrice, 2)}</div>
          <div className={`text-2xl font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(priceChangePercent)}
          </div>
        </div>
        <div className="text-xs text-gray-400">${formatPrice(lastPrice, 2)}</div>
      </div>

      {/* 24小时数据 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">24小时最高</div>
          <div className="text-lg font-semibold text-white">{formatPrice(highPrice, 2)}</div>
        </div>
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">24小时最低</div>
          <div className="text-lg font-semibold text-white">{formatPrice(lowPrice, 2)}</div>
        </div>
        <div className="bg-gray-900 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">24小时成交量</div>
          <div className="text-lg font-semibold text-white">{formatVolume(volume)}</div>
        </div>
      </div>

      {/* 均线数据 */}
      {(ma5 !== undefined || ma10 !== undefined || ma30 !== undefined) && (
        <div className="bg-gray-900 rounded p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase">移动平均线</div>
          <div className="grid grid-cols-3 gap-3">
            {ma5 !== undefined && (
              <div>
                <div className="text-xs text-yellow-400 font-semibold">MA(5)</div>
                <div className="text-sm text-white">{formatPrice(ma5, 2)}</div>
              </div>
            )}
            {ma10 !== undefined && (
              <div>
                <div className="text-xs text-green-400 font-semibold">MA(10)</div>
                <div className="text-sm text-white">{formatPrice(ma10, 2)}</div>
              </div>
            )}
            {ma30 !== undefined && (
              <div>
                <div className="text-xs text-purple-400 font-semibold">MA(30)</div>
                <div className="text-sm text-white">{formatPrice(ma30, 2)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
