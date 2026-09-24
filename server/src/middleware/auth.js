import jwt from 'jsonwebtoken';

export default function auth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    const err = new Error('No token');
    err.status = 401;
    throw err;
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    const err = new Error('Invalid token');
    err.status = 401;
    throw err;
  }
}
