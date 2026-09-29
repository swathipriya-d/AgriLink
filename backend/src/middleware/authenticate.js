import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/jwt.js';
import { publicUser } from '../models/User.js';
import { findUserById } from '../services/repository.js';

export async function authenticate(req, res, next) {
  const value = req.get('authorization') || '';
  const match = /^Bearer ([\w.-]+)$/i.exec(value);
  if (!match) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Sign in to continue.' });
  try {
    const claims = jwt.verify(match[1], jwtSecret, { algorithms: ['HS256'], issuer: 'agrilink', audience: 'agrilink-client' });
    const account = await findUserById(claims.sub);
    if (!account || account.isActive === false || account.role !== claims.role) {
      return res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'This session is no longer active. Please sign in again.' });
    }
    req.user = account;
    req.publicUser = publicUser(account);
    next();
  } catch {
    return res.status(401).json({ success: false, code: 'SESSION_EXPIRED', message: 'This session is invalid or has expired. Please sign in again.' });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, code: 'ROLE_FORBIDDEN', message: 'This action is not available to this account.' });
    }
    next();
  };
}
