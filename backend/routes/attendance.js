const express = require('express');
const router = express.Router();
const { authMiddleware, isStudent } = require('../middleware/auth');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// Mark attendance by scanning QR code
router.post('/mark', authMiddleware, isStudent, async (req, res) => {
  try {
    const { qrCode } = req.body;

    // Find the session with this QR code
    const session = await Session.findOne({ qrCode });

    if (!session) {
      return res.status(404).json({ message: 'Invalid QR code' });
    }

    // Check if session is active
    if (!session.isActive) {
      return res.status(400).json({ message: 'This session is no longer active' });
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      await Session.findByIdAndUpdate(session._id, { isActive: false });
      return res.status(400).json({ message: 'This session has expired' });
    }

    // Get student details
    const student = await Student.findById(req.user.id);

    // Check if attendance already marked
    const existingAttendance = await Attendance.findOne({
      sessionId: session._id,
      studentId: req.user.id
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }

    // Create attendance record
    const attendance = new Attendance({
      sessionId: session._id,
      studentId: req.user.id,
      studentName: student.name,
      usn: student.usn,
      subject: session.subject,
      status: 'present'
    });

    await attendance.save();

    res.status(201).json({
      message: 'Attendance marked successfully',
      attendance: {
        subject: session.subject,
        sessionName: session.sessionName,
        markedAt: attendance.markedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
