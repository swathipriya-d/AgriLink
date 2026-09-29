import { Router } from 'express';
import { z } from 'zod';
import { authenticate, allowRoles } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateParams } from '../middleware/validate.js';
import { placeOrder, listMyOrders, advanceOrder, getAnalytics } from '../controllers/orderController.js';

const router = Router();
const idParams = z.object({ id: z.string().trim().min(1).max(100) }).strict();
router.use(authenticate);
router.get('/analytics', allowRoles('farmer'), asyncHandler(getAnalytics));
router.get('/', asyncHandler(listMyOrders));
router.post('/', allowRoles('buyer'), asyncHandler(placeOrder));
router.patch('/:id/status', allowRoles('farmer'), validateParams(idParams), asyncHandler(advanceOrder));
router.patch('/:id/cancel', allowRoles('buyer'), validateParams(idParams), asyncHandler(advanceOrder));
export default router;
