import { z } from 'zod';

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Please check the marked fields and try again.',
        issues: parsed.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      });
    }
    req.body = parsed.data;
    next();
  };
}

export function validateParams(schema, source = 'params') {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return res.status(422).json({ success: false, code: 'INVALID_PATH', message: 'The requested address is incomplete or invalid.' });
    }
    req[source] = parsed.data;
    next();
  };
}
