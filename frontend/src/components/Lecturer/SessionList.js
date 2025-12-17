import React, { useState, useEffect } from 'react';
import { lecturerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaTimesCircle, FaUsers, FaClock, FaTimes, FaDownload, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import './Lecturer.css';

const SessionList = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await lecturerAPI.getSessions();
      setSessions(response.data);
    } catch (error) {
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (sessionId) => {
    if (!window.confirm('Are you sure you want to deactivate this session?')) {
      return;
    }

    try {
      await lecturerAPI.deactivateSession(sessionId);
      toast.success('Session deactivated successfully');
      fetchSessions();
    } catch (error) {
      toast.error('Failed to deactivate session');
    }
  };

  const handleViewAttendance = async (session) => {
    setSelectedSession(session);
    setAttendanceModalOpen(true);
    setAttendanceLoading(true);

    try {
      const response = await lecturerAPI.getSessionAttendance(session._id);
      setAttendanceList(response.data);
    } catch (error) {
      toast.error('Failed to fetch attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const closeModal = () => {
    setAttendanceModalOpen(false);
    setSelectedSession(null);
    setAttendanceList([]);
  };

  // Format date from string (YYYY-MM-DD) or Date object
  const formatSessionDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    
    // If it's already a formatted string like "2025-12-18"
    if (typeof dateString === 'string' && dateString.includes('-')) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    
    // Otherwise treat as Date object
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format time - already a string like "12:49"
  const formatSessionTime = (timeString) => {
    if (!timeString || timeString === 'N/A') return 'N/A';
    return timeString;
  };

  // Format date for created/expires timestamps
  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const downloadCSV = () => {
    if (attendanceList.length === 0) return;

    const headers = ['S.No', 'Name', 'USN', 'Email', 'Marked At', 'Status'];
    const csvContent = [
      headers.join(','),
      ...attendanceList.map((record, index) => 
        [
          index + 1,
          record.studentName,
          record.usn,
          record.studentId?.email || 'N/A',
          `${formatDate(record.markedAt)} ${formatTime(record.markedAt)}`,
          record.status
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedSession?.subject}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Attendance downloaded successfully');
  };

  if (loading) {
    return (
      <div className="loading-sessions">
        <div className="loading-spinner"></div>
        <p>Loading sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="empty-sessions">
        <div className="empty-sessions-icon">📋</div>
        <h3>No Sessions Yet</h3>
        <p>Create your first session to get started!</p>
      </div>
    );
  }

  return (
    <>
      <div className="session-list-container">
        <div className="sessions-header">
          <h2>My Sessions ({sessions.length})</h2>
        </div>

        <div className="sessions-grid">
          {sessions.map((session) => (
            <div
              key={session._id}
              className={`session-card ${session.isActive ? 'active' : 'inactive'}`}
            >
              <div className="session-header">
                <div className="session-info">
                  <h3 className="session-title">
                    {session.subject}
                    <span className={`status-badge ${session.isActive ? 'active' : 'inactive'}`}>
                      {session.isActive ? (
                        <>
                          <FaCheckCircle /> Active
                        </>
                      ) : (
                        <>
                          <FaTimesCircle /> Inactive
                        </>
                      )}
                    </span>
                  </h3>
                  <p className="session-subtitle">{session.sessionName}</p>
                </div>
              </div>

              <div className="session-details">
                <div className="detail-item highlight">
                  <span className="detail-label">
                    <FaCalendarAlt /> Session Date
                  </span>
                  <span className="detail-value primary">
                    {formatSessionDate(session.sessionDate)}
                  </span>
                </div>
                <div className="detail-item highlight">
                  <span className="detail-label">
                    <FaClock /> Session Time
                  </span>
                  <span className="detail-value primary">
                    {formatSessionTime(session.sessionTime)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">{session.department}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Semester</span>
                  <span className="detail-value">{session.semester}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">
                    <FaMapMarkerAlt /> Location
                  </span>
                  <span className="detail-value">{session.locationName || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Radius</span>
                  <span className="detail-value">{session.location?.radius || 100}m</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">
                    {formatDate(session.createdAt)}
                    <br />
                    <small>{formatTime(session.createdAt)}</small>
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expires</span>
                  <span className="detail-value">
                    {formatDate(session.expiresAt)}
                    <br />
                    <small>{formatTime(session.expiresAt)}</small>
                  </span>
                </div>
              </div>

              {session.isActive && session.qrCodeImage && (
                <div className="qr-section">
                  <div className="qr-code-display">
                    <img src={session.qrCodeImage} alt="QR Code" />
                  </div>
                  <div className="qr-code-text">
                    {session.qrCode.substring(0, 30)}...
                  </div>
                </div>
              )}

              <div className="session-actions">
                <button
                  onClick={() => handleViewAttendance(session)}
                  className="btn-view"
                >
                  <FaUsers /> View Attendance
                </button>
                {session.isActive && (
                  <button
                    onClick={() => handleDeactivate(session._id)}
                    className="btn-deactivate"
                  >
                    <FaClock /> Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Modal */}
      {attendanceModalOpen && (
        <div className="attendance-modal-backdrop" onClick={closeModal}>
          <div
            className="attendance-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attendance-modal-header">
              <div>
                <h3>
                  <FaUsers /> Attendance Details
                </h3>
                {selectedSession && (
                  <p className="modal-session-info">
                    <strong>{selectedSession.subject}</strong> - {selectedSession.sessionName}
                    <br />
                    <small>
                      <FaCalendarAlt /> {formatSessionDate(selectedSession.sessionDate)} | 
                      <FaClock /> {formatSessionTime(selectedSession.sessionTime)}
                    </small>
                  </p>
                )}
              </div>
              <button className="modal-close-btn" onClick={closeModal}>
                <FaTimes />
              </button>
            </div>

            <div className="attendance-modal-body">
              {attendanceLoading ? (
                <div className="modal-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading attendance...</p>
                </div>
              ) : attendanceList.length === 0 ? (
                <div className="empty-attendance">
                  <div className="empty-icon">😴</div>
                  <h3>No Students Yet</h3>
                  <p>No students have marked attendance for this session.</p>
                </div>
              ) : (
                <>
                  <div className="attendance-summary">
                    <div className="summary-info">
                      <span className="summary-count">
                        Total Students: <strong>{attendanceList.length}</strong>
                      </span>
                    </div>
                    <button className="btn-download" onClick={downloadCSV}>
                      <FaDownload /> Download CSV
                    </button>
                  </div>
                  <div className="attendance-table-wrapper">
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Name</th>
                          <th>USN</th>
                          <th>Email</th>
                          <th>Marked At</th>
                          <th>Distance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceList.map((record, index) => (
                          <tr key={record._id}>
                            <td>{index + 1}</td>
                            <td className="student-name">{record.studentName}</td>
                            <td className="student-usn">{record.usn}</td>
                            <td className="student-email">
                              {record.studentId?.email || 'N/A'}
                            </td>
                            <td className="marked-time">
                              {formatDate(record.markedAt)}<br />
                              <span className="time-text">{formatTime(record.markedAt)}</span>
                            </td>
                            <td className="distance-cell">
                              {record.distanceFromClass ? `${record.distanceFromClass}m` : 'N/A'}
                            </td>
                            <td>
                              <span className={`status-chip ${record.status}`}>
                                {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionList;
