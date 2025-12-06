import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { FaCheckCircle, FaClock } from 'react-icons/fa';
import './Student.css';

const AttendanceHistory = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const response = await studentAPI.getAttendance();
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="loading">Loading attendance history...</div>;
  }

  if (attendance.length === 0) {
    return (
      <div className="empty-state">
        <FaClock size={60} color="#9ca3af" />
        <h3>No Attendance Records</h3>
        <p>Start scanning QR codes to mark your attendance</p>
      </div>
    );
  }

  return (
    <div className="attendance-history">
      <h2>Attendance History</h2>
      <div className="attendance-list">
        {attendance.map((record) => (
          <div key={record._id} className="attendance-item">
            <div className="attendance-icon">
              <FaCheckCircle color="var(--success-color)" size={24} />
            </div>
            <div className="attendance-details">
              <h3>{record.subject}</h3>
              <p className="session-name">{record.sessionId?.sessionName}</p>
              <p className="attendance-date">{formatDate(record.markedAt)}</p>
            </div>
            <div className="attendance-status">
              <span className="status-badge present">Present</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceHistory;
