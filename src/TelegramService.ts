import TelegramBot from 'node-telegram-bot-api';
import { TradeNotification } from './utils/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class TelegramService {
  private readonly bot?: TelegramBot;
  private readonly chatId: string;
  private static instance: TelegramService;

  private constructor() {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;

    if (!telegramToken || !telegramChatId) {
      console.warn('Telegram configuration not found in .env file. Telegram notifications will be disabled.');
      console.warn('Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your .env file.');
      this.chatId = '';
    } else {
      this.chatId = telegramChatId;
      this.bot = new TelegramBot(telegramToken, { polling: false });
      console.log('Telegram service initialized successfully');
    }
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  public isConfigured(): boolean {
    return !!this.bot && !!this.chatId;
  }

  private async sendMessage(message: string): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Telegram service is not properly configured. Skipping notification.');
      return;
    }

    try {
      await this.bot!.sendMessage(this.chatId, message, { parse_mode: 'HTML' });
      console.log('Telegram notification sent successfully');
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
      throw error;
    }
  }

  private formatTradeMessage(trade: TradeNotification): string {
    const direction = trade.type === 'LONG' ? '🟢 LONG' : '🔴 SHORT';
    const status = trade.isWarning ? '⚠️ AVISO' : '✅ TRADE';
    const validationStatus = trade.validation.isValid ? '✅ Válido' : '❌ Inválido';

    let message = `
<b>🚨 ${status} - ${direction}</b>

📊 Par: ${trade.symbol}
💰 Entrada: ${trade.entry}
🛑 Stop: ${trade.stop}
🎯 Take Profits:
   TP1: ${trade.takeProfits.tp1}
   ${trade.takeProfits.tp2 ? `TP2: ${trade.takeProfits.tp2}` : ''}
   ${trade.takeProfits.tp3 ? `TP3: ${trade.takeProfits.tp3}` : ''}
   ${trade.takeProfits.tp4 ? `TP4: ${trade.takeProfits.tp4}` : ''}
   ${trade.takeProfits.tp5 ? `TP5: ${trade.takeProfits.tp5}` : ''}
   ${trade.takeProfits.tp6 ? `TP6: ${trade.takeProfits.tp6}` : ''}

⏰ Intervalo: ${trade.interval || '1h'}
🕒 Timestamp: ${new Date(trade.timestamp).toLocaleString()}
📊 Status: ${validationStatus}

${trade.validation.message ? `\n📝 Mensagem: ${trade.validation.message}` : ''}
${trade.setup_description ? `\n📋 Setup: ${trade.setup_description}` : ''}
${trade.executionError ? `\n❌ Erro: ${trade.executionError}` : ''}
${trade.executionResult ? `
✅ Trade Executado:
   Alavancagem: ${trade.executionResult.leverage}x
   Quantidade: ${trade.executionResult.quantity}
   ${trade.executionResult.volumeMarginAdded ? `
   Volume Margem Adicional: ${trade.executionResult.volumeMarginAdded.percentage}%
    ` : ''}
  ${trade.executionResult.sentimentMarginAdded ? `
   Sentiment Margem Adicional: ${trade.executionResult.sentimentMarginAdded.percentage}%
    ` : ''}
` : ''}

${trade.analysisUrl ? `\n🔍 <a href="${trade.analysisUrl}">Ver Análise</a>` : ''}
        `.trim();

    return message;
  }

  public async sendTradeNotification(trade: TradeNotification): Promise<void> {
    const message = this.formatTradeMessage(trade);
    await this.sendMessage(message);
  }

  public async sendCustomMessage(message: string): Promise<void> {
    await this.sendMessage(message);
  }
} 
