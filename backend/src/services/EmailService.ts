import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

class EmailService {
  private transporter: Transporter | null = null;

  initialize(): void {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      logger.warn('Email: SMTP not configured — email outreach disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    logger.info(`Email: SMTP configured (${env.SMTP_HOST}:${env.SMTP_PORT})`);
  }

  getIsReady(): boolean {
    return this.transporter !== null;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<string> {
    if (!this.transporter) {
      throw new Error('Email is not configured — add SMTP_HOST, SMTP_USER, and SMTP_PASS to your .env file');
    }

    const from = env.SMTP_FROM || env.SMTP_USER;

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text: body,
      });

      const messageId = info.messageId || String(info.response);
      logger.info(`Email: sent to ${to}, messageId=${messageId}`);
      return messageId;
    } catch (error) {
      logger.error(`Email: failed to send to ${to}:`, error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
