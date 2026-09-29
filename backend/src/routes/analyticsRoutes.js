import { Router } from 'express';
import { authenticate, allowRoles } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/errors.js';
import { getAnalytics } from '../controllers/orderController.js';

const router = Router();
router.get('/farmer', authenticate, allowRoles('farmer'), asyncHandler(getAnalytics));
export default router;
