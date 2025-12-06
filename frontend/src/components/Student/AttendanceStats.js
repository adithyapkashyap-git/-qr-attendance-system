import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { FaChartLine, FaCheckCircle, FaTimesCircle, FaCalendarAlt } from 'react-icons/fa';
import './Student.css';

const AttendanceStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await studentAPI.getStatistics();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="empty-state">No statistics available</div>;
  }

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const attendanceColor = getAttendanceColor(stats.attendancePercentage);

  return (
    <div className="attendance-stats-container">
      {/* Main Stats Cards */}
      <div className="stats-grid-main">
        <div className="stat-card-large present">
          <div className="stat-icon-wrapper">
            <FaCheckCircle className="stat-icon" />
          </div>
          <div className="stat-content">
            <h3>Classes Attended</h3>
            <p className="stat-number">{stats.attendedSessions}</p>
            <span className="stat-label">Total Sessions</span>
          </div>
        </div>

        <div className="stat-card-large absent">
          <div className="stat-icon-wrapper">
            <FaTimesCircle className="stat-icon" />
          </div>
          <div className="stat-content">
            <h3>Classes Missed</h3>
            <p className="stat-number">{stats.missedSessions}</p>
            <span className="stat-label">Absent</span>
          </div>
        </div>

        <div className="stat-card-large total">
          <div className="stat-icon-wrapper">
            <FaCalendarAlt className="stat-icon" />
          </div>
          <div className="stat-content">
            <h3>Total Classes</h3>
            <p className="stat-number">{stats.totalSessions}</p>
            <span className="stat-label">Overall</span>
          </div>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="circular-progress-container">
        <div className="progress-card">
          <h3>Overall Attendance</h3>
          <div className="circular-progress">
            <svg className="progress-ring" width="200" height="200">
              <circle
                className="progress-ring-circle-bg"
                stroke="#e5e7eb"
                strokeWidth="15"
                fill="transparent"
                r="85"
                cx="100"
                cy="100"
              />
              <circle
                className="progress-ring-circle"
                stroke={attendanceColor}
                strokeWidth="15"
                fill="transparent"
                r="85"
                cx="100"
                cy="100"
                style={{
                  strokeDasharray: `${2 * Math.PI * 85}`,
                  strokeDashoffset: `${2 * Math.PI * 85 * (1 - stats.attendancePercentage / 100)}`,
                }}
              />
            </svg>
            <div className="progress-text">
              <span className="percentage" style={{ color: attendanceColor }}>
                {stats.attendancePercentage}%
              </span>
              <span className="label">Attendance</span>
            </div>
          </div>
          <div className="progress-info">
            <p style={{ color: attendanceColor, fontWeight: 'bold' }}>
              {stats.attendancePercentage >= 75 ? '✅ Excellent!' : 
               stats.attendancePercentage >= 50 ? '⚠️ Need Improvement' : 
               '❌ Critical'}
            </p>
          </div>
        </div>
      </div>

      {/* Bar Chart - Subject Wise */}
      {stats.subjectWiseAttendance && stats.subjectWiseAttendance.length > 0 && (
        <div className="chart-container">
          <h3>Subject-wise Attendance</h3>
          <div className="bar-chart">
            {stats.subjectWiseAttendance.map((subject, index) => (
              <div key={index} className="bar-item">
                <div className="bar-label">{subject._id}</div>
                <div className="bar-wrapper">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(subject.attended / stats.totalSessions) * 100}%`,
                      animationDelay: `${index * 0.1}s`
                    }}
                  >
                    <span className="bar-value">{subject.attended}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceStats;
