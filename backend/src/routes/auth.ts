import { Router } from 'express';
import { login, register, refresh, logout, me, updateProfile } from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema } from '../schemas/authSchemas.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/register', authLimiter, register);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);
router.put('/profile', authMiddleware, updateProfile);

export default router;
