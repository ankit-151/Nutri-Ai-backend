# ⬡ NutriAI — MongoDB Integration Guide

## 📁 Project Structure

```
nutriai-backend/
├── server.js                  ← Express entry point
├── .env                       ← Your secrets (MONGO_URI, JWT_SECRET)
├── package.json
├── NutriAI-MongoDB.html       ← Updated frontend (open in browser)
│
├── models/
│   ├── User.js                ← Users collection (name, email, hashed password, goals)
│   ├── DailyRecord.js         ← Daily food logs + nutrition totals
│   └── ChatHistory.js         ← AI chat sessions
│
├── routes/
│   ├── auth.js                ← POST /register, POST /login, GET /me, PATCH /goals
│   ├── records.js             ← GET /today, GET /history, POST /meal, DELETE /meal/:id
│   └── chat.js                ← POST /message, GET /sessions, GET /session/:id
│
└── middleware/
    └── auth.js                ← JWT verification middleware
```

---

## 🚀 Step-by-Step Setup

### Step 1 — Create a Free MongoDB Atlas Account

1. Go to **https://cloud.mongodb.com**
2. Click **"Try Free"** and sign up
3. Create a new **Project** (name it "NutriAI")
4. Create a new **Cluster** → choose **M0 Free Tier**
5. Choose your region (pick closest to you)
6. Click **Create Deployment**

### Step 2 — Get Your Connection String

1. In Atlas, click **"Connect"** on your cluster
2. Choose **"Drivers"** → Node.js
3. Copy the connection string — it looks like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
   ```
4. Replace `<password>` with your actual password
5. Add `/nutriai` at the end (this is your database name):
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/nutriai?retryWrites=true&w=majority
   ```

### Step 3 — Whitelist Your IP

1. In Atlas, go to **Network Access** (left sidebar)
2. Click **"Add IP Address"**
3. Click **"Allow Access From Anywhere"** (for development)
4. Click **Confirm**

### Step 4 — Configure Your .env File

Open `.env` and fill in your values:

```env
MONGO_URI=mongodb+srv://yourUser:yourPassword@cluster0.xxxxx.mongodb.net/nutriai?retryWrites=true&w=majority
JWT_SECRET=pick_any_long_random_string_like_this_nutriai_secret_2024_xyz
JWT_EXPIRES_IN=7d
PORT=5000
CLIENT_URL=http://localhost:3000
```

### Step 5 — Install Dependencies

```bash
cd nutriai-backend
npm install
```

This installs:
- **express** — web server
- **mongoose** — MongoDB ODM
- **bcryptjs** — password hashing
- **jsonwebtoken** — JWT auth
- **cors** — allow frontend to call API
- **dotenv** — load .env file

### Step 6 — Start the Backend

```bash
npm start
# or for auto-reload during development:
npm run dev
```

You should see:
```
✅  MongoDB connected
🚀  NutriAI server running on http://localhost:5000
```

### Step 7 — Test the Backend

Visit: **http://localhost:5000/api/health**

You should see:
```json
{ "status": "ok", "db": "connected", "time": "..." }
```

### Step 8 — Open the Frontend

Open **`NutriAI-MongoDB.html`** in your browser.

> **Note:** If opening as a file (`file://`), the CORS is already configured.
> For best results, use VS Code Live Server or any local HTTP server.

---

## 📊 What Gets Stored in MongoDB

### `users` collection
```json
{
  "_id": "ObjectId",
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "$2b$12$hashedPassword...",  ← bcrypt hashed, never plain text
  "goals": {
    "calories": 2000,
    "protein": 150,
    "carbs": 250,
    "fats": 65
  },
  "lastLogin": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### `dailyrecords` collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (→ users)",
  "date": "2024-01-15",
  "totalCalories": 1450,
  "totalProtein": 85.5,
  "totalCarbs": 180.0,
  "totalFats": 45.2,
  "totalFiber": 22.0,
  "micronutrients": {
    "iron": 8.5,
    "calcium": 320,
    "vitaminC": 45,
    "vitaminB12": 1.2,
    "magnesium": 180,
    "potassium": 1800
  },
  "meals": [
    {
      "_id": "m_1705312200000",
      "text": "2 rotis, dal, paneer curry",
      "mealType": "lunch",
      "calories": 680,
      "protein": 32,
      "carbs": 85,
      "fats": 22,
      "detectedFoods": [
        { "name": "Roti", "qty": 2 },
        { "name": "Dal", "qty": 1 },
        { "name": "Paneer", "qty": 1 }
      ],
      "aiInsight": "💪 Excellent protein! Your muscles will thank you.",
      "source": "local",
      "loggedAt": "2024-01-15T13:00:00Z"
    }
  ]
}
```

### `chathistories` collection
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "sessionId": "session_1705312200000",
  "messages": [
    { "role": "user",      "content": "What should I eat for breakfast?", "sentAt": "..." },
    { "role": "assistant", "content": "For a balanced breakfast...",       "sentAt": "..." }
  ]
}
```

---

## 🔗 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, get JWT token |
| GET | `/api/auth/me` | Yes | Get current user |
| PATCH | `/api/auth/goals` | Yes | Update nutrition goals |
| GET | `/api/records/today` | Yes | Get/create today's record |
| GET | `/api/records/history` | Yes | Get last 7 days |
| POST | `/api/records/meal` | Yes | Add a meal |
| DELETE | `/api/records/meal/:id` | Yes | Delete a meal |
| DELETE | `/api/records/all` | Yes | Clear all user data |
| POST | `/api/chat/message` | Yes | Save chat message |
| GET | `/api/chat/sessions` | Yes | List chat sessions |

---

## 🔒 Security Features

- ✅ Passwords hashed with **bcrypt** (12 salt rounds) — never stored in plain text
- ✅ **JWT tokens** expire after 7 days
- ✅ All data routes protected with auth middleware
- ✅ Users can only access their own data
- ✅ Input validation on all endpoints
- ✅ CORS configured for your frontend URL only

---

## 🌐 Deploying to Production

### Backend (Railway / Render / Heroku)
1. Push your `nutriai-backend` folder to GitHub
2. Connect it to Railway/Render
3. Add your `.env` variables in the dashboard
4. Update `CLIENT_URL` to your frontend URL

### Frontend
Update this line in `NutriAI-MongoDB.html`:
```javascript
const API_BASE = 'https://your-api-domain.com/api';  // ← change this
```

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| `MongoDB connection failed` | Check your MONGO_URI in .env, whitelist your IP in Atlas |
| `Network request failed` | Make sure backend is running on port 5000 |
| `Not authorised` | Token expired — log out and back in |
| `CORS error` | Add your frontend URL to the CORS origins in server.js |
