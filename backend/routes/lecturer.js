const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, isLecturer } = require('../middleware/auth');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Lecturer = require('../models/Lecturer');

// Create session with geo-fencing
router.post('/create-session', authMiddleware, isLecturer, async (req, res) => {
  try {
    const { 
      subject, 
      sessionName, 
      department, 
      semester, 
      duration, 
      sessionDate,
      sessionTime,
      location, 
      locationName 
    } = req.body;

    const qrData = uuidv4();
    const expiresAt = new Date(Date.now() + (duration || 10) * 60 * 1000);
    const qrCodeImage = await QRCode.toDataURL(qrData);

    const session = new Session({
      lecturerId: req.user.id,
      subject,
      sessionName,
      department,
      semester,
      sessionDate: sessionDate || new Date().toISOString().split('T')[0],
      sessionTime: sessionTime || new Date().toTimeString().slice(0, 5),
      qrCode: qrData,
      qrCodeImage,
      expiresAt,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius || 100
      },
      locationName: locationName || 'Classroom'
    });

    await session.save();
    res.status(201).json({ message: 'Session created successfully', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get new QR code for active session (for dynamic QR)
router.get('/session/:sessionId/refresh-qr', authMiddleware, isLecturer, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.sessionId,
      lecturerId: req.user.id
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (!session.isActive || new Date() > new Date(session.expiresAt)) {
      return res.status(400).json({ message: 'Session expired or inactive' });
    }

    // Generate new QR code
    const newQrData = uuidv4();
    const qrCodeImage = await QRCode.toDataURL(newQrData);

    session.qrCode = newQrData;
    session.qrCodeImage = qrCodeImage;
    await session.save();

    res.json({ qrCode: newQrData, qrCodeImage });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance statistics with graphs data
router.get('/statistics/graphs', authMiddleware, isLecturer, async (req, res) => {
  try {
    const sessions = await Session.find({ lecturerId: req.user.id });
    const sessionIds = sessions.map(s => s._id);

    // Subject-wise attendance count
    const subjectWiseStats = await Attendance.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Date-wise attendance (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dateWiseStats = await Attendance.aggregate([
      { 
        $match: { 
          sessionId: { $in: sessionIds },
          markedAt: { $gte: sevenDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$markedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Session-wise attendance
    const sessionWiseStats = await Attendance.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      { $unwind: '$session' },
      {
        $group: {
          _id: '$session.sessionName',
          count: { $sum: 1 },
          subject: { $first: '$session.subject' }
        }
      }
    ]);

    res.json({
      subjectWise: subjectWiseStats,
      dateWise: dateWiseStats,
      sessionWise: sessionWiseStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get exam eligibility report
router.get('/exam-eligibility/:semester/:department', authMiddleware, isLecturer, async (req, res) => {
  try {
    const { semester, department } = req.params;
    const Student = require('../models/Student');

    const students = await Student.find({ 
      semester: parseInt(semester), 
      department 
    });

    const eligibilityData = [];

    for (const student of students) {
      const totalSessions = await Session.countDocuments({
        lecturerId: req.user.id,
        semester: parseInt(semester),
        department
      });

      const attendedClasses = await Attendance.countDocuments({
        studentId: student._id
      });

      const attendancePercentage = totalSessions > 0 
        ? ((attendedClasses / totalSessions) * 100).toFixed(2)
        : 0;

      const isEligible = attendancePercentage >= 75;

      eligibilityData.push({
        studentId: student._id,
        name: student.name,
        usn: student.usn,
        totalSessions,
        attendedClasses,
        attendancePercentage: parseFloat(attendancePercentage),
        isEligible,
        status: isEligible ? 'Eligible' : 'Not Eligible'
      });
    }

    eligibilityData.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    res.json(eligibilityData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
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
      .populate('studentId', 'name usn email')
      .sort({ markedAt: -1 });
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

// Get lecturer profile
router.get('/profile', authMiddleware, isLecturer, async (req, res) => {
  try {
    const lecturer = await Lecturer.findById(req.user.id).select('-password');
    res.json(lecturer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get lecturer statistics
router.get('/statistics', authMiddleware, isLecturer, async (req, res) => {
  try {
    const totalSessions = await Session.countDocuments({ lecturerId: req.user.id });
    const activeSessions = await Session.countDocuments({ 
      lecturerId: req.user.id, 
      isActive: true 
    });

    const sessions = await Session.find({ lecturerId: req.user.id });
    const sessionIds = sessions.map(s => s._id);

    const totalAttendance = await Attendance.countDocuments({
      sessionId: { $in: sessionIds }
    });

    // Get unique students who attended
    const uniqueStudents = await Attendance.distinct('studentId', {
      sessionId: { $in: sessionIds }
    });

    res.json({
      totalSessions,
      activeSessions,
      totalAttendance,
      uniqueStudents: uniqueStudents.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
