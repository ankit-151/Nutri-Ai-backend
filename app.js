const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const connectToDatabase = require('./lib/mongodb');
const authRoutes = require('./auth.js');
const recordRoutes = require('./records.js');
const chatRoutes = require('./chat.js');

const app = express();

const allowedOrigins = [
  'https://nutri-ai-theta-six.vercel.app',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
}));
app.options('*', cors());
app.use(express.json({ limit: '4mb' }));

// Ensure serverless requests establish a MongoDB connection before hitting routes.
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/records', '/records'], recordRoutes);
app.use(['/api/chat', '/chat'], chatRoutes);

app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
