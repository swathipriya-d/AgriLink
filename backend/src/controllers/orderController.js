import { z } from 'zod';
import { createOrder, listOrdersFor, transitionOrder, listingAnalytics } from '../services/repository.js';

const createOrderSchema = z.object({
  items: z.array(z.object({ productId: z.string().trim().min(1).max(100), quantityKg: z.coerce.number().finite().min(0.25).max(100000) }).strict()).min(1).max(24),
  deliveryNote: z.string().trim().max(240).optional(),
}).strict();
const statusSchema = z.object({ status: z.enum(['confirmed', 'packing', 'ready', 'delivered', 'cancelled']) }).strict();

export async function placeOrder(req, res) {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Please review your order quantity and delivery note.', issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  const order = await createOrder(req.user, parsed.data);
  res.status(201).json({ success: true, data: { order }, message: 'Order request sent to the grower. No payment has been taken.' });
}

export async function listMyOrders(req, res) {
  const orders = await listOrdersFor(req.user);
  res.json({ success: true, data: { orders } });
}

export async function advanceOrder(req, res) {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'INVALID_STATUS', message: 'That order status is not available.' });
  const order = await transitionOrder(req.user, req.params.id, parsed.data.status);
  if (!order) return res.status(404).json({ success: false, code: 'ORDER_NOT_FOUND', message: 'This order was not found for your account.' });
  res.json({ success: true, data: { order }, message: order.status === 'cancelled' ? 'Order cancelled; the reserved stock has been returned.' : `Order moved to ${order.status}.` });
}

export async function getAnalytics(req, res) {
  const analytics = await listingAnalytics(req.user);
  res.json({ success: true, data: { analytics } });
}
