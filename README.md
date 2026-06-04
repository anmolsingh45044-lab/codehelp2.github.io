# 🚀 CodeSolve — Learn. Track. Grow.

A full-stack coding education platform with user authentication, study tracking, AI tutoring (Claude), curated courses, and a MongoDB database backend.

---

## 📁 Project Structure

```
codesolve/
├── backend/
│   ├── server.js          ← Express + MongoDB API
│   ├── package.json
│   └── .env.example       ← Copy to .env and configure
└── frontend/
    └── index.html         ← Complete SPA (works standalone + with backend)
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 Auth | Sign up / Sign in / Guest mode |
| 📊 Dashboard | Stats, streak, activity feed |
| 📈 Progress | Per-course progress tracking |
| 📒 Records | Study scores with grade badges |
| 🎯 Goals | Goal tracker with completion |
| 📚 Courses | Curated YouTube playlists (Java, Python, Web Dev, DSA) |
| 🤖 AI Tutor | Powered by Claude AI |
| 🌐 Offline | Works in demo mode without backend |

---

## 🖥️ Option A — Frontend Only (GitHub Pages, No Backend)

The frontend works completely standalone using `localStorage`. This is the easiest way to go live.

### Deploy to GitHub Pages

1. Fork or push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **Deploy from branch**, branch: `main`, folder: `/frontend`
4. Your site will be live at `https://YOUR_USERNAME.github.io/codesolve/`

> **Note:** In this mode, the AI Tutor requires an Anthropic API key entered directly in the browser. See the AI Tutor section below.

---

## 🔧 Option B — Full Stack (Backend + MongoDB)

### Step 1: Set up MongoDB Atlas (free)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free cluster
2. Create a database user and whitelist your IP (or allow all: `0.0.0.0/0`)
3. Copy your connection string: `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/codesolve`

### Step 2: Configure & Run Backend Locally

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — fill in MONGODB_URI and JWT_SECRET
npm start
```

Server runs at `http://localhost:5000`

### Step 3: Connect Frontend

In `frontend/index.html`, find near the top of the `<script>` tag:

```javascript
const API_BASE = 'http://localhost:5000/api';
let USE_API    = false; // ← Change to true
```

Set `USE_API = true`.

### Step 4: Open Frontend

```bash
# Python
cd frontend && python -m http.server 3000

# Node
npx serve frontend -p 3000
```

---

## ☁️ Deploying the Backend

### Railway (Recommended — free tier)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo, set **Root Directory** to `backend`
4. Add environment variables (from your `.env`)
5. Railway auto-detects Node.js and runs `npm start`

### Render

1. New Web Service → connect GitHub repo
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables

After deploying, update `API_BASE` in `frontend/index.html` to your deployed backend URL, e.g.:
```javascript
const API_BASE = 'https://codesolve-api.railway.app/api';
```

---

## 🤖 AI Tutor Setup

The AI Tutor calls the Claude API. For a quick setup, it calls the API directly from the browser — this is fine for personal/demo use.

**For production**, proxy it through your backend to protect your API key:

1. Add `ANTHROPIC_API_KEY=your_key` to your backend `.env`
2. Install the SDK: `npm install @anthropic-ai/sdk`
3. Add this route to `server.js`:

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post('/api/tutor/chat', auth, async (req, res) => {
  const { messages } = req.body;
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: 'You are an expert coding tutor...',
    messages
  });
  res.json({ reply: response.content[0].text });
});
```

4. In `frontend/index.html`, change the `sendChat()` function to call `/api/tutor/chat` instead of the Anthropic API directly.

---

## 🔌 API Endpoints

All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/user/dashboard` | Get full dashboard data |
| GET | `/api/records` | Get study records |
| POST | `/api/records` | Add record |
| DELETE | `/api/records/:id` | Delete record |
| GET | `/api/goals` | Get goals |
| POST | `/api/goals` | Add goal |
| PATCH | `/api/goals/:id/toggle` | Toggle goal done |
| DELETE | `/api/goals/:id` | Delete goal |
| GET | `/api/progress` | Get course progress |
| PATCH | `/api/progress` | Update progress |
| GET | `/api/health` | Health check |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML/CSS/JS (no build step) |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| AI | Claude API (Anthropic) |
| Fonts | Syne + JetBrains Mono + DM Sans |

---

## 📄 License

MIT — free to use and modify.
