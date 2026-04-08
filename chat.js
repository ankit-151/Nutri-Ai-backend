const express     = require('express');
const jwt         = require('jsonwebtoken');
const ChatHistory = require('./ChatHistory.js');

const router = express.Router();

function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('No token');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
}

router.post('/message', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId, role, content } = req.body;
    let session = await ChatHistory.findOne({ userId, sessionId });
    if (!session) session = new ChatHistory({ userId, sessionId, messages: [] });
    session.messages.push({ role, content });
    await session.save();
    return res.status(201).json({ session });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const userId = getUserId(req);
    const sessions = await ChatHistory.find({ userId }).sort({ updatedAt: -1 }).limit(50);
    return res.json({ sessions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;