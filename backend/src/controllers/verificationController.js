import { z } from 'zod';
import { publicUser } from '../models/User.js';
import { listVerifications, createVerification, latestVerificationForUser, reviewVerification } from '../services/repository.js';

const requestSchema = z.object({
  farmName: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  crops: z.array(z.string().trim().min(2).max(56)).min(1).max(12),
  practices: z.string().trim().max(240).optional(),
  growerNote: z.string().trim().max(640).optional(),
}).strict();
const reviewSchema = z.object({ status: z.enum(['verified', 'rejected']), reviewNote: z.string().trim().max(500).optional() }).strict();

function toDto(record) {
  if (!record) return null;
  const farmer = record.farmer && typeof record.farmer === 'object' ? record.farmer : null;
  return {
    _id: String(record._id), farmerId: String(farmer?._id || record.farmer || record.farmerId || ''),
    fullName: record.fullName || farmer?.fullName || '', farmName: record.farmName || '',
    district: record.district || '', state: record.state || '', crops: record.crops || [],
    practices: record.practices || '', growerNote: record.growerNote || '',
    status: record.status, reviewNote: record.reviewNote || '', createdAt: record.createdAt, reviewedAt: record.reviewedAt || null,
  };
}

export async function submitVerification(req, res) {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'VALIDATION_ERROR', message: 'Please complete the farm, origin and crop details.', issues: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  const verification = await createVerification(req.user, parsed.data);
  res.status(201).json({ success: true, data: { verification }, message: 'Your grower profile is in the market review queue.' });
}

export async function readMyVerification(req, res) {
  const [verification] = await Promise.all([latestVerificationForUser(String(req.user._id))]);
  res.json({ success: true, data: { verification: toDto(verification), user: publicUser(req.user) } });
}

export async function readVerificationQueue(req, res) {
  const status = req.query.status === 'all' ? null : (req.query.status === 'verified' || req.query.status === 'rejected' ? req.query.status : 'pending');
  const records = await listVerifications(status);
  res.json({ success: true, data: { verifications: records.map(toDto), count: records.length } });
}

export async function decideVerification(req, res) {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, code: 'INVALID_REVIEW', message: 'Choose a valid review decision and an optional note.' });
  const verification = await reviewVerification(req.params.id, req.user, parsed.data.status, parsed.data.reviewNote || '');
  if (!verification) return res.status(404).json({ success: false, code: 'VERIFICATION_NOT_FOUND', message: 'This request is no longer pending.' });
  res.json({ success: true, data: { verification }, message: `Grower request marked ${parsed.data.status}.` });
}
