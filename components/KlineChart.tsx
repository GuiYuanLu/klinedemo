'use client';

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface KlineChartProps {
  data: any[];
  showMA?: boolean;
}

export function KlineChart({ data, showMA = true }: KlineChartProps) {
  // 验证数据
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-gray-400">
        Loading chart data...
      </div>
    );
  }

  // 验证数据中有有效的高低点
  const validData = data.filter(d => d && typeof d.high === 'number' && typeof d.low === 'number' && typeof d.close === 'number');
  
  if (validData.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-gray-400">
        No valid chart data
      </div>
    );
  }

  const minPrice = Math.min(...validData.map((d) => d.low || 0));
  const maxPrice = Math.max(...validData.map((d) => d.high || 0));
  const priceRange = Math.max(maxPrice - minPrice, 1);

  // 检查是否有任何均线数据
  const hasMA = validData.some((d: any) => 
    typeof d.ma5 === 'number' || typeof d.ma10 === 'number' || typeof d.ma30 === 'number'
  );

  return (
    <div className="w-full h-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <ComposedChart 
          data={validData} 
          margin={{ top: 10, right: 10, left: 40, bottom: 10 }}
          syncId="charts"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 12 }}
            stroke="rgba(255,255,255,0.5)"
            interval={Math.max(0, Math.floor(validData.length / 12))}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            stroke="rgba(255,255,255,0.5)"
            domain={[minPrice, maxPrice]}
            type="number"
            label={{ value: 'Price', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              padding: '8px',
            }}
            formatter={(value: any) => {
              if (typeof value === 'number') {
                return value.toFixed(4);
              }
              return value;
            }}
            labelFormatter={(label) => `${label}`}
          />
          
          {hasMA && showMA && <Legend wrapperStyle={{ paddingTop: '10px' }} />}
          
          {/* 价格范围展示 */}
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="low" 
            fill="rgba(107, 114, 128, 0.1)"
            stroke="none"
            isAnimationActive={false}
            name="Low-High Range"
          />
          
          {/* 收盘价线 */}
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="close" 
            stroke="rgba(255, 255, 255, 0.5)" 
            dot={false} 
            isAnimationActive={false}
            name="Close Price"
            strokeWidth={1}
          />
          
          {/* 移动平均线 */}
          {showMA && (
            <>
              {validData.some((d: any) => typeof d.ma5 === 'number') && (
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="ma5" 
                  stroke="#f59e0b" 
                  dot={false} 
                  isAnimationActive={false}
                  name="MA(5)" 
                  connectNulls={true}
                  strokeWidth={2}
                />
              )}
              {validData.some((d: any) => typeof d.ma10 === 'number') && (
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="ma10" 
                  stroke="#10b981" 
                  dot={false} 
                  isAnimationActive={false}
                  name="MA(10)" 
                  connectNulls={true}
                  strokeWidth={2}
                />
              )}
              {validData.some((d: any) => typeof d.ma30 === 'number') && (
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="ma30" 
                  stroke="#a855f7" 
                  dot={false} 
                  isAnimationActive={false}
                  name="MA(30)" 
                  connectNulls={true}
                  strokeWidth={2}
                />
              )}
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
