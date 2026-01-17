const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const JWT_SECRET = process.env.JWT_SECRET || 'b497b442940bb322884d27341a51fc30300229fad1e7e2db44d142696e52f7b0e4e5f99573f327ccdd3a39013732f214173e204d8a20d6885ec8a6321f04bf38';

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Check if initial setup is needed
router.get('/setup-needed', (req, res) => {
  try {
    const allUsers = req.app.locals.db.getAllUsers();
    res.json({ setupNeeded: allUsers.length === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/setup-status', (req, res) => {
  try {
    const allUsers = req.app.locals.db.getAllUsers();
    res.json({ setupNeeded: allUsers.length === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = req.app.locals.db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if this is the first user
    const allUsers = req.app.locals.db.getAllUsers();
    const isFirstUser = allUsers.length === 0;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    req.app.locals.db.createUser({
      username,
      password: hashedPassword,
      email: email || null,
      role: isFirstUser ? 'admin' : 'user'
    });

    res.status(201).json({ 
      success: true,
      message: isFirstUser ? 'Admin account created successfully' : 'User created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = req.app.locals.db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logout', verifyToken, (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Get current user
router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
module.exports.verifyToken = verifyToken;
