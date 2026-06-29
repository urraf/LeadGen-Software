import { Router } from 'express';
import { getWhatsAppStatus, resetWhatsApp } from '../controllers/webhookController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/whatsapp/status', authMiddleware, getWhatsAppStatus);
router.post('/whatsapp/reset', authMiddleware, resetWhatsApp);

export default router;
