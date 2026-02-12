const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
  from_user: {
    type: String,
    required: [true, 'User is required']
  },
  room: {
    type: String,
    required: [true, 'Room is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required']
  },
  date_sent: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
