import { Router } from 'express';
import { login, register, demoSession, currentSession } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/demo-session', asyncHandler(demoSession));
router.get('/me', authenticate, asyncHandler(currentSession));

export default router;
