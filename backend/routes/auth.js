const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const OTP = require('../models/OTP');
const { generateOTP, sendOTPEmail } = require('../services/emailService');

// ============== HELPER FUNCTIONS ==============

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Validate Email Format
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate Password Strength (minimum 6 characters)
const validatePassword = (password) => {
  return password && password.length >= 6;
};

// Validate OTP Format (6 digits only)
const validateOTP = (otp) => {
  return otp && /^\d{6}$/.test(otp.trim());
};

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const isEmailServiceConfigured = () => {
  const hasBrevoConfig = Boolean(
    process.env.BREVO_API_KEY &&
    (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER)
  );

  const hasSmtpConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

  return hasBrevoConfig || hasSmtpConfig;
};

const sendDependencyError = (res, message) => res.status(503).json({ message });

router.use((req, res, next) => {
  const databaseDependentRoutes = new Set([
    '/student/send-otp',
    '/lecturer/send-otp',
    '/student/register',
    '/lecturer/register',
    '/student/login',
    '/lecturer/login',
  ]);

  const emailDependentRoutes = new Set([
    '/student/send-otp',
    '/lecturer/send-otp',
  ]);

  if (databaseDependentRoutes.has(req.path) && !isDatabaseReady()) {
    return sendDependencyError(
      res,
      'Authentication service is temporarily unavailable because the database is disconnected.'
    );
  }

  if (emailDependentRoutes.has(req.path) && !isEmailServiceConfigured()) {
    return sendDependencyError(
      res,
      'OTP email service is not configured on the server. Please contact the administrator.'
    );
  }

  next();
});

const createSendOTPHandler = ({ roleLabel, UserModel }) => async (req, res) => {
  try {
    const { email, name } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    console.log('\n' + '='.repeat(80));
    console.log(`[${new Date().toISOString()}] OTP REQUEST - ${roleLabel}`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log('='.repeat(80));

    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingUser = await UserModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingOTP = await OTP.findOne({ email: normalizedEmail });
    if (existingOTP && existingOTP.resendCount >= 3) {
      return res.status(429).json({
        message: 'Maximum OTP resend limit (3) reached. Please try again after 10 minutes.'
      });
    }

    const otp = generateOTP();
    const emailAccepted = await sendOTPEmail(normalizedEmail, otp, name);

    if (!emailAccepted) {
      return res.status(500).json({
        message: 'Failed to send OTP email. Please try again in a moment.'
      });
    }

    const nextResendCount = existingOTP ? existingOTP.resendCount + 1 : 0;
    await OTP.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otp,
        attempts: 0,
        resendCount: nextResendCount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`OTP sent successfully to ${normalizedEmail}`);

    return res.json({
      message: 'OTP sent successfully to your email. Please check your inbox.',
      email: normalizedEmail,
      remainingResends: Math.max(0, 3 - nextResendCount)
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    return res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
};

// ============== SEND OTP ==============

router.post('/student/send-otp', createSendOTPHandler({
  roleLabel: 'Student',
  UserModel: Student,
}));

router.post('/lecturer/send-otp', createSendOTPHandler({
  roleLabel: 'Lecturer',
  UserModel: Lecturer,
}));

// Legacy handler retained temporarily for reference only.
router.post('/__legacy/student/send-otp', async (req, res) => {
  try {
    const { email, name } = req.body;

    // 📊 MONITORING: Log OTP request with timestamp
    console.log('\n' + '='.repeat(80));
    console.log(`📧 [${new Date().toISOString()}] OTP REQUEST - Student`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log('='.repeat(80));

    // ✅ VALIDATION: Check if required fields are present
    if (!email || !name) {
      console.log('❌ Validation failed: Missing email or name');
      return res.status(400).json({ message: 'Email and name are required' });
    }

    // ✅ VALIDATION: Check email format
    if (!validateEmail(email)) {
      console.log('❌ Validation failed: Invalid email format');
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // ✅ VALIDATION: Check if email already exists
    const existingStudent = await Student.findOne({ email: email.toLowerCase().trim() });
    if (existingStudent) {
      console.log('❌ Email already registered in database');
      return res.status(400).json({ message: 'Email already registered' });
    }

    // ✅ RATE LIMITING: Check for existing OTP and resend limit
    const existingOTP = await OTP.findOne({ email: email.toLowerCase().trim() });
    if (existingOTP && existingOTP.resendCount >= 3) {
      console.log('🚫 Max resend limit reached (3/3)');
      return res.status(429).json({ 
        message: 'Maximum OTP resend limit (3) reached. Please try again after 10 minutes.' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const emailAccepted = await sendOTPEmail(email, otp, name);
    if (!emailAccepted) {
      console.error('Failed to send email');
      return res.status(500).json({
        message: 'Failed to send OTP email. Please check your email address.'
      });
    }

    const nextResendCount = existingOTP ? existingOTP.resendCount + 1 : 0;
    await OTP.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        email: email.toLowerCase().trim(),
        otp,
        attempts: 0,
        resendCount: nextResendCount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    // 📊 MONITORING: Log generated OTP with validity
    console.log(`🔑 Generated OTP: ${otp} (Valid for 10 minutes)`);
    console.log(`📤 Sending OTP to: ${email}`);

    console.log('OTP saved to database');
    console.log(`Resend count: ${nextResendCount}/3`);
    console.log('OTP sent successfully');
    console.log(`Expires at: ${new Date(Date.now() + 600000).toISOString()}`);
    console.log('='.repeat(80) + '\n');

    return res.json({
      message: 'OTP sent successfully to your email. Please check your inbox.',
      email: email,
      remainingResends: Math.max(0, 3 - nextResendCount)
    });

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase().trim() });

    // Save new OTP with attempt and resend tracking
    const resendCount = existingOTP ? existingOTP.resendCount + 1 : 0;
    await OTP.create({ 
      email: email.toLowerCase().trim(), 
      otp, 
      attempts: 0,
      resendCount 
    });
    
    console.log(`💾 OTP saved to database`);
    console.log(`🔄 Resend count: ${resendCount}/3`);

    // Send OTP email
    const emailSent = true;

    if (!emailSent) {
      console.error('❌ Failed to send email');
      return res.status(500).json({ message: 'Failed to send OTP email. Please check your email address.' });
    }

    // 📊 MONITORING: Success log
    console.log(`✅ OTP sent successfully`);
    console.log(`⏰ Expires at: ${new Date(Date.now() + 600000).toISOString()}`);
    console.log('='.repeat(80) + '\n');

    res.json({ 
      message: 'OTP sent successfully to your email. Please check your inbox.',
      email: email,
      remainingResends: Math.max(0, 3 - resendCount)
    });
  } catch (error) {
    console.error('❌ Error in send-otp:', error);
    console.log('='.repeat(80) + '\n');
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// Legacy handler retained temporarily for reference only.
router.post('/__legacy/lecturer/send-otp', async (req, res) => {
  try {
    const { email, name } = req.body;

    // 📊 MONITORING: Log OTP request with timestamp
    console.log('\n' + '='.repeat(80));
    console.log(`📧 [${new Date().toISOString()}] OTP REQUEST - Lecturer`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log('='.repeat(80));

    // ✅ VALIDATION: Check if required fields are present
    if (!email || !name) {
      console.log('❌ Validation failed: Missing email or name');
      return res.status(400).json({ message: 'Email and name are required' });
    }

    // ✅ VALIDATION: Check email format
    if (!validateEmail(email)) {
      console.log('❌ Validation failed: Invalid email format');
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // ✅ VALIDATION: Check if email already exists
    const existingLecturer = await Lecturer.findOne({ email: email.toLowerCase().trim() });
    if (existingLecturer) {
      console.log('❌ Email already registered in database');
      return res.status(400).json({ message: 'Email already registered' });
    }

    // ✅ RATE LIMITING: Check for existing OTP and resend limit
    const existingOTP = await OTP.findOne({ email: email.toLowerCase().trim() });
    if (existingOTP && existingOTP.resendCount >= 3) {
      console.log('🚫 Max resend limit reached (3/3)');
      return res.status(429).json({ 
        message: 'Maximum OTP resend limit (3) reached. Please try again after 10 minutes.' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const emailAccepted = await sendOTPEmail(email, otp, name);
    if (!emailAccepted) {
      console.error('Failed to send email');
      return res.status(500).json({
        message: 'Failed to send OTP email. Please check your email address.'
      });
    }

    const nextResendCount = existingOTP ? existingOTP.resendCount + 1 : 0;
    await OTP.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        email: email.toLowerCase().trim(),
        otp,
        attempts: 0,
        resendCount: nextResendCount,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    // 📊 MONITORING: Log generated OTP with validity
    console.log(`🔑 Generated OTP: ${otp} (Valid for 10 minutes)`);
    console.log(`📤 Sending OTP to: ${email}`);

    console.log('OTP saved to database');
    console.log(`Resend count: ${nextResendCount}/3`);
    console.log('OTP sent successfully');
    console.log(`Expires at: ${new Date(Date.now() + 600000).toISOString()}`);
    console.log('='.repeat(80) + '\n');

    return res.json({
      message: 'OTP sent successfully to your email. Please check your inbox.',
      email: email,
      remainingResends: Math.max(0, 3 - nextResendCount)
    });

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase().trim() });

    // Save new OTP with attempt and resend tracking
    const resendCount = existingOTP ? existingOTP.resendCount + 1 : 0;
    await OTP.create({ 
      email: email.toLowerCase().trim(), 
      otp, 
      attempts: 0,
      resendCount 
    });
    
    console.log(`💾 OTP saved to database`);
    console.log(`🔄 Resend count: ${resendCount}/3`);

    // Send OTP email
    const emailSent = true;

    if (!emailSent) {
      console.error('❌ Failed to send email');
      return res.status(500).json({ message: 'Failed to send OTP email. Please check your email address.' });
    }

    // 📊 MONITORING: Success log
    console.log(`✅ OTP sent successfully`);
    console.log(`⏰ Expires at: ${new Date(Date.now() + 600000).toISOString()}`);
    console.log('='.repeat(80) + '\n');

    res.json({ 
      message: 'OTP sent successfully to your email. Please check your inbox.',
      email: email,
      remainingResends: Math.max(0, 3 - resendCount)
    });
  } catch (error) {
    console.error('❌ Error in send-otp:', error);
    console.log('='.repeat(80) + '\n');
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// ============== VERIFY OTP & REGISTER ==============

// Student Registration with MANDATORY OTP verification
router.post('/student/register', async (req, res) => {
  try {
    const { name, usn, email, password, department, semester, otp } = req.body;

    // 📊 MONITORING: Log registration attempt
    console.log('\n' + '='.repeat(80));
    console.log(`🔍 [${new Date().toISOString()}] REGISTRATION ATTEMPT - Student`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   USN: ${usn}`);
    console.log(`   Department: ${department}`);
    console.log(`   Semester: ${semester}`);
    console.log('='.repeat(80));

    // ✅ VALIDATION: Check all required fields
    if (!name || !usn || !email || !password || !department || !semester || !otp) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({ message: 'All fields including OTP are required' });
    }

    // ✅ VALIDATION: Email format
    if (!validateEmail(email)) {
      console.log('❌ Validation failed: Invalid email format');
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // ✅ VALIDATION: Password strength
    if (!validatePassword(password)) {
      console.log('❌ Validation failed: Weak password');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // ✅ VALIDATION: OTP format (6 digits only)
    if (!validateOTP(otp)) {
      console.log('❌ Validation failed: Invalid OTP format');
      return res.status(400).json({ message: 'Invalid OTP format. OTP must be 6 digits.' });
    }

    console.log('🔐 Verifying OTP...');

    // ✅ MANDATORY: Find OTP record
    const otpRecord = await OTP.findOne({ email: email.toLowerCase().trim() });
    
    if (!otpRecord) {
      console.log('❌ OTP not found or expired');
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new OTP.' });
    }

    console.log(`📝 OTP attempts so far: ${otpRecord.attempts}/5`);

    // ✅ SECURITY: Check OTP attempts (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ email: email.toLowerCase().trim() });
      console.log('🚫 Max OTP attempts (5/5) reached - OTP deleted');
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // ✅ MANDATORY: Verify OTP matches
    if (otpRecord.otp !== otp.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      const remainingAttempts = 5 - otpRecord.attempts;
      console.log(`❌ Invalid OTP entered - ${remainingAttempts} attempts remaining`);
      
      return res.status(400).json({ 
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.` 
      });
    }

    // 📊 MONITORING: OTP verified successfully
    console.log(`✅ [${new Date().toISOString()}] Email Verified: ${email}`);
    console.log('🔓 OTP verification successful');

    // ✅ VALIDATION: Check if student already exists
    const existingStudent = await Student.findOne({ 
      $or: [
        { email: email.toLowerCase().trim() }, 
        { usn: usn.trim().toUpperCase() }
      ] 
    });
    
    if (existingStudent) {
      if (existingStudent.email === email.toLowerCase().trim()) {
        console.log('❌ Email already registered');
        return res.status(400).json({ message: 'Email already registered' });
      }
      if (existingStudent.usn === usn.trim().toUpperCase()) {
        console.log('❌ USN already registered');
        return res.status(400).json({ message: 'USN already registered' });
      }
    }

    console.log('💾 Creating student account...');

    // Create student
    const student = new Student({
      name: name.trim(),
      usn: usn.trim().toUpperCase(),
      email: email.toLowerCase().trim(),
      password,
      department,
      semester: parseInt(semester),
    });

    await student.save();

    // 📊 MONITORING: User registered successfully
    console.log(`👤 [${new Date().toISOString()}] New User Registered: ${name} (${usn.trim().toUpperCase()})`);
    console.log(`📧 Email: ${email}`);
    console.log(`🎓 Department: ${department} | Semester: ${semester}`);

    // ✅ CLEANUP: Delete OTP after successful registration
    await OTP.deleteOne({ email: email.toLowerCase().trim() });
    console.log('🗑️ OTP deleted from database');

    const token = generateToken(student._id, 'student');

    console.log('✅ Registration completed successfully');
    console.log('🎫 JWT token generated');
    console.log('='.repeat(80) + '\n');

    res.status(201).json({
      message: 'Registration successful! Email verified.',
      token,
      user: {
        id: student._id,
        name: student.name,
        usn: student.usn,
        email: student.email,
        department: student.department,
        semester: student.semester,
        role: 'student',
      },
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.log('='.repeat(80) + '\n');
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field.toUpperCase()} already exists` });
    }
    
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Lecturer Registration with MANDATORY OTP verification
router.post('/lecturer/register', async (req, res) => {
  try {
    const { name, employeeId, email, password, department, subjects, otp } = req.body;

    // 📊 MONITORING: Log registration attempt
    console.log('\n' + '='.repeat(80));
    console.log(`🔍 [${new Date().toISOString()}] REGISTRATION ATTEMPT - Lecturer`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);
    console.log(`   Employee ID: ${employeeId}`);
    console.log(`   Department: ${department}`);
    console.log('='.repeat(80));

    // ✅ VALIDATION: Check all required fields
    if (!name || !employeeId || !email || !password || !department || !subjects || !otp) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({ message: 'All fields including OTP are required' });
    }

    // ✅ VALIDATION: Email format
    if (!validateEmail(email)) {
      console.log('❌ Validation failed: Invalid email format');
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // ✅ VALIDATION: Password strength
    if (!validatePassword(password)) {
      console.log('❌ Validation failed: Weak password');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // ✅ VALIDATION: OTP format (6 digits only)
    if (!validateOTP(otp)) {
      console.log('❌ Validation failed: Invalid OTP format');
      return res.status(400).json({ message: 'Invalid OTP format. OTP must be 6 digits.' });
    }

    console.log('🔐 Verifying OTP...');

    // ✅ MANDATORY: Find OTP record
    const otpRecord = await OTP.findOne({ email: email.toLowerCase().trim() });
    
    if (!otpRecord) {
      console.log('❌ OTP not found or expired');
      return res.status(400).json({ message: 'OTP expired or not found. Please request a new OTP.' });
    }

    console.log(`📝 OTP attempts so far: ${otpRecord.attempts}/5`);

    // ✅ SECURITY: Check OTP attempts (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ email: email.toLowerCase().trim() });
      console.log('🚫 Max OTP attempts (5/5) reached - OTP deleted');
      return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // ✅ MANDATORY: Verify OTP matches
    if (otpRecord.otp !== otp.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      const remainingAttempts = 5 - otpRecord.attempts;
      console.log(`❌ Invalid OTP entered - ${remainingAttempts} attempts remaining`);
      
      return res.status(400).json({ 
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.` 
      });
    }

    // 📊 MONITORING: OTP verified successfully
    console.log(`✅ [${new Date().toISOString()}] Email Verified: ${email}`);
    console.log('🔓 OTP verification successful');

    // ✅ VALIDATION: Check if lecturer already exists
    const existingLecturer = await Lecturer.findOne({ 
      $or: [
        { email: email.toLowerCase().trim() }, 
        { employeeId: employeeId.trim().toUpperCase() }
      ] 
    });
    
    if (existingLecturer) {
      if (existingLecturer.email === email.toLowerCase().trim()) {
        console.log('❌ Email already registered');
        return res.status(400).json({ message: 'Email already registered' });
      }
      if (existingLecturer.employeeId === employeeId.trim().toUpperCase()) {
        console.log('❌ Employee ID already registered');
        return res.status(400).json({ message: 'Employee ID already registered' });
      }
    }

    console.log('💾 Creating lecturer account...');

    // Parse subjects array
    const subjectsArray = Array.isArray(subjects) 
      ? subjects 
      : subjects.split(',').map(s => s.trim());

    // Create lecturer
    const lecturer = new Lecturer({
      name: name.trim(),
      employeeId: employeeId.trim().toUpperCase(),
      email: email.toLowerCase().trim(),
      password,
      department,
      subjects: subjectsArray,
    });

    await lecturer.save();

    // 📊 MONITORING: User registered successfully
    console.log(`👤 [${new Date().toISOString()}] New User Registered: ${name} (${employeeId.trim().toUpperCase()})`);
    console.log(`📧 Email: ${email}`);
    console.log(`🏢 Department: ${department}`);
    console.log(`📚 Subjects: ${subjectsArray.join(', ')}`);

    // ✅ CLEANUP: Delete OTP after successful registration
    await OTP.deleteOne({ email: email.toLowerCase().trim() });
    console.log('🗑️ OTP deleted from database');

    const token = generateToken(lecturer._id, 'lecturer');

    console.log('✅ Registration completed successfully');
    console.log('🎫 JWT token generated');
    console.log('='.repeat(80) + '\n');

    res.status(201).json({
      message: 'Registration successful! Email verified.',
      token,
      user: {
        id: lecturer._id,
        name: lecturer.name,
        employeeId: lecturer.employeeId,
        email: lecturer.email,
        department: lecturer.department,
        subjects: lecturer.subjects,
        role: 'lecturer',
      },
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.log('='.repeat(80) + '\n');
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ message: `${field.toUpperCase()} already exists` });
    }
    
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// ============== LOGIN (No OTP needed) ==============

// Student Login
router.post('/student/login', async (req, res) => {
  try {
    const { usn, password } = req.body;

    // 📊 MONITORING: Log login attempt
    console.log('\n' + '='.repeat(80));
    console.log(`🔐 [${new Date().toISOString()}] LOGIN ATTEMPT - Student`);
    console.log(`   USN: ${usn}`);
    console.log('='.repeat(80));

    // ✅ VALIDATION: Check required fields
    if (!usn || !password) {
      console.log('❌ Login failed: Missing credentials');
      return res.status(400).json({ message: 'USN and password are required' });
    }

    const student = await Student.findOne({ usn: usn.trim().toUpperCase() });
    if (!student) {
      console.log('❌ Login failed: Student not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Login failed: Invalid password');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(student._id, 'student');

    // 📊 MONITORING: Login successful
    console.log(`✅ [${new Date().toISOString()}] Login Successful`);
    console.log(`👤 Student: ${student.name} (${student.usn})`);
    console.log(`📧 Email: ${student.email}`);
    console.log(`🎫 JWT token generated`);
    console.log('='.repeat(80) + '\n');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: student._id,
        name: student.name,
        usn: student.usn,
        email: student.email,
        department: student.department,
        semester: student.semester,
        role: 'student',
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.log('='.repeat(80) + '\n');
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Lecturer Login
router.post('/lecturer/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    // 📊 MONITORING: Log login attempt
    console.log('\n' + '='.repeat(80));
    console.log(`🔐 [${new Date().toISOString()}] LOGIN ATTEMPT - Lecturer`);
    console.log(`   Employee ID: ${employeeId}`);
    console.log('='.repeat(80));

    // ✅ VALIDATION: Check required fields
    if (!employeeId || !password) {
      console.log('❌ Login failed: Missing credentials');
      return res.status(400).json({ message: 'Employee ID and password are required' });
    }

    const lecturer = await Lecturer.findOne({ employeeId: employeeId.trim().toUpperCase() });
    if (!lecturer) {
      console.log('❌ Login failed: Lecturer not found');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await lecturer.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Login failed: Invalid password');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(lecturer._id, 'lecturer');

    // 📊 MONITORING: Login successful
    console.log(`✅ [${new Date().toISOString()}] Login Successful`);
    console.log(`👤 Lecturer: ${lecturer.name} (${lecturer.employeeId})`);
    console.log(`📧 Email: ${lecturer.email}`);
    console.log(`🎫 JWT token generated`);
    console.log('='.repeat(80) + '\n');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: lecturer._id,
        name: lecturer.name,
        employeeId: lecturer.employeeId,
        email: lecturer.email,
        department: lecturer.department,
        subjects: lecturer.subjects,
        role: 'lecturer',
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.log('='.repeat(80) + '\n');
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

module.exports = router;
