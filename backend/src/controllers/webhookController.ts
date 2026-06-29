import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { catchAsync } from '../utils/helpers.js';
import { whatsappService } from '../services/WhatsAppService.js';

export const getWhatsAppStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const status = whatsappService.getStatus(req.userId!);
  // Auto-initialize if not ready and no QR is pending
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
  
  // Re-initialize
  whatsappService.initialize(req.userId!).catch(() => {});
  
  res.json({ success: true, message: 'WhatsApp reset initiated' });
});
