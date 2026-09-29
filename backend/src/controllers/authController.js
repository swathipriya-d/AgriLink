import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { isDemoMode } from '../config/database.js';
import { jwtExpiry, jwtSecret } from '../config/jwt.js';
import { publicUser } from '../models/User.js';
import { createUser, findUserByEmail } from '../services/repository.js';

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  role: z.enum(['buyer', 'farmer']),
  buyerType: z.enum(['retailer', 'wholesaler', 'homecook', 'consumer']).optional(),
  farmName: z.string().trim().min(2).max(100).optional(),
  district: z.string().trim().min(2).max(80).optional(),
  state: z.string().trim().min(2).max(80).optional(),
  bio: z.string().trim().max(420).optional(),
  practices: z.string().trim().max(160).optional(),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

const demoSchema = z.object({ role: z.enum(['buyer', 'farmer', 'admin']) }).strict();
const demoEmails = { buyer: 'buyer@agrilink.demo', farmer: 'farmer@agrilink.demo', admin: 'admin@agrilink.demo' };

function makeAccessToken(user) {
  return jwt.sign(
    { role: user.role }, jwtSecret,
    { subject: String(user._id), expiresIn: jwtExpiry, algorithm: 'HS256', issuer: 'agrilink', audience: 'agrilink-client' },
  );
}

function sessionResponse(user) {
  return { success: true, data: { user: publicUser(user), token: makeAccessToken(user) } };
}

export function makeSessionToken(user) {
  return makeAccessToken(user);
}

export async function register(req, res) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Please check the details and try again.', issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  const input = parsed.data;
  if (input.role === 'farmer' && (!input.farmName || !input.district || !input.state)) {
    return res.status(422).json({ success: false, code: 'FARM_PROFILE_REQUIRED', message: 'Farmers need a farm name, district and state to create an account.' });
  }
  if (input.role === 'farmer' && !input.buyerType) delete input.buyerType;
  const existing = await findUserByEmail(input.email);
  if (existing) return res.status(409).json({ success: false, code: 'EMAIL_IN_USE', message: 'An account already uses that email.' });
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await createUser({ ...input, passwordHash });
    return res.status(201).json(sessionResponse(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, code: 'EMAIL_IN_USE', message: 'An account already uses that email.' });
    throw error;
  }
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Enter a valid email and password.' });
  const user = await findUserByEmail(parsed.data.email);
  const matches = user && await bcrypt.compare(parsed.data.password, user.passwordHash || '');
  if (!user || !matches || user.isActive === false) {
    return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Those details do not match an active AgriLink account.' });
  }
  if (user.role === 'admin') {
    return res.status(403).json({ success: false, code: 'ADMIN_SIGNIN_UNAVAILABLE', message: 'Use the protected administrator authentication provider; public registration cannot create moderator access.' });
  }
  return res.status(200).json(sessionResponse(user));
}

export async function demoSession(req, res) {
  if (!isDemoMode) return res.status(404).json({ success: false, code: 'DEMO_MODE_DISABLED', message: 'Demo sign-in is only available in the local in-memory development store.' });
  const parsed = demoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'INVALID_DEMO_ROLE', message: 'Choose a buyer, farmer or admin demonstration account.' });
  const user = await findUserByEmail(demoEmails[parsed.data.role]);
  if (!user) return res.status(503).json({ success: false, code: 'DEMO_SEED_MISSING', message: 'The demonstration account is not available.' });
  return res.status(200).json(sessionResponse(user));
}

export function currentSession(req, res) {
  return res.json({ success: true, data: { user: publicUser(req.user) } });
}
