// WebSocket服务，用于连接Binance API获取实时K线数据

interface WebSocketCallback {
  onKline: (kline: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

class BinanceWebSocketService {
  private ws: WebSocket | null = null;
  private symbol: string;
  private interval: string = '1h';
  private callbacks: WebSocketCallback;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private isManualDisconnect: boolean = false;

  constructor(symbol: string, interval: string, callbacks: WebSocketCallback) {
    // 直接存储原始symbol，不在构造函数中转换大小写
    this.symbol = symbol;
    this.interval = interval;
    this.callbacks = callbacks;
  }

  /**
   * 连接WebSocket
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // 重置手动断开标志，确保重连机制正常工作
      this.isManualDisconnect = false;
      
      // 确保symbol格式正确，Binance WebSocket API需要小写且不带特殊字符
      const formattedSymbol = this.symbol.replace('/', '').toLowerCase();
      // 确保interval格式正确
      const formattedInterval = this.interval;
      const wsUrl = `wss://fstream.binance.com/ws/${formattedSymbol}@kline_${formattedInterval}`;
      console.log('Connecting to Binance WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        console.log('Binance WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.k) {
            this.handleKlineData(data.k);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.callbacks.onError?.(error as Error);
        }
      };

      this.ws.onerror = (event) => {
        // WebSocket的onerror事件提供的是Event对象，不是直接的Error对象
        const error = event instanceof Error ? event : new Error('WebSocket connection error');
        console.error('Binance WebSocket error:', error);
        this.callbacks.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('Binance WebSocket closed');
        this.callbacks.onClose?.();
        // 只有在非手动断开的情况下才尝试重连
        if (!this.isManualDisconnect) {
          this.attemptReconnect();

        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.callbacks.onError?.(error as Error);
      this.attemptReconnect();
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect() {
    if (this.ws) {
      // 设置手动断开标志，避免触发重连
      this.isManualDisconnect = true;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 处理K线数据
   */
  private handleKlineData(kline: any) {
    const formattedKline = {
      time: new Date(kline.t).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: kline.t,
      open: parseFloat(kline.o),
      high: parseFloat(kline.h),
      low: parseFloat(kline.l),
      close: parseFloat(kline.c),
      volume: parseFloat(kline.v),
      quoteAssetVolume: parseFloat(kline.q),
      isFinal: kline.x,
    };

    this.callbacks.onKline(formattedKline);
  }

  /**
   * 尝试重连
   */
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // 指数退避
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        console.log('Reconnecting to Binance WebSocket...');
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnect attempts reached. Stopping reconnect.');
      // 通知回调连接失败
      this.callbacks.onError?.(new Error('Max WebSocket reconnect attempts reached'));
    }
  }

  /**
   * 获取当前连接状态
   */
  getReadyState() {
    return this.ws?.readyState;
  }
}

/**
 * 创建Binance WebSocket服务实例
 */
export function createBinanceWebSocketService(
  symbol: string,
  interval: string,
  callbacks: WebSocketCallback
) {
  return new BinanceWebSocketService(symbol, interval, callbacks);
}
