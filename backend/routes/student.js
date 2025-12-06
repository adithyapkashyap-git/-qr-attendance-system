const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const { authMiddleware, isStudent } = require('../middleware/auth');

// Get student profile
router.get('/profile', authMiddleware, isStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student attendance records
router.get('/attendance', authMiddleware, isStudent, async (req, res) => {
  try {
    const attendance = await Attendance.find({ studentId: req.user.id })
      .populate('sessionId')
      .sort({ markedAt: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get statistics
router.get('/statistics', authMiddleware, isStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get total sessions for student's department and semester
    const totalSessions = await Session.countDocuments({
      department: student.department,
      semester: student.semester
    });

    // Get attended sessions
    const attendedSessions = await Attendance.countDocuments({
      studentId: req.user.id
    });

    // Calculate missed sessions
    const missedSessions = totalSessions - attendedSessions;

    // Calculate attendance percentage
    const attendancePercentage = totalSessions > 0 
      ? ((attendedSessions / totalSessions) * 100).toFixed(2)
      : 0;

    // Get subject-wise attendance
    const subjectWiseAttendance = await Attendance.aggregate([
      { $match: { studentId: student._id } },
      { $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session'
      }},
      { $unwind: '$session' },
      { $group: {
          _id: '$session.subject',
          attended: { $sum: 1 }
      }}
    ]);

    res.json({
      totalSessions,
      attendedSessions,
      missedSessions,
      attendancePercentage,
      subjectWiseAttendance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;