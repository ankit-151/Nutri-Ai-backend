require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const authRoutes   = require('./auth.js');
const recordRoutes = require('./records.js');
const chatRoutes   = require('./chat.js');

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
}));
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth',    authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/chat',    chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status:'ok', db: mongoose.connection.readyState===1?'connected':'disconnected', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'NutriAI API is running!' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message||'Internal server error' });
});

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('❌ MONGO_URI not set!'); process.exit(1); }

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀  Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌  MongoDB failed:', err.message);
    process.exit(1);
  });