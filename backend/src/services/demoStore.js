import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DEMO_SELLERS, INITIAL_PRODUCTS } from '../../../frontend/src/data/market.js';

export const demoStore = {
  users: new Map(),
  products: new Map(),
  orders: new Map(),
  verifications: new Map(),
};

const sampleAccounts = [
  { _id: DEMO_SELLERS[0].id, fullName: DEMO_SELLERS[0].name, email: 'farmer@agrilink.demo', role: 'farmer', farmProfile: { name: DEMO_SELLERS[0].farmName, district: DEMO_SELLERS[0].city, state: DEMO_SELLERS[0].state, practices: 'Seed-saving, open-field growing', bio: DEMO_SELLERS[0].story }, verificationStatus: 'verified' },
  { _id: DEMO_SELLERS[1].id, fullName: DEMO_SELLERS[1].name, email: 'farmer.two@agrilink.demo', role: 'farmer', farmProfile: { name: DEMO_SELLERS[1].farmName, district: DEMO_SELLERS[1].city, state: DEMO_SELLERS[1].state, practices: 'Monsoon-grown, soil-first roots', bio: DEMO_SELLERS[1].story }, verificationStatus: 'verified' },
  { _id: DEMO_SELLERS[2].id, fullName: DEMO_SELLERS[2].name, email: 'farmer.pending@agrilink.demo', role: 'farmer', farmProfile: { name: DEMO_SELLERS[2].farmName, district: DEMO_SELLERS[2].city, state: DEMO_SELLERS[2].state, practices: 'No forced ripening', bio: DEMO_SELLERS[2].story }, verificationStatus: 'pending' },
  { _id: 'demo-buyer', fullName: 'Mira Desai', email: 'buyer@agrilink.demo', role: 'buyer', buyerType: 'retailer', verificationStatus: 'not_requested' },
  { _id: 'demo-admin', fullName: 'AgriLink Market Keeper', email: 'admin@agrilink.demo', role: 'admin', verificationStatus: 'verified' },
];

export async function initialiseDemoStore() {
  const passwordHash = await bcrypt.hash(randomUUID(), 10);
  demoStore.users.clear();
  for (const account of sampleAccounts) {
    demoStore.users.set(account._id, { ...account, passwordHash, createdAt: new Date() });
  }
  demoStore.products.clear();
  for (const fixture of INITIAL_PRODUCTS) {
    const seller = demoStore.users.get(fixture.farmerId);
    const { sellerName, ...product } = fixture;
    demoStore.products.set(product._id, {
      ...product,
      sellerName: sellerName || seller?.fullName || 'Local farmer',
      verificationStatus: product.verified ? 'verified' : 'pending',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const priorOrder = {
    _id: 'order-demo-delivered', orderNumber: 'AL-DEMO-0418',
    buyer: 'demo-buyer', farmer: 'demo-farmer', buyerName: 'Mira Desai', farmerName: 'Uday & Tara Collective',
    items: [{ product: 'seed-tomato-001', productName: 'Sunstripe heirloom tomatoes', quantityKg: 8, pricePerKg: 84, lineTotal: 672 }],
    subtotal: 672, estimatedServiceFee: 26.88, estimatedFarmerNet: 645.12, feeRate: 0.04,
    status: 'delivered', deliveryNote: 'Sample data — no real purchase or payment occurred.',
    createdAt: new Date(Date.now() - 2 * 86400000), updatedAt: new Date(Date.now() - 86400000),
  };
  demoStore.orders.clear();
  demoStore.orders.set(priorOrder._id, priorOrder);

  const pending = {
    _id: 'verification-demo-pending', farmer: 'demo-farmer-3', fullName: 'Fatima Sheikh',
    farmName: 'Kesari Hill Orchard', district: 'Ratnagiri', state: 'Maharashtra',
    crops: ['Kesar mangoes', 'Coconut'], practices: 'Low-intervention orchard; naturally ripened.',
    growerNote: 'Our hills are only a few rows from the Konkan shoreline.',
    status: 'pending', reviewNote: '', createdAt: new Date(), updatedAt: new Date(),
  };
  demoStore.verifications.clear();
  demoStore.verifications.set(pending._id, pending);
}

export function nextDemoId(prefix) {
  return `${prefix}-demo-${randomUUID()}`;
}
