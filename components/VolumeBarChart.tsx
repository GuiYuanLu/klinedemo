'use client';

import React from "react"

import { useEffect, useRef, useState, useCallback } from 'react';

interface VolumeBarChartProps {
  data: any[];
  width?: number;
  height?: number;
  hoveredIndex?: number | null;
  onHoverIndexChange?: (index: number | null) => void;
  enableMobileInteraction?: boolean;
}

export function VolumeBarChart({ 
  data, 
  width = 1200, 
  height = 150, 
  hoveredIndex: externalHoveredIndex, 
  onHoverIndexChange,
  enableMobileInteraction = true
}: VolumeBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [localHoveredIndex, setLocalHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  
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

    // 计算成交量范围
    const volumes = data.map(d => d.volume || 0);
    const maxVolume = Math.max(...volumes);

    // 清空画布
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // 绘制网格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 绘制成交量柱
    const barWidth = Math.max(width / data.length * 0.7, 1);
    const spacing = width / data.length;
    const padding = 40;

    data.forEach((candle, index) => {
      const x = padding + index * spacing + spacing / 2;
      const volumeHeight = (candle.volume / maxVolume) * (height - 40);
      const y = height - 20 - volumeHeight;

      // 判断涨跌来决定颜色
      const isGreen = candle.close >= candle.open;
      const barColor = isGreen 
        ? 'rgba(16, 185, 129, 0.5)' // 绿色半透明
        : 'rgba(239, 68, 68, 0.5)';  // 红色半透明

      // 如果鼠标悬停，高亮显示并更改透明度
      if (currentHoveredIndex === index) {
        ctx.fillStyle = isGreen 
          ? 'rgba(16, 185, 129, 1)' // 完全不透明绿色
          : 'rgba(239, 68, 68, 1)';  // 完全不透明红色
      } else {
        ctx.fillStyle = barColor;
      }

      // 绘制柱子
      ctx.fillRect(x - barWidth / 2, y, barWidth, volumeHeight);

      // 如果悬停则加边框
      if (currentHoveredIndex === index) {
        ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - barWidth / 2, y, barWidth, volumeHeight);
      }
    });

    // 绘制Y轴成交量标签
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText((maxVolume / 1e6).toFixed(1) + 'M', 35, 15);
    ctx.fillText((maxVolume / 2 / 1e6).toFixed(1) + 'M', 35, height / 2 + 5);
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
    // 计算鼠标所在的柱索引
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
      <div className="w-full h-32 flex items-center justify-center text-gray-400">
        Loading volume data...
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
              top: `${tooltipPos.y - 60}px`,
            }}
          >
            <div className="font-semibold text-white mb-1">{hoveredCandle.time}</div>
            <div className="space-y-1">
              <div>成交量: <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-green-400' : 'text-red-400'}>
                {(hoveredCandle.volume / 1e6).toFixed(2)}M
              </span></div>
              <div>金额: <span className="text-blue-400">${(hoveredCandle.quoteAssetVolume / 1e6).toFixed(2)}M</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
