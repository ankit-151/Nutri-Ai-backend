const mongoose = require('mongoose');

// ─── Micronutrients sub-schema ────────────────────────────────────
const MicroSchema = new mongoose.Schema({
  iron:       { type: Number, default: 0 },
  calcium:    { type: Number, default: 0 },
  vitaminC:   { type: Number, default: 0 },
  vitaminB12: { type: Number, default: 0 },
  magnesium:  { type: Number, default: 0 },
  potassium:  { type: Number, default: 0 },
}, { _id: false });

// ─── Detected food item sub-schema ───────────────────────────────
const DetectedFoodSchema = new mongoose.Schema({
  name: String,
  qty:  Number,
}, { _id: false });

// ─── Individual meal entry sub-schema ────────────────────────────
const MealSchema = new mongoose.Schema({
  _id:        { type: String, required: true },   // client-side ID kept for easy deletion
  text:       { type: String, required: true },   // raw user input e.g. "2 rotis and dal"
  mealType:   { type: String, enum: ['breakfast','lunch','dinner','snack'], default: 'snack' },
  calories:   { type: Number, default: 0 },
  protein:    { type: Number, default: 0 },
  carbs:      { type: Number, default: 0 },
  fats:       { type: Number, default: 0 },
  fiber:      { type: Number, default: 0 },
  micronutrients: { type: MicroSchema, default: () => ({}) },
  detectedFoods:  { type: [DetectedFoodSchema], default: [] },
  aiInsight:  { type: String, default: '' },
  source:     { type: String, enum: ['ai','local'], default: 'local' },
  loggedAt:   { type: Date, default: Date.now },
});

// ─── Daily Record schema ──────────────────────────────────────────
const DailyRecordSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date:     { type: String, required: true, index: true },  // "YYYY-MM-DD" format

  // Aggregated daily totals (recalculated on every meal change)
  totalCalories: { type: Number, default: 0 },
  totalProtein:  { type: Number, default: 0 },
  totalCarbs:    { type: Number, default: 0 },
  totalFats:     { type: Number, default: 0 },
  totalFiber:    { type: Number, default: 0 },
  micronutrients: { type: MicroSchema, default: () => ({}) },

  // All meals logged that day
  meals: { type: [MealSchema], default: [] },
}, { timestamps: true });

// ─── Compound index: one record per user per day ──────────────────
DailyRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

// ─── Helper: recalculate totals from meals array ─────────────────
DailyRecordSchema.methods.recalcTotals = function () {
  const z = { calories:0, protein:0, carbs:0, fats:0, fiber:0,
               iron:0, calcium:0, vitaminC:0, vitaminB12:0, magnesium:0, potassium:0 };
  for (const m of this.meals) {
    z.calories   += m.calories  || 0;
    z.protein    += m.protein   || 0;
    z.carbs      += m.carbs     || 0;
    z.fats       += m.fats      || 0;
    z.fiber      += m.fiber     || 0;
    z.iron       += (m.micronutrients?.iron       || 0);
    z.calcium    += (m.micronutrients?.calcium    || 0);
    z.vitaminC   += (m.micronutrients?.vitaminC   || 0);
    z.vitaminB12 += (m.micronutrients?.vitaminB12 || 0);
    z.magnesium  += (m.micronutrients?.magnesium  || 0);
    z.potassium  += (m.micronutrients?.potassium  || 0);
  }
  this.totalCalories  = Math.round(z.calories);
  this.totalProtein   = +z.protein.toFixed(1);
  this.totalCarbs     = +z.carbs.toFixed(1);
  this.totalFats      = +z.fats.toFixed(1);
  this.totalFiber     = +z.fiber.toFixed(1);
  this.micronutrients = {
    iron:       +z.iron.toFixed(1),
    calcium:    Math.round(z.calcium),
    vitaminC:   Math.round(z.vitaminC),
    vitaminB12: +z.vitaminB12.toFixed(1),
    magnesium:  Math.round(z.magnesium),
    potassium:  Math.round(z.potassium),
  };
};

module.exports = mongoose.model('DailyRecord', DailyRecordSchema);
