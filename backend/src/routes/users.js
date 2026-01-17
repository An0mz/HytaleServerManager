const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { verifyToken } = require('./auth');

const isAdmin = (req, res, next) => {
if (req.user.role !== 'admin' && req.user.role !== 'temp_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/', verifyToken, isAdmin, (req, res) => {
  try {
    const users = req.app.locals.db.getAllUsers();
    
    console.log(`[USERS] User ${req.user.username} (${req.user.role}) fetching all users`);
    console.log(`[USERS] Found ${users.length} users`);
    
    const safeUsers = users.map(({ password, ...user }) => user);
    
    res.json(safeUsers);
  } catch (error) {
    console.error('[USERS] Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/password', verifyToken, isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    
    console.log(`[USERS] ${req.user.username} resetting password for user ID ${userId}`);
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const users = req.app.locals.db.db.get('users').value();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    req.app.locals.db.db.get('users')
      .find({ id: userId })
      .assign({ password: hashedPassword })
      .write();
    
    console.log(`[USERS] Password reset successfully for user ${user.username}`);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('[USERS] Error resetting password:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, isAdmin, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    console.log(`[USERS] ${req.user.username} attempting to delete user ID ${userId}`);
    
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = req.app.locals.db.db.get('users').find({ id: userId }).value();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.app.locals.db.db.get('users')
      .remove({ id: userId })
      .write();
    
    console.log(`[USERS] User ${user.username} deleted successfully`);
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    console.error('[USERS] Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;