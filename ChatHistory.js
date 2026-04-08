const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const ChatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    trim: true,
  },
  messages: {
    type: [MessageSchema],
    default: [],
  },
}, { timestamps: true });

ChatHistorySchema.index({ userId: 1, sessionId: 1 }, { unique: true });

module.exports = mongoose.model('ChatHistory', ChatHistorySchema);
