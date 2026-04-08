import axios from 'axios';

// ============== API CONFIGURATION ==============

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEFAULT_PRODUCTION_API_URL = 'https://qr-attendance-system-q8yu.onrender.com/api';
const DEFAULT_DEVELOPMENT_API_URL = 'http://localhost:5000/api';
const API_URL = (
  process.env.REACT_APP_API_URL?.trim() ||
  (IS_PRODUCTION ? DEFAULT_PRODUCTION_API_URL : DEFAULT_DEVELOPMENT_API_URL)
).replace(/\/+$/, '');
const API_TIMEOUT_MS = IS_PRODUCTION ? 90000 : 30000;
const BACKEND_WAKE_UP_MESSAGE = IS_PRODUCTION
  ? 'The live server is starting up or temporarily unavailable. Please wait about a minute and try again.'
  : 'Cannot connect to the backend server. Please make sure it is running.';
const BACKEND_PING_PATH = '/ping';
const BACKEND_WAKE_RETRY_ATTEMPTS = IS_PRODUCTION ? 8 : 1;
const BACKEND_WAKE_RETRY_DELAY_MS = 15000;
const warmupClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
});

let backendWarmupPromise = null;
let lastBackendWarmupAt = 0;
const BACKEND_WARMUP_CACHE_MS = 5 * 60 * 1000;
const BACKEND_RETRYABLE_STATUSES = new Set([502, 503, 504, 521, 522, 523, 524]);

const getCurrentRoute = () => {
  const hashPath = window.location.hash.replace(/^#/, '') || '/';
  return hashPath.startsWith('/') ? hashPath : `/${hashPath}`;
};

const normalizeErrorMessage = (error) => {
  const status = error.response?.status;

  if ([521, 522, 523, 524].includes(status)) {
    const message = BACKEND_WAKE_UP_MESSAGE;
    if (!error.response.data || typeof error.response.data !== 'object') {
      error.response.data = {};
    }
    error.response.data.message = message;
    error.message = message;
    return error;
  }

  if (error.code === 'ECONNABORTED') {
    error.message = IS_PRODUCTION
      ? `${BACKEND_WAKE_UP_MESSAGE} The first request can take longer on hosted backends.`
      : 'Request timeout. Please try again.';
    return error;
  }

  if (error.code === 'ERR_NETWORK') {
    error.message = BACKEND_WAKE_UP_MESSAGE;
    return error;
  }

  return error;
};

const sleep = (ms) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const shouldRetryWarmupError = (error) => {
  const status = error.response?.status;
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK' ||
    BACKEND_RETRYABLE_STATUSES.has(status)
  );
};

const shouldWarmBackend = () => IS_PRODUCTION && API_URL.startsWith('https://');

const warmUpBackend = async () => {
  if (!shouldWarmBackend()) {
    return;
  }

  if (Date.now() - lastBackendWarmupAt < BACKEND_WARMUP_CACHE_MS) {
    return;
  }

  if (!backendWarmupPromise) {
    backendWarmupPromise = (async () => {
      let lastError = null;

      for (let attempt = 1; attempt <= BACKEND_WAKE_RETRY_ATTEMPTS; attempt += 1) {
        try {
          await warmupClient.get(BACKEND_PING_PATH);
          lastBackendWarmupAt = Date.now();
          return;
        } catch (error) {
          lastError = normalizeErrorMessage(error);

          if (!shouldRetryWarmupError(lastError) || attempt === BACKEND_WAKE_RETRY_ATTEMPTS) {
            throw lastError;
          }

          console.warn(
            `Backend warm-up attempt ${attempt}/${BACKEND_WAKE_RETRY_ATTEMPTS} failed. Retrying in ${BACKEND_WAKE_RETRY_DELAY_MS / 1000}s...`
          );
          await sleep(BACKEND_WAKE_RETRY_DELAY_MS);
        }
      }

      throw lastError;
    })().finally(() => {
      backendWarmupPromise = null;
    });
  }

  return backendWarmupPromise;
};

console.log('\n' + '━'.repeat(80));
console.log('🔗 API SERVICE INITIALIZATION');
console.log('━'.repeat(80));
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🌐 API Base URL:', API_URL);
console.log('⏱️  Timeout:', '30 seconds');
console.log('━'.repeat(80) + '\n');

// ============== AXIOS INSTANCE ==============

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT_MS,
  withCredentials: true, // Send cookies with requests
});

// ============== REQUEST INTERCEPTOR ==============

api.interceptors.request.use(
  (config) => {
    // Add authentication token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details
    console.log('\n' + '━'.repeat(80));
    console.log(`📤 OUTGOING REQUEST - ${config.method?.toUpperCase()} ${config.url}`);
    console.log('━'.repeat(80));
    console.log('🌐 Full URL:', `${config.baseURL}${config.url}`);
    
    if (token) {
      console.log('🔑 Authorization: Token Present');
    }
    
    if (config.data && Object.keys(config.data).length > 0) {
      // Sanitize sensitive data
      const sanitizedData = { ...config.data };
      if (sanitizedData.password) {
        sanitizedData.password = '***HIDDEN***';
      }
      if (sanitizedData.otp && sanitizedData.otp.length > 2) {
        sanitizedData.otp = `***${sanitizedData.otp.slice(-2)}`;
      }
      console.log('📦 Request Data:', JSON.stringify(sanitizedData, null, 2));
    }
    
    if (config.params) {
      console.log('🔍 Query Params:', config.params);
    }
    
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('━'.repeat(80) + '\n');
    
    return config;
  },
  (error) => {
    console.log('\n' + '━'.repeat(80));
    console.error('❌ REQUEST INTERCEPTOR ERROR');
    console.log('━'.repeat(80));
    console.error('Error:', error.message);
    console.log('━'.repeat(80) + '\n');
    return Promise.reject(error);
  }
);

// ============== RESPONSE INTERCEPTOR ==============

api.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log('\n' + '━'.repeat(80));
    console.log(`✅ RESPONSE RECEIVED - ${response.config.method?.toUpperCase()} ${response.config.url}`);
    console.log('━'.repeat(80));
    console.log('📊 Status:', response.status, response.statusText);
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    if (response.data) {
      // Sanitize sensitive data in logs
      const sanitizedData = { ...response.data };
      if (sanitizedData.token) {
        sanitizedData.token = `${sanitizedData.token.substring(0, 20)}...`;
      }
      if (sanitizedData.user?.password) {
        delete sanitizedData.user.password;
      }
      console.log('📥 Response Data:', JSON.stringify(sanitizedData, null, 2));
    }
    
    console.log('━'.repeat(80) + '\n');
    return response;
  },
  (error) => {
    // Log error response
    normalizeErrorMessage(error);
    console.log('\n' + '━'.repeat(80));
    console.log('❌ ERROR RESPONSE');
    console.log('━'.repeat(80));
    
    if (error.response) {
      // Server responded with error status
      console.log('📡 Request:', `${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      console.log('📊 Status:', error.response.status, error.response.statusText);
      console.log('💬 Error Message:', error.response.data?.message || error.message);
      
      if (error.response.data) {
        console.log('📥 Error Details:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Log geo-fencing specific errors
      if (error.response.data?.distance && error.response.data?.requiredRadius) {
        console.log('📍 Geo-fencing Issue:');
        console.log(`   Distance: ${error.response.data.distance}m`);
        console.log(`   Required Radius: ${error.response.data.requiredRadius}m`);
        console.log(`   Difference: ${(error.response.data.distance - error.response.data.requiredRadius).toFixed(2)}m`);
      }
      
    } else if (error.request) {
      // Request was made but no response received
      console.log('🌐 Network Error: No response from server');
      console.log('📡 Request:', error.config?.url);
      console.log('💡 Possible causes:');
      console.log('   - Backend server is not running');
      console.log('   - Network connection issues');
      console.log('   - CORS configuration problems');
      console.log('   - Firewall blocking the request');
      console.log(`\n🔍 Check if backend is running at: ${API_URL}`);
      
    } else {
      // Error in request setup
      console.log('⚙️ Request Setup Error:', error.message);
    }
    
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('━'.repeat(80) + '\n');
    
    // Handle specific HTTP status codes
    if (error.response?.status === 401) {
      console.warn('⚠️ UNAUTHORIZED (401) - Clearing authentication data');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      
      // Only redirect if not on public pages
      const publicPaths = ['/login', '/register', '/', '/student/login', '/lecturer/login', '/student/register', '/lecturer/register'];
      const currentPath = getCurrentRoute();
      
      if (!publicPaths.includes(currentPath) && !publicPaths.some(path => currentPath.includes(path))) {
        console.warn('⚠️ Redirecting to home page');
        setTimeout(() => {
          window.location.replace(`${window.location.pathname}#/`);
        }, 1000);
      }
    }
    
    if (error.response?.status === 403) {
      console.error('🚫 FORBIDDEN (403) - Access denied');
    }
    
    if (error.response?.status === 404) {
      console.error('🔍 NOT FOUND (404) - Resource not found');
    }
    
    if (error.response?.status === 500) {
      console.error('💥 SERVER ERROR (500) - Internal server error');
    }
    
    // Handle network/timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ REQUEST TIMEOUT: Server took too long to respond');
      error.message = normalizeErrorMessage(error).message;
    } else if (error.code === 'ERR_NETWORK') {
      console.error('🌐 NETWORK ERROR: Cannot connect to server');
      error.message = normalizeErrorMessage(error).message;
    }
    
    return Promise.reject(error);
  }
);

// ============== AUTH API ==============

export const authAPI = {
  // ✅ STEP 1: Send OTP for Student Registration
  sendStudentOTP: async (email, name) => {
    console.log('\n📧 SENDING STUDENT OTP');
    console.log('   Email:', email);
    console.log('   Name:', name);
    await warmUpBackend();
    return api.post('/auth/student/send-otp', { email, name });
  },
  
  // ✅ STEP 1: Send OTP for Lecturer Registration
  sendLecturerOTP: async (email, name) => {
    console.log('\n📧 SENDING LECTURER OTP');
    console.log('   Email:', email);
    console.log('   Name:', name);
    await warmUpBackend();
    return api.post('/auth/lecturer/send-otp', { email, name });
  },
  
  // ✅ STEP 2: Register Student with OTP Verification
  registerStudent: async (data) => {
    console.log('\n👤 REGISTERING STUDENT');
    console.log('   Name:', data.name);
    console.log('   USN:', data.usn);
    console.log('   Email:', data.email);
    console.log('   Department:', data.department);
    console.log('   Semester:', data.semester);
    console.log('   Password:', data.password ? '***HIDDEN***' : 'Missing');
    console.log('   OTP:', data.otp ? `***${data.otp.slice(-2)}` : 'Missing');
    
    await warmUpBackend();
    return api.post('/auth/student/register', {
      name: data.name,
      usn: data.usn,
      email: data.email,
      password: data.password,
      department: data.department,
      semester: data.semester,
      otp: data.otp
    });
  },
  
  // ✅ STEP 2: Register Lecturer with OTP Verification
  registerLecturer: async (data) => {
    console.log('\n👨‍🏫 REGISTERING LECTURER');
    console.log('   Name:', data.name);
    console.log('   Employee ID:', data.employeeId);
    console.log('   Email:', data.email);
    console.log('   Department:', data.department);
    console.log('   Subjects:', data.subjects);
    console.log('   Password:', data.password ? '***HIDDEN***' : 'Missing');
    console.log('   OTP:', data.otp ? `***${data.otp.slice(-2)}` : 'Missing');
    
    await warmUpBackend();
    return api.post('/auth/lecturer/register', {
      name: data.name,
      employeeId: data.employeeId,
      email: data.email,
      password: data.password,
      department: data.department,
      subjects: data.subjects,
      otp: data.otp
    });
  },
  
  // ✅ Student Login (No OTP needed)
  loginStudent: async (usn, password) => {
    console.log('\n🔐 STUDENT LOGIN');
    console.log('   USN:', usn);
    console.log('   Password:', password ? '***HIDDEN***' : 'Missing');
    await warmUpBackend();
    return api.post('/auth/student/login', { usn, password });
  },
  
  // ✅ Lecturer Login (No OTP needed)
  loginLecturer: async (employeeId, password) => {
    console.log('\n🔐 LECTURER LOGIN');
    console.log('   Employee ID:', employeeId);
    console.log('   Password:', password ? '***HIDDEN***' : 'Missing');
    await warmUpBackend();
    return api.post('/auth/lecturer/login', { employeeId, password });
  },
  
  // Get current user
  getCurrentUser: () => {
    console.log('\n👤 FETCHING CURRENT USER');
    return api.get('/auth/me');
  },
};

// ============== LECTURER API ==============

export const lecturerAPI = {
  getProfile: () => {
    console.log('\n📋 FETCHING LECTURER PROFILE');
    return api.get('/lecturer/profile');
  },
  
  createSession: (data) => {
    console.log('\n➕ CREATING SESSION');
    console.log('   Subject:', data.subject);
    console.log('   📍 Location:', data.location?.latitude, data.location?.longitude);
    console.log('   📏 Radius:', data.location?.radius, 'meters');
    console.log('   🔄 QR Refresh Interval:', data.qrRefreshInterval, 'seconds');
    return api.post('/lecturer/create-session', data);
  },
  
  getSessions: () => {
    console.log('\n📚 FETCHING SESSIONS');
    return api.get('/lecturer/sessions');
  },
  
  getSessionAttendance: (sessionId) => {
    console.log('\n📊 FETCHING ATTENDANCE FOR SESSION:', sessionId);
    return api.get(`/lecturer/session/${sessionId}/attendance`);
  },
  
  deactivateSession: (sessionId) => {
    console.log('\n🔴 DEACTIVATING SESSION:', sessionId);
    return api.put(`/lecturer/session/${sessionId}/deactivate`);
  },
  
  refreshQRCode: (sessionId) => {
    console.log('\n🔄 REFRESHING QR CODE FOR SESSION:', sessionId);
    return api.get(`/lecturer/session/${sessionId}/refresh-qr`);
  },
  
  getStatistics: () => {
    console.log('\n📈 FETCHING LECTURER STATISTICS');
    return api.get('/lecturer/statistics');
  },
  
  getGraphStats: () => {
    console.log('\n📊 FETCHING GRAPH STATISTICS');
    return api.get('/lecturer/statistics/graphs');
  },
  
  getExamEligibility: (semester, department) => {
    console.log('\n🎓 FETCHING EXAM ELIGIBILITY REPORT');
    console.log('   Semester:', semester, '| Department:', department);
    return api.get(`/lecturer/exam-eligibility/${semester}/${department}`);
  },
  
  getStudents: (department, semester) => {
    console.log('\n👥 FETCHING STUDENTS:', department, '- Semester', semester);
    return api.get(`/lecturer/students/${department}/${semester}`);
  },
};

// ============== STUDENT API ==============

export const studentAPI = {
  getProfile: () => {
    console.log('\n📋 FETCHING STUDENT PROFILE');
    return api.get('/student/profile');
  },
  
  getAttendance: () => {
    console.log('\n📊 FETCHING STUDENT ATTENDANCE');
    return api.get('/student/attendance');
  },
  
  getStatistics: () => {
    console.log('\n📈 FETCHING STUDENT STATISTICS');
    return api.get('/student/statistics');
  },
  
  getSubjectAttendance: (subject) => {
    console.log('\n📚 FETCHING ATTENDANCE FOR SUBJECT:', subject);
    return api.get(`/student/attendance/subject/${subject}`);
  },
  
  getExamEligibility: () => {
    console.log('\n🎓 CHECKING EXAM ELIGIBILITY');
    return api.get('/student/exam-eligibility');
  },
  
  markAttendance: (qrCode, location) => {
    console.log('\n✅ MARKING ATTENDANCE');
    console.log('   QR Code:', qrCode?.substring(0, 20) + '...');
    console.log('   📍 Location:', location?.latitude, location?.longitude);
    console.log('   📏 Accuracy:', location?.accuracy, 'meters');
    return api.post('/student/mark-attendance', {
      qrCode,
      latitude: location?.latitude,
      longitude: location?.longitude,
      accuracy: location?.accuracy
    });
  },
};

// ============== ATTENDANCE API ==============

export const attendanceAPI = {
  markAttendance: (data) => {
    if (typeof data === 'string') {
      console.log('\n✅ MARKING ATTENDANCE (Legacy Format)');
      console.log('   QR Code:', data.substring(0, 20) + '...');
      return api.post('/attendance/mark', { qrCode: data });
    } else {
      console.log('\n✅ MARKING ATTENDANCE');
      console.log('   QR Code:', data.qrCode?.substring(0, 20) + '...');
      console.log('   📍 Location:', data.location?.latitude, data.location?.longitude);
      return api.post('/attendance/mark', data);
    }
  },
  
  getAttendanceHistory: (filters = {}) => {
    console.log('\n📜 FETCHING ATTENDANCE HISTORY');
    console.log('   Filters:', filters);
    const params = new URLSearchParams(filters).toString();
    return api.get(`/attendance/history?${params}`);
  },
  
  getAttendanceByDateRange: (startDate, endDate) => {
    console.log('\n📅 FETCHING ATTENDANCE FROM', startDate, 'TO', endDate);
    return api.get('/attendance/date-range', {
      params: { startDate, endDate }
    });
  },
};

// ============== ANALYTICS API ==============

export const analyticsAPI = {
  getStudentAnalytics: () => {
    console.log('\n📊 FETCHING STUDENT ANALYTICS');
    return api.get('/analytics/student');
  },
  
  getLecturerAnalytics: () => {
    console.log('\n📊 FETCHING LECTURER ANALYTICS');
    return api.get('/analytics/lecturer');
  },
  
  getDepartmentAnalytics: (department) => {
    console.log('\n📊 FETCHING ANALYTICS FOR DEPARTMENT:', department);
    return api.get(`/analytics/department/${department}`);
  },
  
  getSemesterAnalytics: (semester) => {
    console.log('\n📊 FETCHING ANALYTICS FOR SEMESTER:', semester);
    return api.get(`/analytics/semester/${semester}`);
  },
};

// ============== LOCATION API ==============

export const locationAPI = {
  verifyLocation: (sessionId, location) => {
    console.log('\n📍 VERIFYING LOCATION FOR SESSION:', sessionId);
    console.log('   Coordinates:', location.latitude, location.longitude);
    return api.post('/location/verify', {
      sessionId,
      location
    });
  },
  
  getClassroomLocation: (sessionId) => {
    console.log('\n🏫 FETCHING CLASSROOM LOCATION FOR SESSION:', sessionId);
    return api.get(`/location/classroom/${sessionId}`);
  },
};

// ============== UTILITY FUNCTIONS ==============

export const getApiUrl = () => {
  console.log('\n🔗 CURRENT API URL:', API_URL);
  return API_URL;
};

export const testConnection = async () => {
  try {
    console.log('\n🔌 TESTING API CONNECTION...');
    const response = await api.get('/health');
    console.log('✅ API CONNECTION SUCCESSFUL');
    console.log('   Server Status:', response.data.status);
    console.log('   Server Uptime:', response.data.uptime, 'seconds');
    return response.data;
  } catch (error) {
    console.error('❌ API CONNECTION FAILED');
    throw error;
  }
};

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

export const clearAuth = () => {
  console.log('\n🧹 CLEARING AUTHENTICATION DATA');
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  console.log('✅ Authentication data cleared');
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const isAuth = !!token;
  console.log('🔐 Authentication Status:', isAuth ? '✅ Authenticated' : '❌ Not Authenticated');
  return isAuth;
};

export const getUserRole = () => {
  const role = localStorage.getItem('role');
  console.log('👤 User Role:', role || 'None');
  return role;
};

export const formatErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const downloadAttendanceReport = async (sessionId, format = 'csv') => {
  try {
    console.log('\n📥 DOWNLOADING ATTENDANCE REPORT');
    console.log('   Session:', sessionId);
    console.log('   Format:', format);
    
    const response = await api.get(`/lecturer/session/${sessionId}/download`, {
      params: { format },
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-${sessionId}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    console.log('✅ DOWNLOAD COMPLETE');
  } catch (error) {
    console.error('❌ DOWNLOAD FAILED:', error);
    throw error;
  }
};

// ============== EXPORTS ==============

export default api;

export {
  api,
  API_URL,
};

// Log API initialization complete
console.log('━'.repeat(80));
console.log('✅ API SERVICE READY');
console.log('━'.repeat(80));
console.log('📦 Available APIs:');
console.log('   - authAPI (Authentication & Registration)');
console.log('   - lecturerAPI (Lecturer Operations)');
console.log('   - studentAPI (Student Operations)');
console.log('   - attendanceAPI (Attendance Marking)');
console.log('   - analyticsAPI (Analytics & Statistics)');
console.log('   - locationAPI (Location Verification)');
console.log('━'.repeat(80) + '\n');
