const express     = require('express');
const jwt         = require('jsonwebtoken');
const DailyRecord = require('./DailyRecord.js');

const router = express.Router();

function getUserId(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('No token');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.id;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Get today's record
router.get('/today', async (req, res) => {
  try {
    const userId = getUserId(req);
    let rec = await DailyRecord.findOne({ userId, date: todayStr() });
    if (!rec) rec = await DailyRecord.create({ userId, date: todayStr() });
    return res.json({ record: rec });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get history (last 7 days)
router.get('/history', async (req, res) => {
  try {
    const userId = getUserId(req);
    const dates = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    const records = await DailyRecord.find({ userId, date: { $in: dates } }).sort({ date: -1 });
    const map = Object.fromEntries(records.map(r => [r.date, r]));
    const history = dates.map(date => map[date] || {
      _id: null, userId, date,
      totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0, totalFiber: 0,
      micronutrients: { iron:0, calcium:0, vitaminC:0, vitaminB12:0, magnesium:0, potassium:0 },
      meals: [],
    });
    return res.json({ history });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Add meal
router.post('/meal', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { _id, text, mealType, calories, protein, carbs, fats, fiber, micronutrients, detectedFoods, aiInsight, source } = req.body;
    let rec = await DailyRecord.findOne({ userId, date: todayStr() });
    if (!rec) rec = new DailyRecord({ userId, date: todayStr() });
    rec.meals.push({ _id, text, mealType: mealType||'snack', calories: Number(calories)||0, protein: Number(protein)||0, carbs: Number(carbs)||0, fats: Number(fats)||0, fiber: Number(fiber)||0, micronutrients: micronutrients||{}, detectedFoods: detectedFoods||[], aiInsight: aiInsight||'', source: source||'local', loggedAt: new Date() });
    rec.recalcTotals();
    await rec.save();
    return res.status(201).json({ record: rec });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete meal
router.delete('/meal/:mealId', async (req, res) => {
  try {
    const userId = getUserId(req);
    const rec = await DailyRecord.findOne({ userId, date: todayStr() });
    if (!rec) return res.status(404).json({ error: 'No record found' });
    rec.meals = rec.meals.filter(m => m._id !== req.params.mealId);
    rec.recalcTotals();
    await rec.save();
    return res.json({ record: rec });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Clear all data
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