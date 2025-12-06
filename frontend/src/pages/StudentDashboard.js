import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '../services/api';
import QRScanner from '../components/Student/QRScanner';
import AttendanceHistory from '../components/Student/AttendanceHistory';
import AttendanceStats from '../components/Student/AttendanceStats';
import { FaSignOutAlt } from 'react-icons/fa';
import './Pages.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('scan');
  const [user, setUser] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      setUser(userData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleAttendanceMarked = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Welcome, {user?.name}! 👋</h1>
          <p>USN: {user?.usn} | {user?.department} - Semester {user?.semester}</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <FaSignOutAlt /> Logout
        </button>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => setActiveTab('scan')}
        >
          📱 Scan QR Code
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 History
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'scan' && <QRScanner onAttendanceMarked={handleAttendanceMarked} />}
        {activeTab === 'stats' && <AttendanceStats key={refreshTrigger} />}
        {activeTab === 'history' && <AttendanceHistory key={refreshTrigger} />}
      </div>
    </div>
  );
};

export default StudentDashboard;