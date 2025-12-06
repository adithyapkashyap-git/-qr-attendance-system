import axios from 'axios';

// API URL - uses environment variable for production, localhost for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('🔗 API Configuration:');
console.log('   Environment:', process.env.NODE_ENV);
console.log('   API URL:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout for slow connections
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request for debugging
    console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors globally
api.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log(`✅ ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    // Log error details
    if (error.response) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`);
      console.error('   Error:', error.response.data?.message || error.message);
    } else if (error.request) {
      console.error('❌ Network Error: No response received');
      console.error('   Check if backend is running at:', API_URL);
    } else {
      console.error('❌ Request Error:', error.message);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - Clearing auth data');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      
      // Only redirect if not on login/register pages
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register')) {
        console.warn('⚠️ Redirecting to home page');
        window.location.href = '/';
      }
    }

    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Request Timeout: Server took too long to respond');
      error.message = 'Request timeout. Please try again.';
    } else if (error.code === 'ERR_NETWORK') {
      console.error('❌ Network Error: Cannot connect to server');
      error.message = 'Cannot connect to server. Please check your internet connection.';
    }

    return Promise.reject(error);
  }
);

// ============== AUTH API ==============

export const authAPI = {
  // Send OTP for registration
  sendStudentOTP: (data) => {
    console.log('📧 Sending Student OTP to:', data.email);
    return api.post('/auth/student/send-otp', data);
  },
  
  sendLecturerOTP: (data) => {
    console.log('📧 Sending Lecturer OTP to:', data.email);
    return api.post('/auth/lecturer/send-otp', data);
  },
  
  // Register with OTP verification
  studentRegister: (data) => {
    console.log('👤 Registering Student:', data.email);
    return api.post('/auth/student/register', data);
  },
  
  lecturerRegister: (data) => {
    console.log('👨‍🏫 Registering Lecturer:', data.email);
    return api.post('/auth/lecturer/register', data);
  },
  
  // Login (no OTP needed)
  studentLogin: (data) => {
    console.log('🔐 Student Login:', data.usn);
    return api.post('/auth/student/login', data);
  },
  
  lecturerLogin: (data) => {
    console.log('🔐 Lecturer Login:', data.employeeId);
    return api.post('/auth/lecturer/login', data);
  },
};

// ============== LECTURER API ==============

export const lecturerAPI = {
  getProfile: () => {
    console.log('📋 Fetching Lecturer Profile');
    return api.get('/lecturer/profile');
  },
  
  createSession: (data) => {
    console.log('➕ Creating Session:', data.subject);
    return api.post('/lecturer/create-session', data);
  },
  
  getSessions: () => {
    console.log('📚 Fetching Sessions');
    return api.get('/lecturer/sessions');
  },
  
  getSessionAttendance: (sessionId) => {
    console.log('📊 Fetching Attendance for Session:', sessionId);
    return api.get(`/lecturer/session/${sessionId}/attendance`);
  },
  
  deactivateSession: (sessionId) => {
    console.log('🔴 Deactivating Session:', sessionId);
    return api.put(`/lecturer/session/${sessionId}/deactivate`);
  },
  
  getStatistics: () => {
    console.log('📈 Fetching Lecturer Statistics');
    return api.get('/lecturer/statistics');
  },
};

// ============== STUDENT API ==============

export const studentAPI = {
  getProfile: () => {
    console.log('📋 Fetching Student Profile');
    return api.get('/student/profile');
  },
  
  getAttendance: () => {
    console.log('📊 Fetching Student Attendance');
    return api.get('/student/attendance');
  },
  
  getStatistics: () => {
    console.log('📈 Fetching Student Statistics');
    return api.get('/student/statistics');
  },
};

// ============== ATTENDANCE API ==============

export const attendanceAPI = {
  markAttendance: (qrCode) => {
    console.log('✅ Marking Attendance with QR Code');
    return api.post('/attendance/mark', { qrCode });
  },
};

// Export API URL for debugging
export const getApiUrl = () => API_URL;

export default api;
