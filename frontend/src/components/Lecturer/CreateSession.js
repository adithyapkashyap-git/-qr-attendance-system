import React, { useState } from 'react';
import { lecturerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './Lecturer.css';

const CreateSession = ({ onSessionCreated }) => {
  const [formData, setFormData] = useState({
    subject: '',
    sessionName: '',
    department: '',
    semester: '',
    sessionDate: '',
    sessionTime: '',
    duration: 30,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await lecturerAPI.createSession({
        ...formData,
        semester: parseInt(formData.semester),
        duration: parseInt(formData.duration),
      });
      toast.success('Session created successfully!');
      setFormData({
        subject: '',
        sessionName: '',
        department: '',
        semester: '',
        sessionDate: '',
        sessionTime: '',
        duration: 30,
      });
      onSessionCreated(response.data.session);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="create-session-container">
      <div className="session-form-card">
        <h2>Create New Session</h2>
        <form onSubmit={handleSubmit} className="session-form">
          <div className="form-row">
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Enter subject name"
                required
              />
            </div>

            <div className="form-group">
              <label>Session Name</label>
              <input
                type="text"
                name="sessionName"
                value={formData.sessionName}
                onChange={handleChange}
                placeholder="e.g., Lecture 1, Lab Session"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <select name="department" value={formData.department} onChange={handleChange} required>
                <option value="">Select Department</option>
                <option value="CSE">Computer Science Engineering</option>
                <option value="ISE">Information Science Engineering</option>
                <option value="ECE">Electronics & Communication</option>
                <option value="ME">Mechanical Engineering</option>
                <option value="CE">Civil Engineering</option>
              </select>
            </div>

            <div className="form-group">
              <label>Semester</label>
              <select name="semester" value={formData.semester} onChange={handleChange} required>
                <option value="">Select Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>Semester {sem}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Session Date</label>
              <input
                type="date"
                name="sessionDate"
                value={formData.sessionDate}
                onChange={handleChange}
                min={today}
                required
              />
            </div>

            <div className="form-group">
              <label>Session Time</label>
              <input
                type="time"
                name="sessionTime"
                value={formData.sessionTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>QR Code Validity (minutes)</label>
            <select name="duration" value={formData.duration} onChange={handleChange} required>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <button type="submit" className="btn-create" disabled={loading}>
            {loading ? '⏳ Creating...' : '✨ Create Session'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateSession;