const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  lecturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecturer',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  sessionName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true
  },
  sessionDate: {
    type: Date,
    required: true
  },
  sessionTime: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    required: true,
    unique: true
  },
  qrCodeImage: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);