import { randomBytes } from 'node:crypto';

const production = process.env.NODE_ENV === 'production';
const configuredSecret = process.env.JWT_SECRET?.trim();

if (production && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('In production, JWT_SECRET must contain at least 32 characters.');
}
if (!production && configuredSecret && configuredSecret.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters, or be omitted for a random local-demo key.');
}

export const jwtSecret = configuredSecret || randomBytes(48).toString('base64url');
export const jwtExpiry = process.env.JWT_EXPIRES_IN || '12h';
