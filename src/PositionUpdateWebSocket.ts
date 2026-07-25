import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import zlib from 'zlib';

dotenv.config();

export interface PositionData {
  s: string; // Symbol
  pa: string; // Position Amount
  ep: string; // Entry Price
  cr: string; // Accumulated Realized PnL
  up: string; // Unrealized PnL
  mt: string; // Margin Type
  iw: string; // Isolated Wallet
  ps: string; // Position Side
}

export interface PositionUpdateEvent {
  e: 'POSITION_UPDATE';
  E: number; // Event time
  T: number; // Transaction time
  p: PositionData[];
}

export class PositionUpdateWebSocket {
  private ws: WebSocket | null = null;
  private readonly baseUrl: string;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly RECONNECT_DELAY = 60000; // 1 minute
  private lastPongTime: number = Date.now();
  private onPositionUpdate: ((data: PositionUpdateEvent) => void) | null = null;

  constructor(listenKey: string, onPositionUpdate?: (data: PositionUpdateEvent) => void) {
    if (!listenKey) {
      throw new Error('listenKey is required for PositionUpdateWebSocket');
    }
    this.baseUrl = `wss://open-api-swap.bingx.com/swap-user?listenKey=${listenKey}`;
    this.onPositionUpdate = onPositionUpdate || null;
  }

  public connect(): void {
    try {
      if (this.ws) {
        this.ws.removeAllListeners();
        try {
          this.ws.close();
        } catch (_) {
          // ignore
        }
        this.ws = null;
      }

      this.ws = new WebSocket(this.baseUrl);

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        this.lastPongTime = Date.now();
        this.startPingInterval();
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        this.handleRawMessage(data);
      });

      this.ws.on('error', (error: Error) => {
        console.error('PositionUpdateWebSocket error:', error);
        this.handleConnectionLoss();
      });

      this.ws.on('close', (code: number, reason: Buffer) => {
        this.handleConnectionLoss();
      });
    } catch (error) {
      console.error('Error connecting to PositionUpdateWebSocket:', error);
      this.handleConnectionLoss();
    }
  }

  private handleRawMessage(data: WebSocket.RawData): void {
    try {
      const buffer = Buffer.from(data as Buffer);
      let decodedMsg: string;

      if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
        try {
          decodedMsg = zlib.gunzipSync(buffer).toString('utf-8');
        } catch (decompressError) {
          console.error('Failed to decompress GZIP message:', decompressError);
          return;
        }
      } else {
        decodedMsg = buffer.toString('utf-8');
      }

      if (decodedMsg === 'Ping') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send('Pong');
        }
        this.lastPongTime = Date.now();
        return;
      }
      if (decodedMsg === 'Pong') {
        this.lastPongTime = Date.now();
        return;
      }

      let obj: any;
      try {
        obj = JSON.parse(decodedMsg);
      } catch (parseError) {
        console.error('Failed to parse JSON message:', parseError);
        return;
      }

      if (obj.pong !== undefined || obj.ping !== undefined) {
        if (obj.ping !== undefined && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ pong: obj.ping }));
        }
        this.lastPongTime = Date.now();
        return;
      }

      this.handleMessage(obj);
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('Ping');

        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > this.PING_INTERVAL * 2) {
          this.handleConnectionLoss();
        }
      }
    }, this.PING_INTERVAL);
  }

  private handleConnectionLoss(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      try {
        this.ws.close();
      } catch (_) {
        // ignore
      }
      this.ws = null;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, this.RECONNECT_DELAY);
    } else {
      console.error('Max reconnection attempts reached for PositionUpdateWebSocket');
    }
  }

  private handleMessage(message: any): void {
    try {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not connected');
        return;
      }

      if (message.e === 'POSITION_UPDATE') {
        if (this.onPositionUpdate) {
          this.onPositionUpdate(message as PositionUpdateEvent);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  public disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      try {
        this.ws.close();
      } catch (_) {
        // ignore
      }
      this.ws = null;
    }
  }

  public setPositionUpdateCallback(callback: (data: PositionUpdateEvent) => void): void {
    this.onPositionUpdate = callback;
  }
}
