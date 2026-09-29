const images = {
  harvest: '/images/agri-market-hero.webp',
  tomatoes: '/images/heirloom-tomatoes.webp',
  carrots: '/images/rainbow-carrots.webp',
  mangoes: '/images/kesar-mangoes.webp',
};

export const DEMO_SELLERS = [
  { id: 'demo-farmer', name: 'Asha Deshmukh', farmName: 'Uday & Tara Collective', city: 'Nashik', state: 'Maharashtra', verified: true, story: 'A third-generation family of growers saving seed and picking at first light.' },
  { id: 'demo-farmer-2', name: 'Nilesh Jadhav', farmName: 'Red Earth Fields', city: 'Satara', state: 'Maharashtra', verified: true, story: 'Small-batch roots grown with the monsoon, packed in the cool of the morning.' },
  { id: 'demo-farmer-3', name: 'Fatima Sheikh', farmName: 'Kesari Hill Orchard', city: 'Ratnagiri', state: 'Maharashtra', verified: false, story: 'A small coastal orchard bringing the fragrant Kesar season to local kitchens.' },
];

export const INITIAL_PRODUCTS = [
  {
    _id: 'seed-tomato-001', name: 'Sunstripe heirloom tomatoes', cultivar: 'Mixed heritage varieties', category: 'Vegetables', pricePerKg: 84, stockKg: 34, minOrderKg: 2, unit: 'kg',
    farmName: DEMO_SELLERS[0].farmName, sellerName: DEMO_SELLERS[0].name, farmerId: DEMO_SELLERS[0].id, city: 'Nashik', state: 'Maharashtra', verified: true,
    harvestDate: new Date().toISOString().slice(0, 10), deliveryWindow: 'Tomorrow, 7–10 am', tags: ['Just picked', 'No cold storage'], story: 'Striped at sunrise, picked ripe. Never the hard, travelling kind.', description: 'An ever-changing mix of golden, blushing and deep-red heirlooms grown in loose, living soil. Best eaten the day they arrive.', imageUrl: images.tomatoes,
  },
  {
    _id: 'seed-carrot-002', name: 'Dawn-grown rainbow carrots', cultivar: 'Cosmic purple & Solar yellow', category: 'Vegetables', pricePerKg: 72, stockKg: 28, minOrderKg: 2, unit: 'kg',
    farmName: DEMO_SELLERS[1].farmName, sellerName: DEMO_SELLERS[1].name, farmerId: DEMO_SELLERS[1].id, city: 'Satara', state: 'Maharashtra', verified: true,
    harvestDate: new Date().toISOString().slice(0, 10), deliveryWindow: 'Tomorrow, 6–9 am', tags: ['Small batch', 'Soil grown'], story: 'Lifted by hand while the field is still cool and the leaves stand proud.', description: 'Tender colourful heritage carrots, bunched fresh with their feathery tops intact. Every bundle is its own little colour story.', imageUrl: images.carrots,
  },
  {
    _id: 'seed-mango-003', name: 'First-flush Kesar mangoes', cultivar: 'Hill orchard, naturally ripened', category: 'Fruits', pricePerKg: 146, stockKg: 48, minOrderKg: 5, unit: 'kg',
    farmName: DEMO_SELLERS[2].farmName, sellerName: DEMO_SELLERS[2].name, farmerId: DEMO_SELLERS[2].id, city: 'Ratnagiri', state: 'Maharashtra', verified: false,
    harvestDate: new Date().toISOString().slice(0, 10), deliveryWindow: 'Friday, harvest dispatch', tags: ['Seasonal', 'Picking to order'], story: 'Grown one ridge from the sea. These trees have never met a ripening room.', description: 'Small naturally ripened Kesar mangoes from a coastal hillside orchard. A little more rustic, and all the more fragrant for it.', imageUrl: images.mangoes,
  },
  {
    _id: 'seed-tomato-004', name: 'Rosella pink salad tomatoes', cultivar: 'Old-seed pink slicers', category: 'Vegetables', pricePerKg: 96, stockKg: 16, minOrderKg: 1, unit: 'kg',
    farmName: DEMO_SELLERS[0].farmName, sellerName: DEMO_SELLERS[0].name, farmerId: DEMO_SELLERS[0].id, city: 'Nashik', state: 'Maharashtra', verified: true,
    harvestDate: new Date().toISOString().slice(0, 10), deliveryWindow: 'Tomorrow, 7–10 am', tags: ['New this week', 'Seed saved'], story: 'Slow grown with seed passed from grower to grower, not catalogue to catalogue.', description: 'Soft rose flesh, a bright little tang, and a centre that belongs on good toast.', imageUrl: images.tomatoes,
  },
  {
    _id: 'seed-carrot-005', name: 'Sweet little market carrots', cultivar: 'Young Nantes, picked small', category: 'Vegetables', pricePerKg: 64, stockKg: 42, minOrderKg: 3, unit: 'kg',
    farmName: DEMO_SELLERS[1].farmName, sellerName: DEMO_SELLERS[1].name, farmerId: DEMO_SELLERS[1].id, city: 'Satara', state: 'Maharashtra', verified: true,
    harvestDate: new Date().toISOString().slice(0, 10), deliveryWindow: 'Tomorrow, 6–9 am', tags: ['Under ₹70', 'Soil grown'], story: 'A brighter, sweeter crunch from the sandy end of the Jadhav field.', description: 'Smaller carrots for quick lunches and long slow roasts. Packed within hours of picking.', imageUrl: images.carrots,
  },
  {
    _id: 'seed-mango-006', name: 'Sunset Kesar select box', cultivar: 'Sorted medium orchard fruit', category: 'Fruits', pricePerKg: 158, stockKg: 22, minOrderKg: 5, unit: 'kg',
    farmName: DEMO_SELLERS[2].farmName, sellerName: DEMO_SELLERS[2].name, farmerId: DEMO_SELLERS[2].id, city: 'Ratnagiri', state: 'Maharashtra', verified: false,
    harvestDate: new Date().toISOString().slice(0, 10), deliveryWindow: 'Friday, harvest dispatch', tags: ['One-week harvest', 'Mixed-grade available'], story: 'Hand-sorted on the orchard floor for a lovely even ripening over the weekend.', description: 'A modest small-box pick from a family hillside grove. A soft aromatic fruit when it is ready.', imageUrl: images.mangoes,
  },
];

export const HERO_IMAGE = images.harvest;
export const PRODUCT_FALLBACK_IMAGE = '/images/produce-fallback.svg';

export function formatRupees(value, digits = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value) || 0);
}

export function listingReviewStatus(product) {
  if (!product) return 'pending';
  const recordedStatus = String(product.verificationStatus || '').toLowerCase();
  if (['verified', 'pending', 'rejected'].includes(recordedStatus)) return recordedStatus;
  if (product.verified != null) return product.verified ? 'verified' : 'pending';
  const farmer = product.farmer && typeof product.farmer === 'object' ? product.farmer : {};
  return farmer.verificationStatus === 'verified' ? 'verified' : 'pending';
}

export function normaliseProduct(product) {
  if (!product) return null;
  const farmer = product.farmer && typeof product.farmer === 'object' ? product.farmer : {};
  const location = product.location && typeof product.location === 'object' ? product.location : {};
  const reviewStatus = listingReviewStatus(product);
  return {
    ...product,
    farmerId: String(product.farmerId || farmer._id || product.farmer || ''),
    farmName: product.farmName || farmer.farmProfile?.name || 'Neighbouring farm',
    sellerName: product.sellerName || farmer.fullName || farmer.name || 'A local grower',
    city: product.city || location.city || farmer.farmProfile?.district || '',
    state: product.state || location.state || farmer.farmProfile?.state || '',
    category: product.category || 'Vegetables',
    pricePerKg: Number(product.pricePerKg || product.price || 0),
    stockKg: Number(product.stockKg ?? product.quantityKg ?? 0),
    minOrderKg: Number(product.minOrderKg || 1),
    verified: reviewStatus === 'verified',
    verificationStatus: reviewStatus,
    harvestDate: product.harvestDate || new Date().toISOString().slice(0, 10),
    deliveryWindow: product.deliveryWindow || 'Harvest dispatch',
    tags: Array.isArray(product.tags) ? product.tags : [],
    imageUrl: product.imageUrl || PRODUCT_FALLBACK_IMAGE,
    story: product.story || product.description || 'Grown with care, and brought here by the person who planted it.',
  };
}
