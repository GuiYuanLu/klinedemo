/**
 * 指标面板组件
 * 显示加密货币的资金费率、持仓量和24小时成交量等技术指标
 */

'use client';

import { formatVolume } from '@/lib/chartUtils';

interface IndicatorsPanelProps {
  fundingRate: number;    // 资金费率
  openInterest: number;   // 持仓量
  volume: number;         // 24小时成交量
}

/**
 * 指标面板组件
 * @param props 组件属性
 * @returns 指标面板UI
 */
export function IndicatorsPanel({ fundingRate, openInterest, volume }: IndicatorsPanelProps) {
  return (
    <div className="space-y-3">
      {/* 资金费率 */}
      <div className="bg-gray-900 rounded p-4 space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase">资金费率</div>
        <div className={`text-2xl font-bold ${fundingRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {(fundingRate * 100).toFixed(4)}%
        </div>
        <div className="text-xs text-gray-500">当前资金费率</div>
      </div>

      {/* 持仓量 */}
      <div className="bg-gray-900 rounded p-4 space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase">持仓量</div>
        <div className="text-2xl font-bold text-blue-400">
          {formatVolume(openInterest.toString())}
        </div>
        <div className="text-xs text-gray-500">总持仓量</div>
      </div>

      {/* 24小时成交量 */}
      <div className="bg-gray-900 rounded p-4 space-y-2">
        <div className="text-xs font-semibold text-gray-400 uppercase">24小时成交量</div>
        <div className="text-2xl font-bold text-cyan-400">
          {formatVolume(volume)}
        </div>
        <div className="text-xs text-gray-500">24小时交易量</div>
      </div>
    </div>
  );
}
