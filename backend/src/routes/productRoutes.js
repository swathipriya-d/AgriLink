import { Router } from 'express';
import { z } from 'zod';
import { authenticate, allowRoles } from '../middleware/authenticate.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { browseProducts, readProduct, addProduct, updateProduct, removeProduct, pendingProducts, moderateProduct } from '../controllers/productController.js';

const router = Router();
const idParams = z.object({ id: z.string().trim().min(1).max(100) }).strict();
const review = z.object({ status: z.enum(['verified', 'rejected']) }).strict();

router.get('/', asyncHandler(browseProducts));
router.get('/review-queue', authenticate, allowRoles('admin'), asyncHandler(pendingProducts));
router.patch('/:id/verification', authenticate, allowRoles('admin'), validateParams(idParams), validateBody(review), asyncHandler(moderateProduct));
router.get('/:id', validateParams(idParams), asyncHandler(readProduct));
router.post('/', authenticate, allowRoles('farmer'), asyncHandler(addProduct));
router.patch('/:id', authenticate, allowRoles('farmer'), validateParams(idParams), asyncHandler(updateProduct));
router.delete('/:id', authenticate, allowRoles('farmer'), validateParams(idParams), asyncHandler(removeProduct));

export default router;
