import { Router } from 'express';
import { z } from 'zod';
import { authenticate, allowRoles } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { submitVerification, readMyVerification, readVerificationQueue, decideVerification } from '../controllers/verificationController.js';

const router = Router();
const id = z.object({ id: z.string().trim().min(1).max(100) }).strict();
const verification = z.object({
  farmName: z.string().trim().min(2).max(100), district: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80), crops: z.array(z.string().trim().min(2).max(56)).min(1).max(12),
  practices: z.string().trim().max(240).optional(), growerNote: z.string().trim().max(640).optional(),
}).strict();
const review = z.object({ status: z.enum(['verified', 'rejected']), reviewNote: z.string().trim().max(500).optional() }).strict();

router.use(authenticate);
router.get('/queue', allowRoles('admin'), asyncHandler(readVerificationQueue));
router.patch('/:id/review', allowRoles('admin'), validateParams(id), validateBody(review), asyncHandler(decideVerification));
router.get('/me', allowRoles('farmer'), asyncHandler(readMyVerification));
router.post('/', allowRoles('farmer'), validateBody(verification), asyncHandler(submitVerification));
export default router;
