import React, { useState, useEffect } from 'react';
import { lecturerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaMapMarkerAlt } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import './Lecturer.css';

const CreateSession = ({ onSessionCreated }) => {
  const [formData, setFormData] = useState({
    subject: '',
    sessionName: '',
    department: '',
    semester: '',
    duration: '10',
    locationName: '',
    latitude: '',
    longitude: '',
    radius: '100'
  });
  const [loading, setLoading] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);
  const [dynamicQR, setDynamicQR] = useState(null);
  const [qrTimer, setQrTimer] = useState(5);

  useEffect(() => {
    if (createdSession && createdSession.isActive) {
      // Refresh QR code every 5 seconds
      const interval = setInterval(async () => {
        try {
          const response = await lecturerAPI.refreshQRCode(createdSession._id);
          setDynamicQR(response.data);
          setQrTimer(5);
        } catch (error) {
          console.error('Failed to refresh QR code');
        }
      }, 5000);

      // Countdown timer
      const countdown = setInterval(() => {
        setQrTimer(prev => prev > 0 ? prev - 1 : 5);
      }, 1000);

      return () => {
        clearInterval(interval);
        clearInterval(countdown);
      };
    }
  }, [createdSession]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.info('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        toast.success('Location captured successfully');
      },
      (error) => {
        toast.error('Unable to get location. Please enter manually.');
      }
    );
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      toast.error('Please provide classroom location');
      return;
    }

    setLoading(true);

    try {
      const sessionData = {
        subject: formData.subject,
        sessionName: formData.sessionName,
        department: formData.department,
        semester: parseInt(formData.semester),
        duration: parseInt(formData.duration),
        location: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseInt(formData.radius)
        },
        locationName: formData.locationName || 'Classroom'
      };

      const response = await lecturerAPI.createSession(sessionData);
      toast.success('Session created successfully!');
      setCreatedSession(response.data.session);
      setDynamicQR({ qrCode: response.data.session.qrCode, qrCodeImage: response.data.session.qrCodeImage });
      
      setFormData({
        subject: '',
        sessionName: '',
        department: '',
        semester: '',
        duration: '10',
        locationName: '',
        latitude: '',
        longitude: '',
        radius: '100'
      });
      
      onSessionCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-session">
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
              placeholder="e.g., Data Structures"
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
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Session Duration (minutes)</label>
          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            min="5"
            max="180"
            required
          />
        </div>

        {/* Geo-fencing Section */}
        <div className="location-section">
          <h3><FaMapMarkerAlt /> Classroom Location (Geo-fencing)</h3>
          
          <div className="form-group">
            <label>Location Name</label>
            <input
              type="text"
              name="locationName"
              value={formData.locationName}
              onChange={handleChange}
              placeholder="e.g., Room 301, Lab 2"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="13.0827"
                required
              />
            </div>

            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="77.5877"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Allowed Radius (meters)</label>
            <input
              type="number"
              name="radius"
              value={formData.radius}
              onChange={handleChange}
              min="10"
              max="500"
              required
            />
            <small>Students must be within this radius to mark attendance</small>
          </div>

          <button type="button" onClick={getCurrentLocation} className="location-btn">
            <FaMapMarkerAlt /> Use Current Location
          </button>
        </div>

        <button type="submit" className="create-btn" disabled={loading}>
          <FaPlus />
          {loading ? 'Creating...' : 'Create Session'}
        </button>
      </form>

      {/* Dynamic QR Code Display */}
      {createdSession && dynamicQR && (
        <div className="dynamic-qr-display">
          <h3>🔄 Dynamic QR Code (Refreshing every 5 seconds)</h3>
          <div className="qr-timer">Next refresh in: <strong>{qrTimer}s</strong></div>
          <div className="qr-code-container">
            <QRCode value={dynamicQR.qrCode} size={256} />
            <p className="qr-code-text">Session: {createdSession.sessionName}</p>
            <p className="qr-location">📍 {createdSession.locationName}</p>
          </div>
          <button 
            onClick={() => setCreatedSession(null)} 
            className="close-qr-btn"
          >
            Close QR Display
          </button>
        </div>
      )}
    </div>
  );
};

export default CreateSession;
