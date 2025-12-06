import React, { useState, useEffect } from 'react';
import { lecturerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaTimesCircle, FaUsers, FaClock, FaTimes, FaDownload } from 'react-icons/fa';
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

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
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
                <div className="detail-item">
                  <span className="detail-label">Department</span>
                  <span className="detail-value">{session.department}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Semester</span>
                  <span className="detail-value">{session.semester}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Session Date</span>
                  <span className="detail-value">
                    {session.sessionDate ? formatDate(session.sessionDate) : 'N/A'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Session Time</span>
                  <span className="detail-value">
                    {session.sessionTime || 'N/A'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">
                    {formatDate(session.createdAt)} {formatTime(session.createdAt)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Expires</span>
                  <span className="detail-value">
                    {formatDate(session.expiresAt)} {formatTime(session.expiresAt)}
                  </span>
                </div>
              </div>

              {session.isActive && session.qrCodeImage && (
                <div className="qr-section">
                  <div className="qr-code-display">
                    <img src={session.qrCodeImage} alt="QR Code" />
                  </div>
                  <div className="qr-code-text">
                    {session.qrCode}
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
                  <p>
                    {selectedSession.subject} - {selectedSession.sessionName}
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
