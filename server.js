// ══════════════════════════════════════════════════════
//  CodeSolve Backend — Express + MongoDB
//  Run: npm install && node server.js
//  Deps: express mongoose bcryptjs jsonwebtoken cors dotenv
// ══════════════════════════════════════════════════════
const express   = require('express');
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

// ── MongoDB ──────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codesolve')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── Schemas ──────────────────────────────────────────────
const RecordSchema = new mongoose.Schema({
  subject: String, type: String, score: Number,
  note: String, date: { type: Date, default: Date.now }
});

const GoalSchema = new mongoose.Schema({
  text: String, done: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  course:   { type: String, default: 'General' },
  streak:   { type: Number, default: 1 },
  lastSeen: { type: Date, default: Date.now },
  progress: {
    java:   { type: Number, default: 0 },
    python: { type: Number, default: 0 },
    web:    { type: Number, default: 0 },
    dsa:    { type: Number, default: 0 },
  },
  records:  [RecordSchema],
  goals:    [GoalSchema],
  activity: [{ text: String, time: String, color: String, _id: false }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const JWT_SECRET = process.env.JWT_SECRET || 'codesolve_dev_secret_2024';

// ── Auth Middleware ──────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
};

// ── Routes: Auth ─────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, course } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ error: 'This email is already registered' });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash, course: course || 'General' });
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, course: user.course } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid email or password' });
    const daysSince = Math.floor((Date.now() - user.lastSeen) / 86400000);
    if (daysSince === 1) user.streak += 1;
    else if (daysSince > 1) user.streak = 1;
    user.lastSeen = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, course: user.course, streak: user.streak } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Routes: Dashboard ────────────────────────────────────
app.get('/api/user/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const scores = user.records.map(r => r.score);
    const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
    res.json({
      user,
      stats: {
        avg,
        subjects: [...new Set(user.records.map(r => r.subject))].length,
        goalsCompleted: user.goals.filter(g => g.done).length,
        totalGoals: user.goals.length,
        streak: user.streak,
        totalRecords: user.records.length
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Routes: Records ──────────────────────────────────────
app.get('/api/records', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json([...user.records].sort((a,b) => new Date(b.date) - new Date(a.date)));
});

app.post('/api/records', auth, async (req, res) => {
  try {
    const { subject, type, score, note } = req.body;
    if (!subject || score === undefined) return res.status(400).json({ error: 'Subject and score are required' });
    const user = await User.findById(req.user.id);
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
    user.records.unshift({ subject, type: type || 'Assignment', score: Number(score), note });
    user.activity.unshift({
      text: `Added ${type || 'Assignment'}: "${subject}" — ${score}% (${grade})`,
      time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
      color: grade === 'A' ? 'green' : grade === 'B' ? 'blue' : grade === 'C' ? 'yellow' : 'purple'
    });
    if (user.activity.length > 10) user.activity.pop();
    await user.save();
    res.status(201).json(user.records[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/records/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.records = user.records.filter(r => r._id.toString() !== req.params.id);
    user.activity.unshift({ text: 'Deleted a study record', time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }), color: 'purple' });
    await user.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Routes: Goals ────────────────────────────────────────
app.get('/api/goals', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.goals);
});

app.post('/api/goals', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Goal text required' });
    const user = await User.findById(req.user.id);
    user.goals.push({ text });
    await user.save();
    res.status(201).json(user.goals[user.goals.length - 1]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/goals/:id/toggle', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const goal = user.goals.id(req.params.id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    goal.done = !goal.done;
    if (goal.done) {
      user.activity.unshift({ text: `Completed goal: "${goal.text}"`, time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }), color: 'green' });
      if (user.activity.length > 10) user.activity.pop();
    }
    await user.save();
    res.json(goal);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/goals/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.goals = user.goals.filter(g => g._id.toString() !== req.params.id);
    await user.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Routes: Progress ─────────────────────────────────────
app.get('/api/progress', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.progress);
});

app.patch('/api/progress', auth, async (req, res) => {
  try {
    const { course, value } = req.body;
    const allowed = ['java', 'python', 'web', 'dsa'];
    if (!allowed.includes(course)) return res.status(400).json({ error: 'Invalid course' });
    const user = await User.findById(req.user.id);
    user.progress[course] = Math.min(100, Math.max(0, Number(value)));
    user.activity.unshift({ text: `Updated ${course.toUpperCase()} progress to ${value}%`, time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }), color: 'blue' });
    if (user.activity.length > 10) user.activity.pop();
    await user.save();
    res.json(user.progress);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 CodeSolve API running at http://localhost:${PORT}`));
