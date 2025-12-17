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
    type: String,
    required: true
  },
  sessionTime: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    required: true
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
  // QR Code refresh interval in seconds
  qrRefreshInterval: {
    type: Number,
    default: 5 // Default 5 seconds
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    radius: {
      type: Number,
      default: 100
    }
  },
  locationName: {
    type: String,
    default: 'Classroom'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
