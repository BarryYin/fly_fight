import { WebSocket, MessageEvent } from 'ws';

class MultiplayerManager {
  private socket: WebSocket | null = null;
  private serverUrl: string = '';  // 初始化为空字符串
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 3000; // 3秒后重试
  private players: Map<string, any>;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl + '/ws';  // 添加 /ws 路径
    this.players = new Map();
    this.connect();  // 直接调用 connect 而不是 initializeConnection
  }

  private connect(): void {
    try {
      this.socket = new WebSocket(this.serverUrl);
      
      this.socket.onopen = () => {
        console.log('已连接到服务器');
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = this.handleMessage.bind(this);
      
      this.socket.onerror = (error) => {
        console.error('WebSocket错误:', error);
      };

      this.socket.onclose = () => {
        console.log('连接已断开，尝试重新连接...');
        this.handleReconnect();
      };
    } catch (error) {
      console.error('连接失败:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectTimeout);
    } else {
      console.error('达到最大重连次数，请检查服务器状态');
    }
  }

  private handleMessage(event: MessageEvent): void {
    // 处理接收到的网络消息
  }

  public broadcastPosition(position: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未连接，无法发送数据');
      return;
    }
    // 广播当前玩家位置
  }
}

export default MultiplayerManager;
