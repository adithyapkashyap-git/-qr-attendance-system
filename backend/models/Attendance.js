const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  usn: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'present'
  }
}, { timestamps: true });

// Prevent duplicate attendance for same session
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
