import mongoose from 'mongoose';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import {
  findProductById, listProducts, createListing, updateListing, removeListing,
  setListingVerification,
} from '../services/repository.js';
import { isDemoMode } from '../config/database.js';
import { demoStore } from '../services/demoStore.js';

const CATEGORIES = ['Vegetables', 'Fruits', 'Grains & pulses', 'Herbs & greens', 'Dairy & pantry'];
const imageUrlSchema = z.string().trim().max(2000).refine((value) => value === '' || value.startsWith('/') && !value.startsWith('//') || value.startsWith('https://res.cloudinary.com/'), 'Use a safe AgriLink image path or HTTPS Cloudinary URL.').optional();
const common = {
  name: z.string().trim().min(3).max(100), cultivar: z.string().trim().max(90).optional(),
  category: z.enum(CATEGORIES), pricePerKg: z.coerce.number().finite().min(1).max(100000),
  stockKg: z.coerce.number().finite().min(0).max(1000000), minOrderKg: z.coerce.number().finite().min(0.25).max(10000).default(1),
  harvestDate: z.string().date(), deliveryWindow: z.string().trim().max(100).optional(),
  story: z.string().trim().max(420).optional(), description: z.string().trim().max(800).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).optional(), imageUrl: imageUrlSchema,
};
const createSchema = z.object(common).strict();
const updateSchema = z.object(Object.fromEntries(Object.entries(common).map(([key, value]) => [key, value.optional()]))).strict().refine((value) => Object.keys(value).length > 0, 'Update at least one field.');
const verificationSchema = z.object({ status: z.enum(['verified', 'rejected']) }).strict();

function boundedNumber(value, min, max) {
  if (value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
}

function filtersFromQuery(query) {
  const search = String(query.search || '').trim().slice(0, 100);
  const category = CATEGORIES.includes(query.category) ? query.category : undefined;
  const sortValues = ['newest', 'price-low', 'price-high', 'stock'];
  const city = String(query.city || '').trim().slice(0, 80);
  return {
    search: search || undefined, category, city: city || undefined,
    minPrice: boundedNumber(query.minPrice, 0, 100000), maxPrice: boundedNumber(query.maxPrice, 0, 100000),
    verified: ['true', 'false'].includes(query.verified) ? query.verified : undefined,
    inStock: query.inStock === 'true' ? 'true' : undefined,
    sort: sortValues.includes(query.sort) ? query.sort : 'newest',
    page: Math.max(1, Math.min(10000, Number.parseInt(query.page, 10) || 1)),
    limit: Math.max(1, Math.min(48, Number.parseInt(query.limit, 10) || 24)),
  };
}

export async function browseProducts(req, res) {
  const result = await listProducts(filtersFromQuery(req.query));
  res.json({ success: true, data: result });
}

export async function readProduct(req, res) {
  const product = await findProductById(req.params.id);
  if (!product) return res.status(404).json({ success: false, code: 'PRODUCT_NOT_FOUND', message: 'That harvest is no longer available.' });
  res.json({ success: true, data: { product } });
}

export async function addProduct(req, res) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Please review the listing details.', issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  const product = await createListing(req.user, parsed.data);
  res.status(201).json({ success: true, data: { product }, message: 'Listing created. It will show as pending until a market moderator reviews it.' });
}

export async function updateProduct(req, res) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Please review the changes.', issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  const product = await updateListing(req.user, req.params.id, parsed.data);
  if (!product) return res.status(404).json({ success: false, code: 'LISTING_NOT_FOUND', message: 'The listing was not found in your farm studio.' });
  res.json({ success: true, data: { product }, message: 'Listing updated.' });
}

export async function removeProduct(req, res) {
  const removed = await removeListing(req.user, req.params.id);
  if (!removed) return res.status(404).json({ success: false, code: 'LISTING_NOT_FOUND', message: 'The listing was not found in your farm studio.' });
  res.json({ success: true, data: { archived: true }, message: 'The listing was taken off the market.' });
}

export async function pendingProducts(req, res) {
  let rows;
  if (isDemoMode) rows = [...demoStore.products.values()].filter((product) => product.isActive && product.verificationStatus === 'pending');
  else rows = await Product.find({ isActive: true, verificationStatus: 'pending' }).populate('farmer', 'fullName farmProfile verificationStatus').sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: { products: rows.map((product) => isDemoMode ? product : ({ ...product, farmerId: String(product.farmer?._id || product.farmer) })) } });
}

export async function moderateProduct(req, res) {
  const parsed = verificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'INVALID_REVIEW', message: 'Choose verified or rejected.' });
  const product = await setListingVerification(req.params.id, parsed.data.status);
  if (!product) return res.status(404).json({ success: false, code: 'LISTING_NOT_FOUND', message: 'This listing is no longer available.' });
  res.json({ success: true, data: { product }, message: `Listing marked ${parsed.data.status}.` });
}

export function listingValidationReference() {
  return { mongooseAvailable: Boolean(mongoose.version), idHint: 'Listing writes are scoped to the authenticated farmer; listing review is admin-only.' };
}
