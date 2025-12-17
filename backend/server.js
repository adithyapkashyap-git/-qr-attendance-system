const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ============== MIDDLEWARE ==============

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  process.env.FRONTEND_URL, // Will be your Vercel URL
  'https://your-app.vercel.app', // Replace with your actual Vercel URL
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all for now - change to false in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ DETAILED REQUEST LOGGING MIDDLEWARE (MUST BE AFTER BODY PARSER)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  
  console.log('\n' + '━'.repeat(100));
  console.log(`📡 [${timestamp}] ${req.method} ${req.path}`);
  console.log('━'.repeat(100));
  
  // Log request headers
  if (req.headers.authorization) {
    console.log('🔑 Authorization: Present');
  }
  
  // Log request body (if exists)
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Request Body:');
    
    // Hide sensitive data in logs
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) {
      sanitizedBody.password = '***HIDDEN***';
    }
    if (sanitizedBody.otp) {
      sanitizedBody.otp = `***${sanitizedBody.otp.slice(-2)}`;
    }
    
    console.log(JSON.stringify(sanitizedBody, null, 2));
  }
  
  // Log query params (if exists)
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('🔍 Query Params:', JSON.stringify(req.query, null, 2));
  }
  
  // Log origin
  if (req.headers.origin) {
    console.log('🌐 Origin:', req.headers.origin);
  }
  
  console.log('━'.repeat(100) + '\n');
  
  next();
});

// ============== ROUTES ==============

// Import route files
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const lecturerRoutes = require('./routes/lecturer');
const attendanceRoutes = require('./routes/attendance');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/attendance', attendanceRoutes);

// ============== HEALTH CHECK & ROOT ==============

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: '🎓 QR Attendance System API',
    status: 'active',
    version: '2.0.0',
    features: [
      'Geo-fencing',
      'Dynamic QR Codes (5s refresh)',
      'Graph Statistics',
      'Exam Eligibility Tracking'
    ],
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      student: '/api/student',
      lecturer: '/api/lecturer',
      attendance: '/api/attendance',
      health: '/api/health'
    }
  });
});

// Detailed health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Get database stats
    let dbStats = {};
    if (mongoose.connection.readyState === 1) {
      const db = mongoose.connection.db;
      const stats = await db.stats();
      dbStats = {
        collections: stats.collections,
        dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
        indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`
      };
    }

    res.json({
      status: 'OK',
      message: 'QR Attendance System API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        name: mongoose.connection.name || 'Not connected',
        host: mongoose.connection.host || 'Not connected',
        ...dbStats
      },
      memory: {
        usage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
      },
      node: process.version
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'QR Attendance System API Documentation',
    version: '2.0.0',
    baseURL: `${req.protocol}://${req.get('host')}/api`,
    endpoints: {
      authentication: {
        'POST /auth/student/send-otp': 'Send OTP for student registration',
        'POST /auth/student/register': 'Register new student with OTP',
        'POST /auth/student/login': 'Student login',
        'POST /auth/lecturer/send-otp': 'Send OTP for lecturer registration',
        'POST /auth/lecturer/register': 'Register new lecturer with OTP',
        'POST /auth/lecturer/login': 'Lecturer login'
      },
      student: {
        'GET /student/profile': 'Get student profile (Auth required)',
        'GET /student/attendance': 'Get attendance records (Auth required)',
        'GET /student/statistics': 'Get attendance statistics (Auth required)',
        'GET /student/exam-eligibility': 'Check exam eligibility (Auth required)'
      },
      lecturer: {
        'GET /lecturer/profile': 'Get lecturer profile (Auth required)',
        'POST /lecturer/create-session': 'Create attendance session with geo-fencing (Auth required)',
        'GET /lecturer/sessions': 'Get all sessions (Auth required)',
        'GET /lecturer/session/:id/attendance': 'Get session attendance (Auth required)',
        'GET /lecturer/session/:id/refresh-qr': 'Refresh dynamic QR code (Auth required)',
        'PUT /lecturer/session/:id/deactivate': 'Deactivate session (Auth required)',
        'GET /lecturer/statistics': 'Get lecturer statistics (Auth required)',
        'GET /lecturer/statistics/graphs': 'Get graph statistics (Auth required)',
        'GET /lecturer/exam-eligibility/:semester/:department': 'Get exam eligibility report (Auth required)'
      },
      attendance: {
        'POST /attendance/mark': 'Mark attendance with QR code and location (Auth required)'
      }
    },
    features: {
      geofencing: 'Students must be within classroom radius to mark attendance',
      dynamicQR: 'QR codes refresh every 5 seconds for security',
      analytics: 'Comprehensive statistics and graphs',
      examEligibility: 'Automatic calculation based on 75% threshold'
    }
  });
});

// ============== ERROR HANDLING ==============

// 404 handler - Route not found
app.use((req, res, next) => {
  console.log('\n' + '━'.repeat(100));
  console.log(`❌ 404 NOT FOUND - ${req.method} ${req.path}`);
  console.log('━'.repeat(100) + '\n');
  
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    availableEndpoints: {
      root: '/',
      health: '/api/health',
      docs: '/api/docs',
      auth: '/api/auth/*',
      student: '/api/student/*',
      lecturer: '/api/lecturer/*',
      attendance: '/api/attendance/*'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.log('\n' + '━'.repeat(100));
  console.log('💥 ERROR HANDLER TRIGGERED');
  console.log('━'.repeat(100));
  console.error('❌ Error Name:', err.name);
  console.error('❌ Error Message:', err.message);
  console.error('❌ Error Stack:', err.stack);
  console.log('━'.repeat(100) + '\n');
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: Object.values(err.errors).map(e => e.message)
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: 'Duplicate Error',
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Token expired'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============== DATABASE CONNECTION ==============

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance';

console.log('\n' + '━'.repeat(100));
console.log('🔄 Connecting to MongoDB...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('━'.repeat(100) + '\n');

// ✅ FIXED: Removed deprecated options
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('━'.repeat(100));
    console.log('✅ MongoDB Connected Successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌐 Host: ${mongoose.connection.host}`);
    console.log('━'.repeat(100) + '\n');
    
    // Start server only after DB connection
    app.listen(PORT, () => {
      console.log('━'.repeat(100));
      console.log('🚀 QR ATTENDANCE SYSTEM API');
      console.log('━'.repeat(100));
      console.log(`🌍 Server running on port ${PORT}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`📚 Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      console.log('━'.repeat(100));
      console.log('✨ Features:');
      console.log('   📍 Geo-fencing enabled');
      console.log('   🔄 Dynamic QR codes (5s refresh)');
      console.log('   📊 Graph statistics');
      console.log('   🎓 Exam eligibility tracking');
      console.log('━'.repeat(100));
      console.log('\n⏳ Server ready. Waiting for requests...\n');
    });
  })
  .catch((err) => {
    console.log('━'.repeat(100));
    console.log('❌ MONGODB CONNECTION FAILED');
    console.log('━'.repeat(100));
    console.error('Error:', err.message);
    console.log('━'.repeat(100));
    console.log('💡 Troubleshooting:');
    console.log('   1. Check if MongoDB is running');
    console.log('   2. Verify MONGODB_URI in .env file');
    console.log('   3. Check network connectivity');
    console.log('   4. Ensure MongoDB URI format is correct');
    console.log('━'.repeat(100) + '\n');
    process.exit(1);
  });

// ============== GRACEFUL SHUTDOWN ==============

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.log('\n' + '━'.repeat(100));
  console.error('❌ MongoDB Error:', err);
  console.log('━'.repeat(100) + '\n');
});

mongoose.connection.on('disconnected', () => {
  console.log('\n' + '━'.repeat(100));
  console.warn('⚠️ MongoDB Disconnected');
  console.log('━'.repeat(100) + '\n');
});

mongoose.connection.on('reconnected', () => {
  console.log('\n' + '━'.repeat(100));
  console.log('✅ MongoDB Reconnected');
  console.log('━'.repeat(100) + '\n');
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received. Starting graceful shutdown...`);
  
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.log('\n' + '━'.repeat(100));
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  console.log('━'.repeat(100) + '\n');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.log('\n' + '━'.repeat(100));
  console.error('❌ Uncaught Exception:', error);
  console.log('━'.repeat(100) + '\n');
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Export app for testing
module.exports = app;
