const express = require('express');
const router = express.Router();
const { authMiddleware, isStudent } = require('../middleware/auth');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Mark attendance with geo-fencing
router.post('/mark', authMiddleware, isStudent, async (req, res) => {
  try {
    const { qrCode, location } = req.body;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ message: 'Location data is required' });
    }

    const session = await Session.findOne({ qrCode });

    if (!session) {
      return res.status(404).json({ message: 'Invalid QR code' });
    }

    if (!session.isActive) {
      return res.status(400).json({ message: 'This session is no longer active' });
    }

    if (new Date() > new Date(session.expiresAt)) {
      return res.status(400).json({ message: 'Session has expired' });
    }

    // Check geo-fencing
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      session.location.latitude,
      session.location.longitude
    );

    if (distance > session.location.radius) {
      return res.status(403).json({
        message: `You are too far from the class location. Distance: ${Math.round(distance)}m (Required: ${session.location.radius}m)`,
        distance: Math.round(distance),
        requiredRadius: session.location.radius
      });
    }

    // Check if already marked
    const existingAttendance = await Attendance.findOne({
      sessionId: session._id,
      studentId: req.user.id
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }

    const student = await Student.findById(req.user.id);

    const attendance = new Attendance({
      sessionId: session._id,
      studentId: req.user.id,
      studentName: student.name,
      usn: student.usn,
      subject: session.subject,
      studentLocation: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      distanceFromClass: Math.round(distance)
    });

    await attendance.save();

    res.status(201).json({
      message: 'Attendance marked successfully',
      attendance,
      distance: Math.round(distance)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
