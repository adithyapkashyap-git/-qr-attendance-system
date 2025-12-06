import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lecturerAPI } from '../services/api';
import { toast } from 'react-toastify';
import CreateSession from '../components/Lecturer/CreateSession';
import SessionList from '../components/Lecturer/SessionList';
import './Pages.css';

const LecturerDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalSessions: 0, activeSessions: 0, totalAttendance: 0 });
  const [activeTab, setActiveTab] = useState('create');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await lecturerAPI.getStatistics();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.info('Logged out successfully');
    navigate('/');
  };

  const handleSessionCreated = () => {
    fetchStats();
    setActiveTab('sessions');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Lecturer Dashboard</h1>
          <p>Welcome, {user?.name} ({user?.employeeId})</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Sessions</h3>
          <p>{stats.totalSessions}</p>
        </div>
        <div className="stat-card">
          <h3>Active Sessions</h3>
          <p>{stats.activeSessions}</p>
        </div>
        <div className="stat-card">
          <h3>Total Attendance</h3>
          <p>{stats.totalAttendance}</p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Session
          </button>
          <button
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            My Sessions
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'create' ? (
            <CreateSession onSessionCreated={handleSessionCreated} />
          ) : (
            <SessionList />
          )}
        </div>
      </div>

      <style jsx>{`
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
        }

        .tab-btn {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          color: #6b7280;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .tab-btn.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }

        .tab-btn:hover {
          color: var(--primary-color);
        }

        .tab-content {
          min-height: 400px;
        }
      `}</style>
    </div>
  );
};

export default LecturerDashboard;
