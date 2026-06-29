import { Router } from 'express';
import { getMessages, sendMessage, triggerFollowUp } from '../controllers/messageController.js';
import { validate } from '../middlewares/validate.js';
import { sendMessageSchema, followUpSchema } from '../schemas/messageSchemas.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getMessages);
router.post('/send', validate(sendMessageSchema), sendMessage);
router.post('/followup', validate(followUpSchema), triggerFollowUp);

export default router;
