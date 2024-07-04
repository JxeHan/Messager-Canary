const mongoose = require('mongoose');

const userMessageCountSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  guildId: { type: String, required: true },
  messageCount: { type: Number, default: 0 },
  premium: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  purchasedItems: { type: Array, default: [] },
  lastMessage: {
    content: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
  }
});

module.exports = mongoose.model('UserMessageCount', userMessageCountSchema);
