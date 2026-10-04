/**
 * TaskFlow API Server
 * Built with Express, Mongoose (MongoDB), and CORS.
 * Includes JWT Authentication and bcrypt Password Hashing.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/todoapp';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';

app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

const todoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Task text is required'],
      trim: true,
      maxlength: [500, 'Task text cannot exceed 500 characters'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Todo = mongoose.model('Todo', todoSchema);

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected successfully to MongoDB database'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));


const authenticate = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains { id, email }
    next();
  } catch (ex) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'User already registered.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, email: user.email });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ token, email: user.email });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/todos - Fetch tasks for logged-in user
app.get('/api/todos', authenticate, async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve todos' });
  }
});

// POST /api/todos - Create task for logged-in user
app.post('/api/todos', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Todo text is required' });

    const newTodo = new Todo({
      userId: req.user.id,
      text: text.trim(),
      completed: false,
    });

    const savedTodo = await newTodo.save();
    res.status(201).json(savedTodo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// PUT /api/todos/:id - Update user's task
app.put('/api/todos/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed, text } = req.body;
    const updates = {};
    if (typeof completed === 'boolean') updates.completed = completed;
    if (typeof text === 'string' && text.trim()) updates.text = text.trim();

    // Ensure users can only update their own tasks
    const updatedTodo = await Todo.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      updates,
      { new: true }
    );

    if (!updatedTodo) return res.status(404).json({ error: 'Todo not found or unauthorized' });
    res.status(200).json(updatedTodo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE /api/todos/:id - Remove user's task
app.delete('/api/todos/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    // Ensure users can only delete their own tasks
    const deletedTodo = await Todo.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!deletedTodo) return res.status(404).json({ error: 'Todo not found or unauthorized' });
    res.status(200).json({ message: 'Todo deleted successfully', id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TaskFlow Backend running on port ${PORT}`);
  console.log(`📡 CORS allowed origins: ${CORS_ORIGIN}`);
});