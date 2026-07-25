import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import zlib from "zlib";
import { TelegramService } from '../telegram/TelegramService';

// Load environment variables
dotenv.config();

interface PriceData {
    symbol: string;
    price: number;
    timestamp: number;
}

export class BingXWebSocket {
    private ws: WebSocket | null = null;
    private readonly baseUrl: string;
    private readonly symbol: string;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number = Number.MAX_SAFE_INTEGER;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private pingInterval: NodeJS.Timeout | null = null;
    private readonly PING_INTERVAL = 30000; // 30 seconds
    private readonly RECONNECT_DELAY = 60000; // 1 minute
    private lastPongTime: number = Date.now();
    private onPriceUpdate: ((data: PriceData) => void) | null = null;

    constructor(symbol: string, onPriceUpdate?: (data: PriceData) => void) {
        this.baseUrl = process.env.BINGX_WS_URL || 'wss://open-api-swap.bingx.com/swap-market';
        this.symbol = symbol.toUpperCase();
        this.onPriceUpdate = onPriceUpdate || null;
    }

    public connect(): void {
        try {
            // Clean up old socket if reconnecting
            if (this.ws) {
                this.ws.removeAllListeners();
                try {
                    this.ws.close();
                } catch (_) {}
                this.ws = null;
            }

            this.ws = new WebSocket(this.baseUrl);

            this.ws.on('open', () => {
                console.log(`WebSocket connected for ${this.symbol}`);
                this.reconnectAttempts = 0;
                this.lastPongTime = Date.now();
                this.startPingInterval();
                this.subscribe();
            });

            this.ws.on('message', (data: WebSocket.RawData) => {
                this.handleRawMessage(data);
            });

            this.ws.on('error', (error: Error) => {
                console.error(`WebSocket error for ${this.symbol}:`, error);
                this.handleConnectionLoss();
            });

            this.ws.on('close', () => {
                console.log(`WebSocket connection closed for ${this.symbol}`);
                this.handleConnectionLoss();
            });

        } catch (error) {
            console.error(`Error connecting to WebSocket for ${this.symbol}:`, error);
            this.handleConnectionLoss();
        }
    }

    private handleRawMessage(data: WebSocket.RawData): void {
        try {
            const buffer = Buffer.from(data as Buffer);
            let decodedMsg: string;

            // Check for GZIP header magic bytes (0x1f 0x8b)
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

            // Handle text Heartbeats
            if (decodedMsg === "Ping") {
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send("Pong");
                }
                this.lastPongTime = Date.now();
                return;
            }
            if (decodedMsg === "Pong") {
                this.lastPongTime = Date.now();
                return;
            }

            // Parse JSON payload
            let obj: any;
            try {
                obj = JSON.parse(decodedMsg);
            } catch (parseError) {
                console.error('Failed to parse JSON message:', parseError);
                return;
            }

            // Handle JSON Heartbeats ({ "pong": ... } or { "ping": ... })
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
        // Clear any existing ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                // Send ping message
                const pingMessage = {
                    ping: Date.now()
                };
                this.ws.send(JSON.stringify(pingMessage));

                // Check if we haven't received a pong in the last 2 ping intervals
                const timeSinceLastPong = Date.now() - this.lastPongTime;
                if (timeSinceLastPong > this.PING_INTERVAL * 2) {
                    console.log(`No pong received for ${timeSinceLastPong}ms for ${this.symbol}, reconnecting...`);
                    this.handleConnectionLoss();
                }
            }
        }, this.PING_INTERVAL);
    }

    private lastInstabilityAlertTime: number = 0;
    private readonly ALERT_COOLDOWN_MS = 3600000; // 1 hour cooldown per symbol

    private calculateReconnectDelay(): number {
        const baseDelay = 10000; // 10 seconds initial delay
        const maxDelay = 300000;  // 5 minutes max delay
        const exponentialDelay = baseDelay * Math.pow(2, Math.max(0, this.reconnectAttempts - 1));
        return Math.min(exponentialDelay, maxDelay);
    }

    private handleConnectionLoss(): void {
        // Clear ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        // Clear any existing reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.removeAllListeners();
            try {
                this.ws.close();
            } catch (_) {}
            this.ws = null;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const reconnectDelay = this.calculateReconnectDelay();
            console.log(`Connection lost for ${this.symbol}. Attempting to reconnect in ${reconnectDelay / 1000}s... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            const now = Date.now();
            if (this.reconnectAttempts % 5 === 0 && (now - this.lastInstabilityAlertTime > this.ALERT_COOLDOWN_MS)) {
                this.lastInstabilityAlertTime = now;
                TelegramService.getInstance().sendCustomMessage(
                    `⚠️ <b>Instabilidade no WebSocket</b>\n\n` +
                    `O WebSocket do ativo <b>${this.symbol}</b> falhou ${this.reconnectAttempts} vezes seguidas e continua tentando reconectar.`
                ).catch(err => console.error('Error sending websocket instability notification', err));
            }

            this.reconnectTimeout = setTimeout(() => {
                this.connect();
            }, reconnectDelay);
        } else {
            console.error(`Max reconnection attempts reached for ${this.symbol}`);
        }
    }

    private subscribe(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Subscribe to ticker data for latest price
            const subscribeMessage = {
                id: `sub_${this.symbol}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                reqType: "sub",
                dataType: `${this.symbol}@lastPrice`,
                symbol: `${this.symbol}`
            };
            this.ws.send(JSON.stringify(subscribeMessage));
            
            console.log(`Subscribed to price updates for ${this.symbol}`);
        }
    }

    private handleMessage(message: any): void {
        try {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.error('WebSocket is not connected');
                return;
            }

            // Handle different message types
            if (message.data && message.data.c) {
                let currentPrice = parseFloat(message.data.c)            
                const priceData: PriceData = {
                    symbol: this.symbol,
                    price: currentPrice,
                    timestamp: Date.now(),
                };

                // Call the callback if provided
                if (this.onPriceUpdate) {
                    this.onPriceUpdate(priceData);
                }
            }
        } catch (error) {
            console.error('Error processing price message:', error);
        }
    }

    public disconnect(): void {
        // Clear ping interval
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        // Clear reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.removeAllListeners();
            try {
                this.ws.close();
            } catch (_) {}
            this.ws = null;
        }
    }

    public setPriceUpdateCallback(callback: (data: PriceData) => void): void {
        this.onPriceUpdate = callback;
    }


} 