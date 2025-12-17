const express = require('express');
const router = express.Router();
const { authMiddleware, isStudent } = require('../middleware/auth');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');

// Get student profile
router.get('/profile', authMiddleware, isStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select('-password');
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student attendance records
router.get('/attendance', authMiddleware, isStudent, async (req, res) => {
  try {
    const attendance = await Attendance.find({ studentId: req.user.id })
      .populate('sessionId', 'subject sessionName createdAt')
      .sort({ markedAt: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get comprehensive statistics
router.get('/statistics', authMiddleware, isStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    
    // Get all sessions for this student's department and semester
    const allSessions = await Session.find({
      department: student.department,
      semester: student.semester
    });

    // Get attendance records
    const attendanceRecords = await Attendance.find({ 
      studentId: req.user.id 
    });

    const totalSessions = allSessions.length;
    const attendedSessions = attendanceRecords.length;
    const missedSessions = totalSessions - attendedSessions;
    const attendancePercentage = totalSessions > 0 
      ? ((attendedSessions / totalSessions) * 100).toFixed(2)
      : 0;

    // Subject-wise attendance
    const subjectWiseAttendance = await Attendance.aggregate([
      { $match: { studentId: student._id } },
      { $group: { _id: '$subject', attended: { $sum: 1 } } },
      { $sort: { attended: -1 } }
    ]);

    // Recent attendance (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAttendance = await Attendance.aggregate([
      { 
        $match: { 
          studentId: student._id,
          markedAt: { $gte: sevenDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$markedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    res.json({
      totalSessions,
      attendedSessions,
      missedSessions,
      attendancePercentage: parseFloat(attendancePercentage),
      totalClasses: attendedSessions, // For backward compatibility
      subjectWiseAttendance,
      subjectStats: subjectWiseAttendance, // For backward compatibility
      recentAttendance
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get exam eligibility
router.get('/exam-eligibility', authMiddleware, isStudent, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    
    const allSessions = await Session.find({
      department: student.department,
      semester: student.semester
    });

    const attendanceRecords = await Attendance.find({ 
      studentId: req.user.id 
    });

    const totalSessions = allSessions.length;
    const attendedSessions = attendanceRecords.length;
    const attendancePercentage = totalSessions > 0 
      ? ((attendedSessions / totalSessions) * 100).toFixed(2)
      : 0;

    const isEligible = parseFloat(attendancePercentage) >= 75;
    const classesNeeded = Math.max(
      0,
      Math.ceil((0.75 * totalSessions - attendedSessions) / 0.25)
    );

    res.json({
      isEligible,
      attendancePercentage: parseFloat(attendancePercentage),
      totalSessions,
      attendedSessions,
      classesNeeded,
      minimumRequired: 75
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
