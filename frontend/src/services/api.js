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
      
      // Log additional error details for geo-fencing
      if (error.response.data?.distance && error.response.data?.requiredRadius) {
        console.error(`   📍 Distance: ${error.response.data.distance}m (Required: ${error.response.data.requiredRadius}m)`);
      }
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
    console.log('📍 Location:', data.location?.latitude, data.location?.longitude);
    console.log('📏 Radius:', data.location?.radius, 'meters');
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
  
  // Dynamic QR Code - Refresh every 5 seconds
  refreshQRCode: (sessionId) => {
    console.log('🔄 Refreshing QR Code for Session:', sessionId);
    return api.get(`/lecturer/session/${sessionId}/refresh-qr`);
  },
  
  getStatistics: () => {
    console.log('📈 Fetching Lecturer Statistics');
    return api.get('/lecturer/statistics');
  },
  
  // Graph Statistics - For charts and analytics
  getGraphStats: () => {
    console.log('📊 Fetching Graph Statistics');
    return api.get('/lecturer/statistics/graphs');
  },
  
  // Exam Eligibility Report
  getExamEligibility: (semester, department) => {
    console.log('🎓 Fetching Exam Eligibility Report');
    console.log('   Semester:', semester, '| Department:', department);
    return api.get(`/lecturer/exam-eligibility/${semester}/${department}`);
  },
  
  // Get all students by department and semester
  getStudents: (department, semester) => {
    console.log('👥 Fetching Students:', department, '- Semester', semester);
    return api.get(`/lecturer/students/${department}/${semester}`);
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
  
  // Get subject-wise attendance details
  getSubjectAttendance: (subject) => {
    console.log('📚 Fetching Attendance for Subject:', subject);
    return api.get(`/student/attendance/subject/${subject}`);
  },
  
  // Get exam eligibility status
  getExamEligibility: () => {
    console.log('🎓 Checking Exam Eligibility');
    return api.get('/student/exam-eligibility');
  },
};

// ============== ATTENDANCE API ==============

export const attendanceAPI = {
  // Mark attendance with QR code and location
  markAttendance: (data) => {
    if (typeof data === 'string') {
      // Legacy support: if string is passed, convert to object
      console.log('✅ Marking Attendance with QR Code (Legacy)');
      return api.post('/attendance/mark', { qrCode: data });
    } else {
      // New format with location
      console.log('✅ Marking Attendance with Location');
      console.log('   QR Code:', data.qrCode?.substring(0, 20) + '...');
      console.log('   📍 Location:', data.location?.latitude, data.location?.longitude);
      return api.post('/attendance/mark', data);
    }
  },
  
  // Get attendance history with filters
  getAttendanceHistory: (filters = {}) => {
    console.log('📜 Fetching Attendance History');
    const params = new URLSearchParams(filters).toString();
    return api.get(`/attendance/history?${params}`);
  },
  
  // Get attendance by date range
  getAttendanceByDateRange: (startDate, endDate) => {
    console.log('📅 Fetching Attendance from', startDate, 'to', endDate);
    return api.get('/attendance/date-range', {
      params: { startDate, endDate }
    });
  },
};

// ============== ANALYTICS API ==============

export const analyticsAPI = {
  // Student Analytics
  getStudentAnalytics: () => {
    console.log('📊 Fetching Student Analytics');
    return api.get('/analytics/student');
  },
  
  // Lecturer Analytics
  getLecturerAnalytics: () => {
    console.log('📊 Fetching Lecturer Analytics');
    return api.get('/analytics/lecturer');
  },
  
  // Department-wise analytics
  getDepartmentAnalytics: (department) => {
    console.log('📊 Fetching Analytics for Department:', department);
    return api.get(`/analytics/department/${department}`);
  },
  
  // Semester-wise analytics
  getSemesterAnalytics: (semester) => {
    console.log('📊 Fetching Analytics for Semester:', semester);
    return api.get(`/analytics/semester/${semester}`);
  },
};

// ============== LOCATION API ==============

export const locationAPI = {
  // Verify location is within classroom radius
  verifyLocation: (sessionId, location) => {
    console.log('📍 Verifying Location for Session:', sessionId);
    console.log('   Coordinates:', location.latitude, location.longitude);
    return api.post('/location/verify', {
      sessionId,
      location
    });
  },
  
  // Get classroom location details
  getClassroomLocation: (sessionId) => {
    console.log('🏫 Fetching Classroom Location for Session:', sessionId);
    return api.get(`/location/classroom/${sessionId}`);
  },
};

// ============== UTILITY FUNCTIONS ==============

// Export API URL for debugging
export const getApiUrl = () => {
  console.log('🔗 Current API URL:', API_URL);
  return API_URL;
};

// Test API connection
export const testConnection = async () => {
  try {
    console.log('🔌 Testing API Connection...');
    const response = await api.get('/health');
    console.log('✅ API Connection Successful');
    return response.data;
  } catch (error) {
    console.error('❌ API Connection Failed');
    throw error;
  }
};

// Get current user info from token
export const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const user = localStorage.getItem('user');
  
  if (!token) {
    console.warn('⚠️ No authentication token found');
    return null;
  }
  
  console.log('👤 Current User:', role);
  return {
    token,
    role,
    user: user ? JSON.parse(user) : null
  };
};

// Clear authentication data
export const clearAuth = () => {
  console.log('🧹 Clearing authentication data');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const isAuth = !!token;
  console.log('🔐 Authentication Status:', isAuth ? 'Authenticated' : 'Not Authenticated');
  return isAuth;
};

// Get user role
export const getUserRole = () => {
  const role = localStorage.getItem('role');
  console.log('👤 User Role:', role || 'None');
  return role;
};

// Format error message for display
export const formatErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Download attendance report
export const downloadAttendanceReport = async (sessionId, format = 'csv') => {
  try {
    console.log('📥 Downloading Attendance Report');
    console.log('   Session:', sessionId, '| Format:', format);
    
    const response = await api.get(`/lecturer/session/${sessionId}/download`, {
      params: { format },
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-${sessionId}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    console.log('✅ Download Complete');
  } catch (error) {
    console.error('❌ Download Failed:', error);
    throw error;
  }
};

// ============== EXPORTS ==============

export default api;

// Export all APIs as named exports
export {
  api,
  API_URL,
};

// Log API initialization
console.log('✅ API Service Initialized');
console.log('📦 Available APIs:', [
  'authAPI',
  'lecturerAPI',
  'studentAPI',
  'attendanceAPI',
  'analyticsAPI',
  'locationAPI'
].join(', '));