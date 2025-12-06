const express = require('express');
const router = express.Router();
const Lecturer = require('../models/Lecturer');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const { authMiddleware, isLecturer } = require('../middleware/auth');
const QRCode = require('qrcode');

// Get lecturer profile
router.get('/profile', authMiddleware, isLecturer, async (req, res) => {
  try {
    const lecturer = await Lecturer.findById(req.user.id).select('-password');
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }
    res.json(lecturer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create session with date and time
router.post('/create-session', authMiddleware, isLecturer, async (req, res) => {
  try {
    const { subject, sessionName, department, semester, sessionDate, sessionTime, duration } = req.body;

    // Generate unique QR code
    const qrCode = `${req.user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + (duration || 30) * 60000);

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrCode);

    const session = new Session({
      lecturerId: req.user.id,
      subject,
      sessionName,
      department,
      semester,
      sessionDate: new Date(sessionDate),
      sessionTime,
      qrCode,
      qrCodeImage,
      expiresAt
    });

    await session.save();
    res.status(201).json({ message: 'Session created successfully', session });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create session', error: error.message });
  }
});

// Get all sessions
router.get('/sessions', authMiddleware, isLecturer, async (req, res) => {
  try {
    const sessions = await Session.find({ lecturerId: req.user.id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get session attendance
router.get('/session/:sessionId/attendance', authMiddleware, isLecturer, async (req, res) => {
  try {
    const attendance = await Attendance.find({ sessionId: req.params.sessionId })
      .populate('studentId', 'name usn email');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Deactivate session
router.put('/session/:sessionId/deactivate', authMiddleware, isLecturer, async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.sessionId, lecturerId: req.user.id },
      { isActive: false },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json({ message: 'Session deactivated', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get statistics
router.get('/statistics', authMiddleware, isLecturer, async (req, res) => {
  try {
    const totalSessions = await Session.countDocuments({ lecturerId: req.user.id });
    const activeSessions = await Session.countDocuments({ lecturerId: req.user.id, isActive: true });
    
    // Get all session IDs for this lecturer
    const sessionIds = await Session.find({ lecturerId: req.user.id }).distinct('_id');
    
    const totalAttendance = await Attendance.countDocuments({
      sessionId: { $in: sessionIds }
    });

    res.json({
      totalSessions,
      activeSessions,
      totalAttendance,
      inactiveSessions: totalSessions - activeSessions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;