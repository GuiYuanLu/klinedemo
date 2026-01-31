
/**
 * 图表工具函数
 * 提供K线数据处理、技术指标计算和数据格式化功能
 */

/**
 * 计算移动平均线
 * @param data K线数据数组
 * @param period 周期（如5、10、30）
 * @returns 移动平均线数组，长度与输入数据相同
 */
export function calculateMA(data: any[], period: number) {
  return data.map((_, i) => {
    if (i < period - 1) return undefined;
    const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  });
}

/**
 * 计算所有需要的均线
 * @param klines K线数据数组
 * @returns 包含不同周期均线的对象
 */
export function calculateMovingAverages(klines: any[]) {
  return {
    ma5: calculateMA(klines, 5),    // 5日均线
    ma10: calculateMA(klines, 10),  // 10日均线
    ma30: calculateMA(klines, 30),  // 30日均线
  };
}

/**
 * 增强K线数据，添加均线和时间格式化
 * @param klines K线数据数组
 * @param movingAverages 移动平均线数据
 * @returns 增强后的K线数据数组
 */
export function enrichKlineData(klines: any[], movingAverages: any) {
  return klines.map((candle, index) => {
    const timeDate = new Date(candle.time);
    const timeStr = timeDate.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      ...candle,
      time: timeStr,              // 格式化后的时间字符串
      timestamp: candle.time,     // 时间戳
      timeValue: timeDate.getTime(), // 时间值（毫秒）
      ma5: movingAverages.ma5[index] ?? undefined,  // 5日均线
      ma10: movingAverages.ma10[index] ?? undefined, // 10日均线
      ma30: movingAverages.ma30[index] ?? undefined, // 30日均线
    };
  });
}

/**
 * 格式化价格
 * @param price 价格数值
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price: number, decimals: number = 2) {
  return price.toFixed(decimals);
}

/**
 * 格式化百分比
 * @param percent 百分比数值或字符串
 * @returns 格式化后的百分比字符串，带正负号
 */
export function formatPercent(percent: number | string) {
  const num = typeof percent === 'string' ? parseFloat(percent) : percent;
  if (isNaN(num)) return '0.00%';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

/**
 * 格式化大数字（用于成交量）
 * @param volume 成交量数值或字符串
 * @returns 格式化后的成交量字符串，使用K、M、B等单位
 */
export function formatVolume(volume: any) {
  // 确保volume是数字类型
  const numVolume = typeof volume === 'number' ? volume : parseFloat(volume);
  
  // 处理转换失败的情况
  if (isNaN(numVolume)) return '0.00';
  
  if (numVolume >= 1e9) return (numVolume / 1e9).toFixed(2) + 'B'; // 十亿
  if (numVolume >= 1e6) return (numVolume / 1e6).toFixed(2) + 'M'; // 百万
  if (numVolume >= 1e3) return (numVolume / 1e3).toFixed(2) + 'K'; // 千
  return numVolume.toFixed(2);
}
