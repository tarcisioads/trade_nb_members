import { BingXWebSocket } from '../src/infrastructure/bingx/BingXWebSocket';
import WebSocket from 'ws';
import zlib from 'zlib';

jest.mock('ws');

describe('BingXWebSocket', () => {
  let mockWs: any;
  let wsClient: BingXWebSocket;
  let priceCallbackMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    priceCallbackMock = jest.fn();

    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      removeAllListeners: jest.fn(),
      readyState: WebSocket.OPEN,
    };

    (WebSocket as unknown as jest.Mock).mockImplementation(() => mockWs);

    wsClient = new BingXWebSocket('BTCUSDT', priceCallbackMock);
  });

  afterEach(() => {
    wsClient.disconnect();
  });

  it('should connect and subscribe with dynamic request ID', () => {
    wsClient.connect();

    expect(WebSocket).toHaveBeenCalledWith('wss://open-api-swap.bingx.com/swap-market');
    expect(mockWs.on).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));

    // Simulate open event
    const openCallback = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'open')[1];
    openCallback();

    expect(mockWs.send).toHaveBeenCalled();
    const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
    expect(sentMessage.id).toMatch(/^sub_BTCUSDT_/);
    expect(sentMessage.dataType).toBe('BTCUSDT@lastPrice');
  });

  it('should handle uncompressed price update message', () => {
    wsClient.connect();
    const messageCallback = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')[1];

    const payload = JSON.stringify({
      data: {
        c: '95000.5',
      },
    });

    messageCallback(Buffer.from(payload));

    expect(priceCallbackMock).toHaveBeenCalledWith({
      symbol: 'BTCUSDT',
      price: 95000.5,
      timestamp: expect.any(Number),
    });
  });

  it('should handle GZIP compressed price update message', () => {
    wsClient.connect();
    const messageCallback = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')[1];

    const rawJson = JSON.stringify({
      data: {
        c: '96200.0',
      },
    });
    const compressed = zlib.gzipSync(Buffer.from(rawJson));

    messageCallback(compressed);

    expect(priceCallbackMock).toHaveBeenCalledWith({
      symbol: 'BTCUSDT',
      price: 96200.0,
      timestamp: expect.any(Number),
    });
  });

  it('should handle string Ping and reply with Pong without triggering price callback', () => {
    wsClient.connect();
    const messageCallback = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')[1];

    messageCallback(Buffer.from('Ping'));

    expect(mockWs.send).toHaveBeenCalledWith('Pong');
    expect(priceCallbackMock).not.toHaveBeenCalled();
  });

  it('should handle JSON Ping and reply with JSON Pong', () => {
    wsClient.connect();
    const messageCallback = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')[1];

    const pingPayload = JSON.stringify({ ping: 123456789 });
    messageCallback(Buffer.from(pingPayload));

    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ pong: 123456789 }));
    expect(priceCallbackMock).not.toHaveBeenCalled();
  });

  it('should handle JSON Pong without throwing error', () => {
    wsClient.connect();
    const messageCallback = mockWs.on.mock.calls.find((call: any[]) => call[0] === 'message')[1];

    const pongPayload = JSON.stringify({ pong: 123456789 });
    messageCallback(Buffer.from(pongPayload));

    expect(priceCallbackMock).not.toHaveBeenCalled();
  });

  it('should disconnect cleanly', () => {
    wsClient.connect();
    wsClient.disconnect();

    expect(mockWs.removeAllListeners).toHaveBeenCalled();
    expect(mockWs.close).toHaveBeenCalled();
  });

  it('should calculate exponential backoff delay correctly', () => {
    const calculateDelay = (wsClient as any).calculateReconnectDelay.bind(wsClient);

    (wsClient as any).reconnectAttempts = 1;
    expect(calculateDelay()).toBe(10000); // 10s

    (wsClient as any).reconnectAttempts = 2;
    expect(calculateDelay()).toBe(20000); // 20s

    (wsClient as any).reconnectAttempts = 3;
    expect(calculateDelay()).toBe(40000); // 40s

    (wsClient as any).reconnectAttempts = 4;
    expect(calculateDelay()).toBe(80000); // 80s

    (wsClient as any).reconnectAttempts = 7;
    expect(calculateDelay()).toBe(300000); // Capped at 5 min (300s)
  });
});
