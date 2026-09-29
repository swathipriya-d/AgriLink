import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User, publicUser } from '../models/User.js';
import { Verification } from '../models/Verification.js';
import { isDemoMode } from '../config/database.js';
import { demoStore, nextDemoId } from './demoStore.js';

const clone = (record) => structuredClone(record);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function publicProduct(record, populatedFarmer = null) {
  const farmer = populatedFarmer || (record.farmer && typeof record.farmer === 'object'
    ? record.farmer
    : demoStore.users.get(String(record.farmerId || record.farmer)));
  const farm = farmer?.farmProfile || {};
  const verificationStatus = record.verificationStatus || (record.verified ? 'verified' : 'pending');
  return {
    _id: String(record._id),
    farmerId: String(farmer?._id || record.farmerId || record.farmer || ''),
    name: record.name,
    cultivar: record.cultivar || '',
    category: record.category,
    pricePerKg: Number(record.pricePerKg),
    stockKg: Number(record.stockKg),
    minOrderKg: Number(record.minOrderKg || 1),
    unit: 'kg',
    farmName: record.farmName || farm.name || 'Local farm',
    sellerName: farmer?.fullName || record.sellerName || 'An independent grower',
    city: record.city || farm.district || '',
    state: record.state || farm.state || '',
    verified: verificationStatus === 'verified',
    farmerVerified: farmer?.verificationStatus === 'verified',
    verificationStatus,
    harvestDate: record.harvestDate instanceof Date
      ? record.harvestDate.toISOString().slice(0, 10)
      : String(record.harvestDate || new Date().toISOString()).slice(0, 10),
    deliveryWindow: record.deliveryWindow || 'Harvest dispatch',
    tags: Array.isArray(record.tags) ? record.tags : [],
    story: record.story || '',
    description: record.description || '',
    imageUrl: record.imageUrl || '/images/produce-fallback.svg',
    createdAt: record.createdAt || null,
  };
}

function publicOrder(record) {
  const object = typeof record.toObject === 'function' ? record.toObject() : record;
  return {
    _id: String(object._id),
    orderNumber: object.orderNumber,
    buyerId: String(object.buyer?._id || object.buyer || ''),
    farmerId: String(object.farmer?._id || object.farmer || ''),
    buyerName: object.buyer?.fullName || object.buyerName,
    farmerName: object.farmer?.farmProfile?.name || object.farmerName,
    items: (object.items || []).map((item) => ({ ...item, product: String(item.product?._id || item.product) })),
    subtotal: Number(object.subtotal),
    estimatedServiceFee: Number(object.estimatedServiceFee),
    estimatedFarmerNet: Number(object.estimatedFarmerNet),
    feeRate: Number(object.feeRate || 0.04),
    status: object.status,
    deliveryNote: object.deliveryNote || '',
    createdAt: object.createdAt,
    updatedAt: object.updatedAt,
  };
}

export async function findUserByEmail(email) {
  if (isDemoMode) {
    for (const account of demoStore.users.values()) if (account.email === email.toLowerCase()) return account;
    return null;
  }
  return User.findOne({ email: email.toLowerCase(), isActive: true }).select('+passwordHash');
}

export async function findUserById(id) {
  if (isDemoMode) return demoStore.users.get(String(id)) || null;
  if (!mongoose.isValidObjectId(id)) return null;
  return User.findOne({ _id: id, isActive: true });
}

export async function createUser(input) {
  const email = input.email.toLowerCase();
  if (isDemoMode) {
    if ([...demoStore.users.values()].some((user) => user.email === email)) {
      const error = new Error('An account already uses that email.');
      error.statusCode = 409;
      error.code = 'EMAIL_IN_USE';
      throw error;
    }
    const user = {
      _id: nextDemoId('user'), fullName: input.fullName, email, passwordHash: input.passwordHash,
      role: input.role, buyerType: input.buyerType || 'consumer',
      farmProfile: input.role === 'farmer' ? { name: input.farmName, district: input.district, state: input.state, bio: input.bio || '', practices: input.practices || '' } : undefined,
      verificationStatus: 'not_requested', isActive: true, createdAt: new Date(),
    };
    demoStore.users.set(user._id, user);
    return user;
  }
  return User.create({
    fullName: input.fullName, email, passwordHash: input.passwordHash, role: input.role,
    buyerType: input.role === 'buyer' ? (input.buyerType || 'consumer') : undefined,
    farmProfile: input.role === 'farmer' ? { name: input.farmName, district: input.district, state: input.state, bio: input.bio || '', practices: input.practices || '' } : undefined,
  });
}

export async function listProducts({ search, category, city, minPrice, maxPrice, verified, inStock, sort, page = 1, limit = 24, farmerId } = {}) {
  if (isDemoMode) {
    let rows = [...demoStore.products.values()].filter((product) => product.isActive !== false);
    if (farmerId) rows = rows.filter((product) => String(product.farmerId) === String(farmerId));
    if (category) rows = rows.filter((product) => product.category === category);
    if (city) rows = rows.filter((product) => product.city.toLowerCase().includes(city.toLowerCase()) || product.state.toLowerCase().includes(city.toLowerCase()));
    if (Number.isFinite(minPrice)) rows = rows.filter((product) => product.pricePerKg >= minPrice);
    if (Number.isFinite(maxPrice)) rows = rows.filter((product) => product.pricePerKg <= maxPrice);
    if (verified === 'true') rows = rows.filter((product) => product.verificationStatus === 'verified');
    if (verified === 'false') rows = rows.filter((product) => product.verificationStatus !== 'verified');
    if (inStock === 'true') rows = rows.filter((product) => product.stockKg > 0);
    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter((product) => [product.name, product.cultivar, product.farmName, product.city, product.state, product.story, ...(product.tags || [])].join(' ').toLowerCase().includes(needle));
    }
    if (sort === 'price-low') rows.sort((a, b) => a.pricePerKg - b.pricePerKg);
    else if (sort === 'price-high') rows.sort((a, b) => b.pricePerKg - a.pricePerKg);
    else if (sort === 'stock') rows.sort((a, b) => b.stockKg - a.stockKg);
    else rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = rows.length;
    const offset = (page - 1) * limit;
    return { products: rows.slice(offset, offset + limit).map((product) => publicProduct(product)), total, page, limit };
  }

  const filter = { isActive: true };
  if (farmerId) filter.farmer = farmerId;
  if (category) filter.category = category;
  if (city) filter.$or = [{ city: new RegExp(escapeRegex(city), 'i') }, { state: new RegExp(escapeRegex(city), 'i') }];
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) filter.pricePerKg = {};
  if (Number.isFinite(minPrice)) filter.pricePerKg.$gte = minPrice;
  if (Number.isFinite(maxPrice)) filter.pricePerKg.$lte = maxPrice;
  if (verified === 'true') filter.verificationStatus = 'verified';
  if (verified === 'false') filter.verificationStatus = { $ne: 'verified' };
  if (inStock === 'true') filter.stockKg = { $gt: 0 };
  if (search) {
    filter.$and = [...(filter.$and || []), { $or: ['name', 'cultivar', 'farmName', 'story', 'description'].map((field) => ({ [field]: new RegExp(escapeRegex(search), 'i') })) }];
  }
  const order = sort === 'price-low' ? { pricePerKg: 1 } : sort === 'price-high' ? { pricePerKg: -1 } : sort === 'stock' ? { stockKg: -1 } : { createdAt: -1 };
  const [rows, total] = await Promise.all([
    Product.find(filter).populate('farmer', 'fullName role farmProfile verificationStatus').sort(order).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  return { products: rows.map((product) => publicProduct(product, product.farmer)), total, page, limit };
}

export async function findProductById(id) {
  if (isDemoMode) {
    const product = demoStore.products.get(String(id));
    return product?.isActive !== false ? publicProduct(product) : null;
  }
  if (!mongoose.isValidObjectId(id)) return null;
  const product = await Product.findOne({ _id: id, isActive: true }).populate('farmer', 'fullName role farmProfile verificationStatus').lean();
  return product ? publicProduct(product, product.farmer) : null;
}

export async function createListing(owner, input) {
  const farm = owner.farmProfile || {};
  const fields = {
    name: input.name, cultivar: input.cultivar || '', category: input.category,
    pricePerKg: input.pricePerKg, stockKg: input.stockKg, minOrderKg: input.minOrderKg || 1,
    farmName: farm.name || 'Independent farm', city: farm.district || 'Local market', state: farm.state || 'India',
    harvestDate: new Date(input.harvestDate), deliveryWindow: input.deliveryWindow || 'Harvest dispatch',
    story: input.story || '', description: input.description || '', tags: input.tags || [],
    imageUrl: input.imageUrl || '/images/produce-fallback.svg',
  };
  if (isDemoMode) {
    const record = {
      _id: nextDemoId('product'), farmerId: String(owner._id), sellerName: owner.fullName,
      ...fields, verificationStatus: 'pending', verified: false, isActive: true, createdAt: new Date(), updatedAt: new Date(),
    };
    demoStore.products.set(record._id, record);
    return publicProduct(record);
  }
  const created = await Product.create({ ...fields, farmer: owner._id, verificationStatus: 'pending' });
  await created.populate('farmer', 'fullName role farmProfile verificationStatus');
  return publicProduct(created, created.farmer);
}

const LISTING_FIELDS = ['name', 'cultivar', 'category', 'pricePerKg', 'stockKg', 'minOrderKg', 'deliveryWindow', 'story', 'description', 'tags', 'imageUrl'];
function permittedListingFields(input) {
  return Object.fromEntries(LISTING_FIELDS.filter((field) => input[field] !== undefined).map((field) => [field, input[field]]));
}

export async function updateListing(owner, id, input) {
  const values = permittedListingFields(input);
  if (input.harvestDate !== undefined) values.harvestDate = new Date(input.harvestDate);
  if (isDemoMode) {
    const record = demoStore.products.get(String(id));
    if (!record || String(record.farmerId) !== String(owner._id) || record.isActive === false) return null;
    Object.assign(record, values, { updatedAt: new Date() });
    return publicProduct(record);
  }
  if (!mongoose.isValidObjectId(id)) return null;
  const product = await Product.findOneAndUpdate({ _id: id, farmer: owner._id, isActive: true }, { $set: values }, { new: true, runValidators: true }).populate('farmer', 'fullName role farmProfile verificationStatus');
  return product ? publicProduct(product, product.farmer) : null;
}

export async function removeListing(owner, id) {
  if (isDemoMode) {
    const record = demoStore.products.get(String(id));
    if (!record || String(record.farmerId) !== String(owner._id) || record.isActive === false) return false;
    record.isActive = false;
    return true;
  }
  if (!mongoose.isValidObjectId(id)) return false;
  const result = await Product.updateOne({ _id: id, farmer: owner._id, isActive: true }, { $set: { isActive: false } });
  return result.modifiedCount > 0;
}

export async function setListingVerification(id, status) {
  if (isDemoMode) {
    const product = demoStore.products.get(String(id));
    if (!product || product.isActive === false) return null;
    product.verificationStatus = status;
    product.verified = status === 'verified';
    product.updatedAt = new Date();
    return publicProduct(product);
  }
  if (!mongoose.isValidObjectId(id)) return null;
  const product = await Product.findOneAndUpdate({ _id: id, isActive: true }, { $set: { verificationStatus: status } }, { new: true, runValidators: true }).populate('farmer', 'fullName role farmProfile verificationStatus');
  return product ? publicProduct(product, product.farmer) : null;
}

const serviceFeeRate = 0.04;
const allowedTransitions = {
  placed: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['packing', 'cancelled']),
  packing: new Set(['ready']),
  ready: new Set(['delivered']),
  delivered: new Set(),
  cancelled: new Set(),
};

export async function createOrder(buyer, { items, deliveryNote = '' }) {
  if (items.some((item, i) => items.findIndex((other) => other.productId === item.productId) !== i)) {
    const error = new Error('Add each harvest once and change its quantity instead of repeating it.');
    error.statusCode = 422;
    error.code = 'DUPLICATE_ORDER_ITEM';
    throw error;
  }

  const snapshots = [];
  for (const item of items) {
    const product = await findProductById(item.productId);
    if (!product) {
      const error = new Error('That harvest is no longer available in the requested quantity.');
      error.statusCode = 409;
      error.code = 'STOCK_UNAVAILABLE';
      throw error;
    }
    if (product.verificationStatus === 'rejected') {
      const error = new Error('This listing needs another detail before buyers can request it.');
      error.statusCode = 409;
      error.code = 'LISTING_REJECTED';
      throw error;
    }
    if (product.stockKg < item.quantityKg) {
      const error = new Error('That harvest is no longer available in the requested quantity.');
      error.statusCode = 409;
      error.code = 'STOCK_UNAVAILABLE';
      throw error;
    }
    if (product.farmerId === String(buyer._id)) {
      const error = new Error('A farm cannot order its own listing.');
      error.statusCode = 403;
      error.code = 'OWN_LISTING';
      throw error;
    }
    if (item.quantityKg < product.minOrderKg) {
      const error = new Error(`${product.name} has a ${product.minOrderKg} kg minimum order.`);
      error.statusCode = 422;
      error.code = 'MINIMUM_ORDER';
      throw error;
    }
    snapshots.push({ product, quantityKg: item.quantityKg, pricePerKg: product.pricePerKg, lineTotal: Number((product.pricePerKg * item.quantityKg).toFixed(2)) });
  }

  const ownerIds = [...new Set(snapshots.map((line) => line.product.farmerId))];
  if (ownerIds.length > 1) {
    const error = new Error('One order can come from one farm; please place separate orders for other growers.');
    error.statusCode = 422;
    error.code = 'ONE_FARM_PER_ORDER';
    throw error;
  }
  const subtotal = Number(snapshots.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
  const estimatedServiceFee = Number((subtotal * serviceFeeRate).toFixed(2));
  const estimatedFarmerNet = Number((subtotal - estimatedServiceFee).toFixed(2));
  const farmerName = snapshots[0].product.farmName;
  const orderId = isDemoMode ? nextDemoId('order') : undefined;
  const orderNumber = `AL-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
  const rows = snapshots.map((line) => ({
    product: line.product._id,
    productName: line.product.name,
    quantityKg: line.quantityKg,
    pricePerKg: line.pricePerKg,
    lineTotal: line.lineTotal,
  }));
  const orderData = {
    ...(orderId ? { _id: orderId } : {}), orderNumber,
    buyer: buyer._id, farmer: ownerIds[0], buyerName: buyer.fullName, farmerName,
    items: rows, subtotal, estimatedServiceFee, estimatedFarmerNet, feeRate: serviceFeeRate,
    status: 'placed', deliveryNote: deliveryNote.slice(0, 240), createdAt: new Date(), updatedAt: new Date(),
  };

  if (isDemoMode) {
    for (const line of snapshots) {
      const record = demoStore.products.get(line.product._id);
      if (!record || record.stockKg < line.quantityKg) {
        const error = new Error('Stock changed while creating this order. Please try again.');
        error.statusCode = 409;
        error.code = 'STOCK_UNAVAILABLE';
        throw error;
      }
      record.stockKg -= line.quantityKg;
      record.updatedAt = new Date();
    }
    demoStore.orders.set(orderData._id, orderData);
    return publicOrder(orderData);
  }

  const decremented = [];
  try {
    for (const line of snapshots) {
      const product = await Product.findOneAndUpdate(
        { _id: line.product._id, farmer: { $ne: buyer._id }, isActive: true, stockKg: { $gte: line.quantityKg } },
        { $inc: { stockKg: -line.quantityKg } }, { new: true },
      );
      if (!product) {
        const error = new Error('Stock changed while creating this order. Please refresh and try again.');
        error.statusCode = 409;
        error.code = 'STOCK_UNAVAILABLE';
        throw error;
      }
      decremented.push(line);
    }
    const stored = await Order.create(orderData);
    return publicOrder(stored);
  } catch (error) {
    await Promise.all(decremented.map((line) => Product.updateOne({ _id: line.product._id }, { $inc: { stockKg: line.quantityKg } })));
    throw error;
  }
}

export async function listOrdersFor(user) {
  if (isDemoMode) {
    const key = user.role === 'farmer' ? 'farmer' : 'buyer';
    return [...demoStore.orders.values()]
      .filter((order) => String(order[key]) === String(user._id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(publicOrder);
  }
  const key = user.role === 'farmer' ? 'farmer' : 'buyer';
  const rows = await Order.find({ [key]: user._id })
    .sort({ createdAt: -1 }).lean();
  return rows.map(publicOrder);
}

export async function transitionOrder(user, orderId, nextStatus) {
  if (isDemoMode) {
    const order = demoStore.orders.get(String(orderId));
    if (!order) return null;
    if (user.role === 'farmer' && String(order.farmer) !== String(user._id)) return null;
    if (user.role === 'buyer' && String(order.buyer) !== String(user._id)) return null;
    if (!allowedTransitions[order.status]?.has(nextStatus)) {
      const error = new Error(`This order cannot move from ${order.status} to ${nextStatus}.`);
      error.statusCode = 409;
      error.code = 'INVALID_STATUS_TRANSITION';
      throw error;
    }
    if (nextStatus === 'cancelled' && user.role === 'farmer') {
      const error = new Error('Only the buyer may cancel an order.');
      error.statusCode = 403;
      error.code = 'BUYER_CANCELLATION_ONLY';
      throw error;
    }
    if (nextStatus !== 'cancelled' && user.role !== 'farmer') {
      const error = new Error('Only the owning farmer may advance fulfilment.');
      error.statusCode = 403;
      error.code = 'FARMER_FULFILLMENT_ONLY';
      throw error;
    }
    if (nextStatus === 'cancelled') {
      for (const item of order.items) {
        const product = demoStore.products.get(item.product);
        if (product) product.stockKg += item.quantityKg;
      }
    }
    order.status = nextStatus;
    order.updatedAt = new Date();
    return publicOrder(order);
  }

  if (!mongoose.isValidObjectId(orderId)) return null;
  const order = await Order.findById(orderId);
  if (!order) return null;
  if (user.role === 'farmer' && String(order.farmer) !== String(user._id)) return null;
  if (user.role === 'buyer' && String(order.buyer) !== String(user._id)) return null;
  if (!allowedTransitions[order.status]?.has(nextStatus)) {
    const error = new Error(`This order cannot move from ${order.status} to ${nextStatus}.`);
    error.statusCode = 409;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
  if (nextStatus === 'cancelled' && user.role !== 'buyer') {
    const error = new Error('Only the buyer may cancel an order.');
    error.statusCode = 403;
    error.code = 'BUYER_CANCELLATION_ONLY';
    throw error;
  }
  if (nextStatus !== 'cancelled' && user.role !== 'farmer') {
    const error = new Error('Only the owning farmer may advance fulfilment.');
    error.statusCode = 403;
    error.code = 'FARMER_FULFILLMENT_ONLY';
    throw error;
  }
  if (nextStatus === 'cancelled') {
    for (const item of order.items) {
      await Product.updateOne({ _id: item.product }, { $inc: { stockKg: item.quantityKg } });
    }
  }
  order.status = nextStatus;
  await order.save();
  return publicOrder(order);
}

export async function createVerification(user, input) {
  const existing = await latestVerificationForUser(String(user._id));
  if (existing?.status === 'pending' || existing?.status === 'verified') {
    const error = new Error('There is already a pending or approved grower verification request.');
    error.statusCode = 409;
    error.code = 'VERIFICATION_ALREADY_ACTIVE';
    throw error;
  }
  const data = {
    farmer: user._id, fullName: user.fullName, farmName: input.farmName,
    district: input.district, state: input.state, crops: input.crops,
    practices: input.practices || '', growerNote: input.growerNote || '', status: 'pending',
    createdAt: new Date(), updatedAt: new Date(),
  };
  let record;
  if (isDemoMode) {
    record = { ...data, _id: nextDemoId('verification') };
    demoStore.verifications.set(record._id, record);
    const owner = demoStore.users.get(String(user._id));
    if (owner) {
      owner.verificationStatus = 'pending';
      owner.farmProfile = {
        ...owner.farmProfile,
        name: input.farmName,
        district: input.district,
        state: input.state,
        practices: input.practices || '',
      };
    }
  } else {
    record = await Verification.create(data);
    await User.updateOne({ _id: user._id }, { $set: { verificationStatus: 'pending', 'farmProfile.name': input.farmName, 'farmProfile.district': input.district, 'farmProfile.state': input.state, 'farmProfile.practices': input.practices || '' } });
  }
  return publicVerification(record);
}

function publicVerification(record) {
  const value = typeof record.toObject === 'function' ? record.toObject() : record;
  return {
    _id: String(value._id), farmerId: String(value.farmer?._id || value.farmer || ''),
    fullName: value.fullName || value.farmer?.fullName,
    farmName: value.farmName, district: value.district, state: value.state,
    crops: value.crops || [], practices: value.practices || '', growerNote: value.growerNote || '',
    status: value.status, reviewNote: value.reviewNote || '', createdAt: value.createdAt, reviewedAt: value.reviewedAt || null,
  };
}

export async function latestVerificationForUser(userId) {
  if (isDemoMode) return [...demoStore.verifications.values()]
    .filter((entry) => String(entry.farmer) === String(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  if (!mongoose.isValidObjectId(userId)) return null;
  return Verification.findOne({ farmer: userId }).sort({ createdAt: -1 }).populate('farmer', 'fullName email');
}

export async function listVerifications(status = 'pending') {
  if (isDemoMode) return [...demoStore.verifications.values()]
    .filter((entry) => !status || entry.status === status)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(publicVerification);
  const filter = status ? { status } : {};
  const rows = await Verification.find(filter).sort({ createdAt: 1 }).populate('farmer', 'fullName email');
  return rows.map(publicVerification);
}

export async function reviewVerification(id, reviewer, decision, reviewNote = '') {
  if (isDemoMode) {
    const record = demoStore.verifications.get(String(id));
    if (!record || record.status !== 'pending') return null;
    record.status = decision;
    record.reviewNote = reviewNote;
    record.reviewedBy = String(reviewer._id);
    record.reviewedAt = new Date();
    record.updatedAt = new Date();
    const farmer = demoStore.users.get(String(record.farmer));
    if (farmer) {
      farmer.verificationStatus = decision;
      if (decision === 'verified') Object.assign(farmer.farmProfile, { name: record.farmName, district: record.district, state: record.state, practices: record.practices });
    }
    return publicVerification(record);
  }
  if (!mongoose.isValidObjectId(id)) return null;
  const record = await Verification.findOneAndUpdate({ _id: id, status: 'pending' }, { $set: { status: decision, reviewNote, reviewedBy: reviewer._id, reviewedAt: new Date() } }, { new: true }).populate('farmer', 'fullName email');
  if (!record) return null;
  await User.updateOne({ _id: record.farmer._id }, {
    $set: { verificationStatus: decision, 'farmProfile.name': record.farmName, 'farmProfile.district': record.district, 'farmProfile.state': record.state, 'farmProfile.practices': record.practices },
  });
  return publicVerification(record);
}

export async function listingAnalytics(farmer) {
  const [{ products, total }, orders] = await Promise.all([
    listProducts({ farmerId: String(farmer._id), page: 1, limit: 1000 }),
    listOrdersFor({ role: 'farmer', _id: farmer._id }),
  ]);
  const activeOrders = orders.filter((order) => !['cancelled', 'delivered'].includes(order.status));
  const sales = orders.filter((order) => !['cancelled'].includes(order.status));
  const gross = Number(sales.reduce((sum, order) => sum + order.subtotal, 0).toFixed(2));
  return {
    period: 'All time', totalListings: total,
    activeListings: products.filter((product) => product.stockKg > 0).length,
    lowStockListings: products.filter((product) => product.stockKg > 0 && product.stockKg <= 10).length,
    openOrders: activeOrders.length, fulfilledOrders: sales.filter((order) => order.status === 'delivered').length,
    grossOrderValue: gross, indicativeFarmerNet: Number(sales.reduce((sum, order) => sum + order.estimatedFarmerNet, 0).toFixed(2)),
    feeDisclosure: 'Estimate only. Demo orders are illustrative; no transaction, commission, or payout is processed.',
    recentOrders: orders.slice(0, 6),
  };
}

export const listingVerificationStatuses = ['pending', 'verified', 'rejected'];
export const allowedDemoBuyerAddress = 'buyer@agrilink.demo';
