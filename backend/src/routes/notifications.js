const express = require('express');
const router = express.Router();

module.exports = (database) => {
  // GET /api/notifications - Get recent notifications
  router.get('/', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const notifications = database.getNotifications(limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  });

  // POST /api/notifications/:id/read - Mark notification as read
  router.post('/:id/read', (req, res) => {
    try {
      const { id } = req.params;
      database.markNotificationRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // POST /api/notifications/read-all - Mark all notifications as read
  router.post('/read-all', (req, res) => {
    try {
      database.markAllNotificationsRead();
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // DELETE /api/notifications - Clear all notifications
  router.delete('/', (req, res) => {
    try {
      database.clearNotifications();
      res.json({ success: true });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      res.status(500).json({ error: 'Failed to clear notifications' });
    }
  });

  return router;
};
