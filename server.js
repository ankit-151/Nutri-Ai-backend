require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const authRoutes   = require('./auth.js');
const recordRoutes = require('./records.js');
const chatRoutes   = require('./chat.js');

const app  = express();
const PORT = process.env.PORT || 8080;

// ─── CORS — allow Vercel frontend + local dev ─────────────────────
const allowedOrigins = [
  'https://nutri-ai-theta-six.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    // Also allow any vercel.app subdomain (preview deployments)
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error('CORS: origin not allowed — ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', cors());

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

// ─── Global error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── MongoDB connection ───────────────────────────────────────────
// Support both MONGODB_URI and MONGO_URI (Railway sometimes uses either)
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌  MONGODB_URI is not set in environment variables.');
  console.error('    Go to Railway → your service → Variables tab and add it.');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000,  // fail fast — 10s timeout instead of 30s
  socketTimeoutMS: 45000,
})
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀  NutriAI server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    console.error('    Common fixes:');
    console.error('    1. Go to Atlas → Network Access → Add 0.0.0.0/0 (Allow from anywhere)');
    console.error('    2. Check your MONGODB_URI is correctly set in Railway Variables');
    console.error('    3. Make sure your Atlas cluster is not paused');
    process.exit(1);
  });