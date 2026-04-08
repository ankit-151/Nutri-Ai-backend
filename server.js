require('dotenv').config();

const app = require('./app');
const connectToDatabase = require('./lib/mongodb');

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    await connectToDatabase();
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`NutriAI server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = app;
