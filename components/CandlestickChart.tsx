'use client';

import React from "react"

import { useEffect, useRef, useState, useCallback } from 'react';

interface CandlestickChartProps {
  data: any[];
  width?: number;
  height?: number;
  hoveredIndex?: number | null;
  onHoverIndexChange?: (index: number | null) => void;
  enableMobileInteraction?: boolean;
}

export function CandlestickChart({ 
  data, 
  width = 1200, 
  height = 400, 
  hoveredIndex: externalHoveredIndex, 
  onHoverIndexChange,
  enableMobileInteraction = true
}: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [localHoveredIndex, setLocalHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);
  
  // 移动端交互状态
  const [isTouching, setIsTouching] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [isLongPress, setIsLongPress] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 优先使用外部传入的hoveredIndex
  const currentHoveredIndex = externalHoveredIndex !== undefined ? externalHoveredIndex : localHoveredIndex;
  
  // 处理悬停索引变化
  const handleHoverIndexChange = useCallback((index: number | null) => {
    setLocalHoveredIndex(index);
    if (onHoverIndexChange) {
      onHoverIndexChange(index);
    }
  }, [onHoverIndexChange]);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 计算价格范围
    const prices = data.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // 清空画布
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    
    // 水平网格线
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 绘制蜡烛
    const candleWidth = Math.max(width / data.length * 0.6, 1.5);
    const spacing = width / data.length;
    const padding = 40;

    data.forEach((candle, index) => {
      const x = padding + index * spacing + spacing / 2;

      // 计算Y坐标
      const getY = (price: number) => {
        return height - ((price - minPrice) / priceRange) * (height - 20) - 10;
      };

      const yOpen = getY(candle.open);
      const yClose = getY(candle.close);
      const yHigh = getY(candle.high);
      const yLow = getY(candle.low);

      // 判断涨跌
      const isGreen = candle.close >= candle.open;
      const candleColor = isGreen ? '#10b981' : '#ef4444';

      // 如果鼠标悬停，绘制高亮背景和竖线
      if (currentHoveredIndex === index) {
        // 绘制竖线光标
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.setLineDash([]);

        // 绘制高亮背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(x - spacing / 2, 0, spacing, height);
      }

      // 绘制影线（wick）
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // 绘制蜡烛体
      ctx.fillStyle = candleColor;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.abs(yClose - yOpen) || 1;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // 蜡烛体边框
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // 绘制Y轴价格标签
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * (5 - i);
      const y = (height / 5) * i;
      ctx.fillText(price.toFixed(2), 35, y + 4);
    }

    // 绘制X轴时间标签（显示每第N个）
    ctx.textAlign = 'center';
    const labelInterval = Math.ceil(data.length / 10);
    
    data.forEach((candle, index) => {
      if (index % labelInterval === 0) {
        const x = padding + index * spacing + spacing / 2;
        ctx.fillText(candle.time.substring(5), x, height + 15);
      }
    });
  }, [data, width, height, currentHoveredIndex]);

  // 防抖函数
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  };

  // 防抖处理鼠标移动，减少不必要的渲染
  const debouncedHandleMouseMove = debounce((canvasX: number, canvasY: number, containerRect: DOMRect, e: React.MouseEvent<HTMLCanvasElement>) => {
    // 计算鼠标所在的蜡烛索引
    const padding = 40;
    const spacing = width / data.length;
    const index = Math.floor((canvasX - padding) / spacing);

    if (index >= 0 && index < data.length) {
      handleHoverIndexChange(index);
      
      // 计算 Tooltip 位置相对于容器
      const tooltipX = e.clientX - containerRect.left;
      const tooltipY = e.clientY - containerRect.top;
      setTooltipPos({ x: tooltipX, y: tooltipY });
    } else {
      handleHoverIndexChange(null);
      setTooltipPos(null);
    }
  }, 16); // 约60fps

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !data || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    setMouseCanvasPos({ x: canvasX, y: canvasY });
    
    // 使用防抖处理
    debouncedHandleMouseMove(canvasX, canvasY, containerRect, e);
  };

  const handleMouseLeave = () => {
    handleHoverIndexChange(null);
    setTooltipPos(null);
    setMouseCanvasPos(null);
  };

  // 处理触摸开始事件
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!enableMobileInteraction || !data || data.length === 0) return;
    
    e.preventDefault();
    setIsTouching(true);
    
    const touch = e.touches[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    const canvasX = touch.clientX - rect.left;
    const canvasY = touch.clientY - rect.top;
    
    setTouchStartPos({ x: canvasX, y: canvasY });
    setTouchStartTime(Date.now());
    
    // 设置长按检测
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPress(true);
      handleTouchMove(e);
    }, 500); // 500ms长按
  };

  // 处理触摸移动事件
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!enableMobileInteraction || !data || data.length === 0) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    const canvasX = touch.clientX - rect.left;
    const canvasY = touch.clientY - rect.top;
    
    setMouseCanvasPos({ x: canvasX, y: canvasY });
    
    // 计算鼠标所在的蜡烛索引
    const padding = 40;
    const spacing = width / data.length;
    const index = Math.floor((canvasX - padding) / spacing);
    
    if (index >= 0 && index < data.length) {
      handleHoverIndexChange(index);
      
      // 计算 Tooltip 位置相对于容器
      const containerRect = containerRef.current!.getBoundingClientRect();
      const tooltipX = touch.clientX - containerRect.left;
      const tooltipY = touch.clientY - containerRect.top;
      setTooltipPos({ x: tooltipX, y: tooltipY });
    } else {
      handleHoverIndexChange(null);
      setTooltipPos(null);
    }
  };

  // 处理触摸结束事件
  const handleTouchEnd = () => {
    if (!enableMobileInteraction) return;
    
    setIsTouching(false);
    setIsLongPress(false);
    
    // 清除长按检测
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    // 只有在非长按的情况下才隐藏十字光标
    if (!isLongPress) {
      handleHoverIndexChange(null);
      setTooltipPos(null);
      setMouseCanvasPos(null);
    }
  };

  // 处理触摸取消事件
  const handleTouchCancel = () => {
    if (!enableMobileInteraction) return;
    
    setIsTouching(false);
    setIsLongPress(false);
    
    // 清除长按检测
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    handleHoverIndexChange(null);
    setTooltipPos(null);
    setMouseCanvasPos(null);
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-gray-400">
        Loading chart data...
      </div>
    );
  }

  const hoveredCandle = currentHoveredIndex !== null ? data[currentHoveredIndex] : null;

  return (
    <div ref={containerRef} className="w-full bg-slate-900 rounded-lg p-0 relative overflow-hidden">
      <div className="relative" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* 隐藏滚动条 */}
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full border border-slate-700 rounded"
          style={{ 
            cursor: currentHoveredIndex !== null ? 'none' : 'crosshair',
            touchAction: enableMobileInteraction ? 'none' : 'auto'
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          // 移动端触摸事件
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        />
        
        {/* 竖线辅助线和十字光标 */}
        {mouseCanvasPos && currentHoveredIndex !== null && (
          <>
            {/* 竖线 */}
            <div
              className="absolute border-l border-gray-400 pointer-events-none"
              style={{
                left: `${mouseCanvasPos.x}px`,
                top: '0',
                height: `${height}px`,
                opacity: 0.5,
              }}
            />
            
            {/* 横线 */}
            <div
              className="absolute border-t border-gray-400 pointer-events-none"
              style={{
                top: `${mouseCanvasPos.y}px`,
                left: '0',
                width: `${width + 8}px`,
                opacity: 0.5,
              }}
            />
            
            {/* 十字中心圆点 */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${mouseCanvasPos.x}px`,
                top: `${mouseCanvasPos.y}px`,
                width: '12px',
                height: '12px',
                transform: 'translate(-50%, -50%)',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '50%',
                boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.8), inset 0 0 0 2px rgba(100, 200, 255, 0.4)',
              }}
            />
          </>
        )}
        
        {/* Tooltip */}
        {hoveredCandle && tooltipPos && (
          <div
            className="absolute bg-gray-950 border border-gray-600 rounded px-3 py-2 text-xs text-gray-100 pointer-events-none shadow-lg z-50"
            style={{
              left: `${tooltipPos.x + 15}px`,
              top: `${tooltipPos.y - 80}px`,
            }}
          >
            <div className="font-semibold text-white mb-2 border-b border-gray-700 pb-1">{hoveredCandle.time}</div>
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span>开:</span>
                <span className="text-yellow-400 font-mono">{hoveredCandle.open.toFixed(4)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>高:</span>
                <span className="text-green-400 font-mono">{hoveredCandle.high.toFixed(4)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>收:</span>
                <span className="text-cyan-400 font-mono">{hoveredCandle.close.toFixed(4)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>低:</span>
                <span className="text-red-400 font-mono">{hoveredCandle.low.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
