import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import LandingPage from './pages/LandingPage';
import StudentLogin from './components/Auth/StudentLogin';
import StudentRegister from './components/Auth/StudentRegister';
import LecturerLogin from './components/Auth/LecturerLogin';
import LecturerRegister from './components/Auth/LecturerRegister';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/" />;
  }

  if (role && userRole !== role) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student/register" element={<StudentRegister />} />
      <Route path="/lecturer/login" element={<LecturerLogin />} />
      <Route path="/lecturer/register" element={<LecturerRegister />} />
      
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/lecturer/dashboard"
        element={
          <ProtectedRoute role="lecturer">
            <LecturerDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;