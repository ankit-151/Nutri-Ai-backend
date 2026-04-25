require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const authRoutes   = require('./auth.js');
const recordRoutes = require('./records.js');
const chatRoutes   = require('./chat.js');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── CORS — must be FIRST before any routes ───────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// ─── Body Parser ──────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/chat',    chatRoutes);

// ─── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

// ─── Root route ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'NutriAI API is running!' });
});

// ─── 404 handler ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Connect MongoDB and start server ────────────────────────────
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not set in environment variables!');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected successfully');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀  NutriAI server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
