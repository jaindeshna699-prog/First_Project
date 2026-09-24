import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import Org from '../models/Org.js';
import auth from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = Router();

const registerSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(6),
  role:     z.enum(['donor', 'recipient', 'driver', 'admin']),
  phone:    z.string().optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    const { name, password, role, phone } = req.body;
    if (await User.findOne({ email })) {
      const err = new Error('Email already registered');
      err.status = 409;
      throw err;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role, phone });

    if (role === 'recipient') {
      await Org.create({ userId: user._id, name });
    }

    res.status(201).json({ token: signToken(user), user: { id: user._id, name, email, role } });
  } catch (err) { next(err); }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase();
    const { password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }
    res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) { const err = new Error('Not found'); err.status = 404; throw err; }
    res.json(user);
  } catch (err) { next(err); }
});

export default router;
