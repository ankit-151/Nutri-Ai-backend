const mongoose = require('mongoose');

const globalCache = globalThis.__nutriAiMongoCache || {
  conn: null,
  promise: null,
};

globalThis.__nutriAiMongoCache = globalCache;

async function connectToDatabase() {
  const mongodbUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongodbUri) {
    throw new Error('Missing MONGODB_URI environment variable');
  }

  if (globalCache.conn || mongoose.connection.readyState === 1) {
    return globalCache.conn || mongoose.connection;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose
      .connect(mongodbUri)
      .then((mongooseInstance) => mongooseInstance.connection)
      .catch((error) => {
        globalCache.promise = null;
        throw error;
      });
  }

  globalCache.conn = await globalCache.promise;
  return globalCache.conn;
}

module.exports = connectToDatabase;
