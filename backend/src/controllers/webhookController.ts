import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { catchAsync } from '../utils/helpers.js';
import { whatsappService } from '../services/WhatsAppService.js';

export const getWhatsAppStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const status = whatsappService.getStatus(req.userId!);
  // Auto-initialize disabled temporarily to save RAM on Render
  if (!status.ready && !status.qr) {
    whatsappService.initialize(req.userId!).catch(() => {});
  }
  res.json({ success: true, data: status });
});

export const resetWhatsApp = catchAsync(async (req: AuthRequest, res: Response) => {
  try {
    await whatsappService.destroy(req.userId!);
  } catch (e) {
    // ignore
  }
  
  // Re-initialize temporarily disabled
  whatsappService.initialize(req.userId!).catch(() => {});
  
  res.json({ success: true, message: 'WhatsApp reset initiated and re-connecting...' });
});
