const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not set');
  }
  return secret;
};

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
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
    const realUsers = allUsers.filter(u => u.role !== 'temp_admin' && !u.is_temp);
    res.json({ setupNeeded: realUsers.length === 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/setup-status', (req, res) => {
  try {
    const allUsers = req.app.locals.db.getAllUsers();
    const realUsers = allUsers.filter(u => u.role !== 'temp_admin' && !u.is_temp);
    res.json({ setupNeeded: realUsers.length === 0 });
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
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      token, // Include token in response for WebSocket authentication
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

router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

const notTempAdmin = (req, res, next) => {
  if (req.user.role === 'temp_admin') {
    return res.status(403).json({ error: 'Temporary admins cannot change passwords' });
  }
  next();
};

router.put('/change-password', verifyToken, notTempAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Get user
    const users = req.app.locals.db.db.get('users').value();
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    req.app.locals.db.db.get('users')
      .find({ id: req.user.id })
      .assign({ password: hashedPassword })
      .write();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get WebSocket token (for re-authentication after page refresh)
router.get('/ws-token', verifyToken, (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const user = req.user;
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      getJwtSecret(),
      { expiresIn: '24h' }
    );
    
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create temporary admin (no auth required - for password recovery)
router.post('/create-temp-admin', async (req, res) => {
  try {
    const crypto = require('crypto');
    
    // ✅ Generate VERY secure random password (24 characters)
    // Mix of uppercase, lowercase, numbers, and special characters
    const generateSecurePassword = () => {
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const numbers = '0123456789';
      const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const allChars = uppercase + lowercase + numbers + special;
      
      let password = '';
      
      // Ensure at least one of each type
      password += uppercase[crypto.randomInt(0, uppercase.length)];
      password += lowercase[crypto.randomInt(0, lowercase.length)];
      password += numbers[crypto.randomInt(0, numbers.length)];
      password += special[crypto.randomInt(0, special.length)];
      
      // Fill the rest (20 more characters for total of 24)
      for (let i = 0; i < 20; i++) {
        password += allChars[crypto.randomInt(0, allChars.length)];
      }
      
      // Shuffle the password to randomize position of required chars
      return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
    };
    
    const tempPassword = generateSecurePassword();
    const tempUsername = `temp_admin_${Date.now()}`;
    
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Create temp admin
    const userId = req.app.locals.db.createUser({
      username: tempUsername,
      password: hashedPassword,
      email: null,
      role: 'temp_admin'
    });
    
    // Set expiration (30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    req.app.locals.db.db.get('users')
      .find({ id: userId })
      .assign({ expires_at: expiresAt, is_temp: true })
      .write();
    
    // LOG CREDENTIALS TO CONSOLE ONLY
    console.log('\n' + '='.repeat(70));
    console.log('🔐 TEMPORARY ADMIN CREATED FOR PASSWORD RECOVERY');
    console.log('='.repeat(70));
    console.log('Username:', tempUsername);
    console.log('Password:', tempPassword);
    console.log('Expires: ', new Date(expiresAt).toLocaleString());
    console.log('='.repeat(70));
    console.log('⚠️  SECURITY NOTICE:');
    console.log('   - This is a HIGH-SECURITY 24-character password');
    console.log('   - Copy it EXACTLY (case-sensitive, includes special chars)');
    console.log('   - Account expires in 30 minutes');
    console.log('   - Only use for password recovery');
    console.log('='.repeat(70) + '\n');
    
    res.json({
      success: true,
      message: 'Temporary admin created. Check server console for login credentials.',
      expiresAt: expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cleanup-temp-admins', (req, res) => {
  try {
    const now = new Date().toISOString();
    const users = req.app.locals.db.db.get('users').value();
    
    const expiredTempAdmins = users.filter(u => 
      u.is_temp && u.expires_at && u.expires_at < now
    );
    
    expiredTempAdmins.forEach(user => {
      req.app.locals.db.db.get('users')
        .remove({ id: user.id })
        .write();
    });
    
    res.json({ 
      success: true, 
      message: `Cleaned up ${expiredTempAdmins.length} expired temp admins` 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
module.exports.verifyToken = verifyToken;
