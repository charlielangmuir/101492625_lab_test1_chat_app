const express = require('express');
const router = express.Router();
const GroupMessage = require('../models/GroupMessage');
const PrivateMessage = require('../models/PrivateMessage');

router.get('/room/:room', async (req, res) => {
  try {
    const messages = await GroupMessage.find({ room: req.params.room })
      .sort({ date_sent: 1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/private/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await PrivateMessage.find({
      $or: [
        { from_user: user1, to_user: user2 },
        { from_user: user2, to_user: user1 }
      ]
    }).sort({ date_sent: 1 }).limit(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;