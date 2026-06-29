import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { leadRepository } from '../repositories/LeadRepository.js';

type WhatsAppClient = InstanceType<typeof Client>;

interface WhatsAppInstance {
  client: WhatsAppClient | null;
  isReady: boolean;
  latestQRBase64: string | null;
  initializationPromise: Promise<void> | null;
}

class WhatsAppService {
  private instances: Map<string, WhatsAppInstance> = new Map();

  private getInstance(userId: string): WhatsAppInstance {
    if (!this.instances.has(userId)) {
      this.instances.set(userId, {
        client: null,
        isReady: false,
        latestQRBase64: null,
        initializationPromise: null,
      });
    }
    return this.instances.get(userId)!;
  }

  async initialize(userId: string): Promise<void> {
    const instance = this.getInstance(userId);
    if (instance.initializationPromise) return instance.initializationPromise;

    instance.initializationPromise = this.doInitialize(userId, instance);
    return instance.initializationPromise;
  }

  private async doInitialize(userId: string, instance: WhatsAppInstance): Promise<void> {
    try {
      instance.client = new Client({
        authStrategy: new LocalAuth({
          clientId: userId,
          dataPath: env.WHATSAPP_SESSION_PATH,
        }),
        puppeteer: {
          executablePath: puppeteer.executablePath(),
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      instance.client.on('qr', async (qr: string) => {
        try {
          instance.latestQRBase64 = await QRCode.toDataURL(qr, { width: 300 });
          logger.info(`WhatsApp [${userId}]: new QR code generated — scan to authenticate`);
        } catch (error) {
          logger.error(`WhatsApp [${userId}]: failed to generate QR base64:`, error);
        }
      });

      instance.client.on('ready', () => {
        instance.isReady = true;
        instance.latestQRBase64 = null;
        logger.info(`WhatsApp [${userId}]: client is ready`);
      });

      instance.client.on('authenticated', () => {
        logger.info(`WhatsApp [${userId}]: authenticated successfully`);
      });

      instance.client.on('auth_failure', (msg: string) => {
        instance.isReady = false;
        logger.error(`WhatsApp [${userId}]: authentication failure:`, msg);
      });

      instance.client.on('disconnected', async (reason: string) => {
        instance.isReady = false;
        logger.warn(`WhatsApp [${userId}]: disconnected:`, reason);
        try {
          await instance.client?.destroy();
        } catch (e) {
          // ignore
        }
        instance.client = null;
        instance.initializationPromise = null;
        logger.info(`WhatsApp [${userId}]: attempting to reconnect...`);
        this.initialize(userId).catch(err => logger.error(`WhatsApp [${userId}] reconnect failed`, err));
      });

      instance.client.on('message', async (msg: { from: string; body: string }) => {
        try {
          // Extract phone number (remove @c.us suffix)
          const phone = '+' + msg.from.replace('@c.us', '');
          logger.info(`WhatsApp [${userId}]: incoming message from ${phone}`);

          // Update lead status to REPLIED
          const lead = await leadRepository.updateStatusByPhone(userId, phone, 'REPLIED');
          if (lead) {
            logger.info(`Lead "${lead.businessName}" status updated to REPLIED by User ${userId}`);
          }
        } catch (error) {
          logger.error(`WhatsApp [${userId}]: error handling incoming message:`, error);
        }
      });

      await instance.client.initialize();
      logger.info(`WhatsApp [${userId}]: client initialization started`);
    } catch (error) {
      logger.error(`WhatsApp [${userId}]: failed to initialize client:`, error);
      instance.initializationPromise = null;
    }
  }

  async sendMessage(userId: string, phone: string, content: string): Promise<string> {
    const instance = this.getInstance(userId);

    if (!instance.client || !instance.isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    const numberToCheck = phone.replace('+', '');

    try {
      // Validate number and resolve proper LID/JID mapping first
      const numberId = await instance.client.getNumberId(numberToCheck);
      if (!numberId) {
        throw new Error('This phone number is not registered on WhatsApp');
      }

      const msg = await instance.client.sendMessage(numberId._serialized, content);
      const messageId = (msg.id as { _serialized?: string })?._serialized || String(msg.id);
      logger.info(`WhatsApp [${userId}]: message sent to ${phone}, id=${messageId}`);
      return messageId;
    } catch (error) {
      logger.error(`WhatsApp [${userId}]: failed to send message to ${phone}:`, error);
      throw error;
    }
  }

  getStatus(userId: string): { ready: boolean; qr?: string } {
    const instance = this.getInstance(userId);
    return {
      ready: instance.isReady,
      ...(instance.latestQRBase64 && !instance.isReady ? { qr: instance.latestQRBase64 } : {}),
    };
  }

  getIsReady(userId: string): boolean {
    return this.getInstance(userId).isReady;
  }

  async destroy(userId: string): Promise<void> {
    const instance = this.instances.get(userId);
    if (!instance) return;

    if (instance.client) {
      try {
        await instance.client.destroy();
        logger.info(`WhatsApp [${userId}]: client destroyed`);
      } catch (error) {
        logger.error(`WhatsApp [${userId}]: error destroying client:`, error);
      }
    }
    this.instances.delete(userId);
  }

  async destroyAll(): Promise<void> {
    for (const userId of this.instances.keys()) {
      await this.destroy(userId);
    }
  }
}

export const whatsappService = new WhatsAppService();
