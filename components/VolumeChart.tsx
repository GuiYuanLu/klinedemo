'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface VolumeChartProps {
  data: any[];
  showMA?: boolean;
}

export function VolumeChart({ data, showMA = true }: VolumeChartProps) {
  // 验证数据
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-gray-400">
        Loading volume data...
      </div>
    );
  }

  // 过滤有效数据
  const validData = data.filter(d => d && typeof d.volume === 'number');
  
  if (validData.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-gray-400">
        No valid volume data
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%" minHeight={120}>
        <ComposedChart data={validData} margin={{ top: 5, right: 10, left: 40, bottom: 5 }} syncId="charts">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            stroke="rgba(255,255,255,0.5)"
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            stroke="rgba(255,255,255,0.5)"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
            }}
            formatter={(value: any) => {
              if (typeof value === 'number') {
                if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
                if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
                if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
              }
              return value;
            }}
          />
          {/* 成交量柱状图 */}
          <Bar 
            yAxisId="right"
            dataKey="volume" 
            fill="rgba(16, 185, 129, 0.6)"
            isAnimationActive={false}
            name="Volume"
          />
          
          {/* 成交量均线 */}
          {showMA && (
            <>
              {validData.some((d: any) => typeof d.volumeMA5 === 'number') && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="volumeMA5" 
                  stroke="#f59e0b" 
                  dot={false} 
                  isAnimationActive={false}
                  strokeWidth={1}
                  name="VolumeMA(5)"
                  connectNulls={true}
                />
              )}
              {validData.some((d: any) => typeof d.volumeMA10 === 'number') && (
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="volumeMA10" 
                  stroke="#10b981" 
                  dot={false} 
                  isAnimationActive={false}
                  strokeWidth={1}
                  name="VolumeMA(10)"
                  connectNulls={true}
                />
              )}
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
