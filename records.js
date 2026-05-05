const express     = require('express');
const jwt         = require('jsonwebtoken');
const DailyRecord = require('./DailyRecord.js');

// ─── Gemini Vision (free tier) ────────────────────────────────────
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────
function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('No token');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
}

// Timezone-aware: accepts optional userDate (YYYY-MM-DD) from client,
// falls back to UTC date so logs always land on the user's local day.
function todayStr(req) {
  const clientDate = req.query?.date || req.body?.date;
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) return clientDate;
  return new Date().toISOString().split('T')[0];
}

// ─── GET /api/records/today ───────────────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const userId = getUserId(req);
    const date   = todayStr(req);
    let rec = await DailyRecord.findOne({ userId, date });
    if (!rec) rec = await DailyRecord.create({ userId, date });
    return res.json({ record: rec });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/records/history ─────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const userId = getUserId(req);
    const dates  = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const records = await DailyRecord.find({ userId, date: { $in: dates } }).sort({ date: -1 });
    const map     = Object.fromEntries(records.map(r => [r.date, r]));
    const history = dates.map(date => map[date] || {
      _id: null, userId, date,
      totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0,
      micronutrients: { iron: 0, calcium: 0, vitaminC: 0, vitaminB12: 0, magnesium: 0, potassium: 0 },
      meals: [],
    });
    return res.json({ history });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/records/meal ───────────────────────────────────────
router.post('/meal', async (req, res) => {
  try {
    const userId = getUserId(req);
    const date   = todayStr(req);
    const {
      _id, text, mealType, calories, protein, carbs, fats,
      fiber, micronutrients, detectedFoods, aiInsight, source,
    } = req.body;

    let rec = await DailyRecord.findOne({ userId, date });
    if (!rec) rec = new DailyRecord({ userId, date });

    rec.meals.push({
      _id,
      text,
      mealType:       mealType       || 'snack',
      calories:       Number(calories)  || 0,
      protein:        Number(protein)   || 0,
      carbs:          Number(carbs)     || 0,
      fats:           Number(fats)      || 0,
      fiber:          Number(fiber)     || 0,
      micronutrients: micronutrients    || {},
      detectedFoods:  detectedFoods     || [],
      aiInsight:      aiInsight         || '',
      source:         source            || 'local',
      loggedAt:       new Date(),
    });

    rec.recalcTotals();
    await rec.save();
    return res.status(201).json({ record: rec });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/records/meal/photo  (Gemini Vision — free tier) ────
//
// Body: { imageBase64: string, mediaType: string, mealType: string, date?: string }
// Returns: { record, nutrition }
// ─────────────────────────────────────────────────────────────────
router.post('/meal/photo', async (req, res) => {
  try {
    const userId = getUserId(req);
    const date   = todayStr(req);
    const { imageBase64, mediaType = 'image/jpeg', mealType = 'snack' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment' });
    }

    // ── Call Gemini 1.5 Flash (free tier) ──────────────────────────
    const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      { inlineData: { data: imageBase64, mimeType: mediaType } },
      `You are a nutrition expert. Analyze this food photo carefully.
Return ONLY a valid JSON object — no markdown, no explanation, no backticks.
Use this exact shape:
{
  "detectedFoods": [{ "name": "string", "qty": number }],
  "calories":  number,
  "protein":   number,
  "carbs":     number,
  "fats":      number,
  "fiber":     number,
  "aiInsight": "one encouraging sentence about this meal",
  "mealLabel": "short natural description e.g. 2 rotis with dal and sabzi"
}
All nutrition values are numbers in grams (kcal for calories).
Estimate realistic Indian or global portion sizes.
If the image is not food, set calories to 0 and explain in aiInsight.`,
    ]);

    // ── Parse response ─────────────────────────────────────────────
    let nutrition;
    try {
      const raw = result.response.text().replace(/```json|```/g, '').trim();
      nutrition = JSON.parse(raw);
    } catch {
      return res.status(422).json({
        error: 'Could not parse nutrition from image. Try a clearer, well-lit photo.',
      });
    }

    // ── Validate required fields ───────────────────────────────────
    const required = ['calories', 'protein', 'carbs', 'fats'];
    for (const field of required) {
      if (typeof nutrition[field] !== 'number') nutrition[field] = 0;
    }
    if (!nutrition.fiber)     nutrition.fiber     = 0;
    if (!nutrition.mealLabel) nutrition.mealLabel = 'Photo meal';
    if (!nutrition.aiInsight) nutrition.aiInsight = '';
    if (!Array.isArray(nutrition.detectedFoods)) nutrition.detectedFoods = [];

    // ── Save to today's record ─────────────────────────────────────
    let rec = await DailyRecord.findOne({ userId, date });
    if (!rec) rec = new DailyRecord({ userId, date });

    rec.meals.push({
      _id:            `m_photo_${Date.now()}`,
      text:           nutrition.mealLabel,
      mealType,
      calories:       Math.round(nutrition.calories),
      protein:        +nutrition.protein.toFixed(1),
      carbs:          +nutrition.carbs.toFixed(1),
      fats:           +nutrition.fats.toFixed(1),
      fiber:          +nutrition.fiber.toFixed(1),
      micronutrients: {},
      detectedFoods:  nutrition.detectedFoods,
      aiInsight:      nutrition.aiInsight,
      source:         'ai',
      loggedAt:       new Date(),
    });

    rec.recalcTotals();
    await rec.save();

    return res.status(201).json({ record: rec, nutrition });
  } catch (err) {
    console.error('Photo meal error:', err.message);
    // Surface quota errors clearly
    if (err.message?.includes('quota') || err.message?.includes('429')) {
      return res.status(429).json({ error: 'Gemini free tier rate limit hit. Try again in a minute.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/records/meal/:mealId ────────────────────────────
router.delete('/meal/:mealId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const date   = todayStr(req);
    const rec    = await DailyRecord.findOne({ userId, date });
    if (!rec) return res.status(404).json({ error: 'No record found for today' });
    rec.meals = rec.meals.filter(m => m._id !== req.params.mealId);
    rec.recalcTotals();
    await rec.save();
    return res.json({ record: rec });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/records/all ──────────────────────────────────────
router.delete('/all', async (req, res) => {
  try {
    const userId = getUserId(req);
    await DailyRecord.deleteMany({ userId });
    return res.json({ message: 'All records deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;