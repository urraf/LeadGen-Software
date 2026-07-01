import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
// @ts-ignore
import pkgMongo from 'wwebjs-mongo';
const { MongoStore } = pkgMongo;
import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { leadRepository } from '../repositories/LeadRepository.js';

type WhatsAppClient = InstanceType<typeof Client>;

interface WhatsAppInstance {
  client: WhatsAppClient | null;
  isReady: boolean;
  isAuthenticated: boolean;
  latestQRBase64: string | null;
  qrExpiryTimer: NodeJS.Timeout | null;
  initializationPromise: Promise<void> | null;
}

class WhatsAppService {
  private instances: Map<string, WhatsAppInstance> = new Map();

  private getInstance(userId: string): WhatsAppInstance {
    if (!this.instances.has(userId)) {
      this.instances.set(userId, {
        client: null,
        isReady: false,
        isAuthenticated: false,
        latestQRBase64: null,
        qrExpiryTimer: null,
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
      const store = new MongoStore({ mongoose: mongoose });

      const puppeteerEnv = { ...process.env };
      delete puppeteerEnv.ELECTRON_RUN_AS_NODE;

      instance.client = new Client({
        authStrategy: new LocalAuth({
          clientId: userId,
          dataPath: env.WHATSAPP_SESSION_PATH || './.wwebjs_auth'
        }),
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
        puppeteer: {
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
          env: puppeteerEnv,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions'
          ],
        },
      });

      instance.client.on('qr', async (qr: string) => {
        try {
          instance.latestQRBase64 = await QRCode.toDataURL(qr, { width: 300 });
          logger.info(`WhatsApp [${userId}]: new QR code generated — scan to authenticate`);
          
          // Expire the QR after 50s (WhatsApp typically refreshes them every 60s)
          if (instance.qrExpiryTimer) clearTimeout(instance.qrExpiryTimer);
          instance.qrExpiryTimer = setTimeout(() => {
            instance.latestQRBase64 = null;
            logger.info(`WhatsApp [${userId}]: QR code expired`);
          }, 50000);
        } catch (error) {
          logger.error(`WhatsApp [${userId}]: failed to generate QR base64:`, error);
        }
      });

      instance.client.on('ready', () => {
        instance.isReady = true;
        instance.isAuthenticated = true;
        instance.latestQRBase64 = null;
        if (instance.qrExpiryTimer) clearTimeout(instance.qrExpiryTimer);
        logger.info(`WhatsApp [${userId}]: client is ready`);
      });

      instance.client.on('authenticated', () => {
        instance.isAuthenticated = true;
        instance.latestQRBase64 = null;
        if (instance.qrExpiryTimer) clearTimeout(instance.qrExpiryTimer);
        logger.info(`WhatsApp [${userId}]: authenticated successfully, waiting for sync...`);
      });

      instance.client.on('remote_session_saved', () => {
        logger.info(`WhatsApp [${userId}]: remote session saved successfully to MongoDB`);
      });

      instance.client.on('auth_failure', (msg: string) => {
        instance.isReady = false;
        instance.isAuthenticated = false;
        logger.error(`WhatsApp [${userId}]: authentication failure:`, msg);
      });

      instance.client.on('disconnected', async (reason: string) => {
        instance.isReady = false;
        instance.isAuthenticated = false;
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
    } catch (error: any) {
      logger.error(`WhatsApp [${userId}]: failed to send message to ${phone}:`, error);
      
      // Auto-recover from dead client / detached frame errors
      if (error && error.message && (
          error.message.includes('detached Frame') || 
          error.message.includes('Execution context was destroyed') || 
          error.message.includes('Protocol error') ||
          error.message.includes('Session closed')
      )) {
        logger.warn(`WhatsApp [${userId}]: detecting dead client, forcing restart...`);
        this.destroy(userId).then(() => {
          this.initialize(userId).catch(e => logger.error(`Auto-restart failed for ${userId}:`, e));
        });
      }
      
      throw error;
    }
  }

  getStatus(userId: string): { ready: boolean; qr?: string; authenticated?: boolean } {
    const instance = this.getInstance(userId);
    return {
      ready: instance.isReady,
      authenticated: instance.isAuthenticated,
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
    if (instance.qrExpiryTimer) clearTimeout(instance.qrExpiryTimer);
    this.instances.delete(userId);
  }

  async destroyAll(): Promise<void> {
    for (const userId of this.instances.keys()) {
      await this.destroy(userId);
    }
  }
}

export const whatsappService = new WhatsAppService();
