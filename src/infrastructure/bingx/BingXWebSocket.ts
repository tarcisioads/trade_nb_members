import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import zlib from "zlib";

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
    private readonly maxReconnectAttempts: number = 5;
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
            this.ws = new WebSocket(this.baseUrl);

            this.ws.on('open', () => {
                console.log(`WebSocket connected for ${this.symbol}`);
                this.reconnectAttempts = 0;
                this.lastPongTime = Date.now();
                this.startPingInterval();
                this.subscribe();
            });

            this.ws.on('message', (data: WebSocket.RawData) => {
                try {
                    // Convert RawData to Buffer
                    const buffer = Buffer.from(data as Buffer);
                    let decodedMsg: string;

                    // First try to decode as plain text
                    decodedMsg = buffer.toString('utf-8');
                    
                    // Handle plain text messages first (Ping/Pong)
                    if (decodedMsg === "Ping" || decodedMsg === "Pong") {
                        this.lastPongTime = Date.now();
                        return;
                    }

                    // Try parsing as JSON
                    let obj: any;
                    try {
                        obj = JSON.parse(decodedMsg);
                    } catch (parseError) {
                        // If direct parsing fails, try decompressing
                        try {
                            const decompressed = zlib.gunzipSync(buffer).toString('utf-8');
                            // Check if decompressed message is Ping/Pong
                            if (decompressed === "Ping" || decompressed === "Pong") {
                                this.lastPongTime = Date.now();
                                return;
                            }
                            obj = JSON.parse(decompressed);
                        } catch (decompressError) {
                            console.error('Failed to parse or decompress message:', decompressError);
                            return;
                        }
                    }

                    this.handleMessage(obj);
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
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
                    console.log(`No pong received for ${timeSinceLastPong}ms, reconnecting...`);
                    this.handleConnectionLoss();
                }
            }
        }, this.PING_INTERVAL);
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
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Connection lost. Attempting to reconnect in 1 minute... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            this.reconnectTimeout = setTimeout(() => {
                this.connect();
            }, this.RECONNECT_DELAY);
        } else {
            console.error(`Max reconnection attempts reached for ${this.symbol}`);
        }
    }

    private subscribe(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            // Subscribe to ticker data for latest price
            const subscribeMessage = {
                //id: Date.now(),
                id: "24dd0e35-56a4-4f7a-af8a-394c7060909c",
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
            this.ws.close();
            this.ws = null;
        }
    }

    public setPriceUpdateCallback(callback: (data: PriceData) => void): void {
        this.onPriceUpdate = callback;
    }


} 