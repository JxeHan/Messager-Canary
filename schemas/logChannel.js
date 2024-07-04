const mongoose = require('mongoose');

const logChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  webhookId: { type: String, required: true },
  webhookToken: { type: String, required: true }
});

module.exports = mongoose.model('LogChannel', logChannelSchema);
