const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('./User.js');

const router = express.Router();

function signToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'nutriai_secret_2024',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

// ─── POST /api/auth/register ──────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    console.log('Register attempt:', req.body?.email);
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ error: 'An account with this email already exists' });

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });

    const token = signToken(user._id);
    console.log('✅ User registered:', user.email);

    return res.status(201).json({
      token,
      user: {
        _id:       user._id,
        name:      user.name,
        email:     user.email,
        goals:     user.goals,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Server error during registration: ' + err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body?.email);
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    console.log('✅ User logged in:', user.email);

    return res.json({
      token,
      user: {
        _id:       user._id,
        name:      user.name,
        email:     user.email,
        goals:     user.goals,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token)
      return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutriai_secret_2024');
    const user = await User.findById(decoded.id).select('-password');
    if (!user)
      return res.status(401).json({ error: 'User not found' });

    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ─── PATCH /api/auth/goals ────────────────────────────────────────
router.patch('/goals', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token)
      return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutriai_secret_2024');
    const { calories, protein, carbs, fats } = req.body;

    const goals = {
      calories: Math.max(800,  Math.min(5000, Number(calories) || 2000)),
      protein:  Math.max(20,   Math.min(400,  Number(protein)  || 150)),
      carbs:    Math.max(50,   Math.min(800,  Number(carbs)    || 250)),
      fats:     Math.max(10,   Math.min(300,  Number(fats)     || 65)),
    };

    const user = await User.findByIdAndUpdate(decoded.id, { goals }, { new: true });
    return res.json({ goals: user.goals });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update goals: ' + err.message });
  }
});

module.exports = router;
