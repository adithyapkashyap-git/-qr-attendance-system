import React, { useState, useEffect } from 'react';
import { lecturerAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaPlus, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaSync } from 'react-icons/fa';
import QRCode from 'react-qr-code';
import './Lecturer.css';

const CreateSession = ({ onSessionCreated }) => {
  const [formData, setFormData] = useState({
    subject: '',
    sessionName: '',
    department: '',
    semester: '',
    duration: '10',
    sessionDate: '',
    sessionTime: '',
    qrRefreshInterval: '5',
    locationName: '',
    latitude: '',
    longitude: '',
    radius: '100'
  });
  const [loading, setLoading] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);
  const [dynamicQR, setDynamicQR] = useState(null);
  const [qrTimer, setQrTimer] = useState(5);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    
    setFormData(prev => ({
      ...prev,
      sessionDate: dateStr,
      sessionTime: timeStr
    }));
  }, []);

  useEffect(() => {
    if (createdSession && createdSession.isActive) {
      const refreshInterval = (createdSession.qrRefreshInterval || 5) * 1000;
      
      // Refresh QR code
      const interval = setInterval(async () => {
        try {
          const response = await lecturerAPI.refreshQRCode(createdSession._id);
          setDynamicQR(response.data);
          setQrTimer(createdSession.qrRefreshInterval || 5);
        } catch (error) {
          console.error('Failed to refresh QR code');
        }
      }, refreshInterval);

      // Countdown timer
      const countdown = setInterval(() => {
        setQrTimer(prev => {
          if (prev > 1) return prev - 1;
          return createdSession.qrRefreshInterval || 5;
        });
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

    setLocationLoading(true);
    toast.info('📍 Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setLocationLoading(false);
        toast.success('✅ Location captured successfully');
      },
      (error) => {
        setLocationLoading(false);
        toast.error('❌ Unable to get location. Please enter manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      toast.error('❌ Please provide classroom location');
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
        sessionDate: formData.sessionDate,
        sessionTime: formData.sessionTime,
        qrRefreshInterval: parseInt(formData.qrRefreshInterval),
        location: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseInt(formData.radius)
        },
        locationName: formData.locationName || 'Classroom'
      };

      const response = await lecturerAPI.createSession(sessionData);
      toast.success('✅ Session created successfully!');
      setCreatedSession(response.data.session);
      setDynamicQR({ qrCode: response.data.session.qrCode, qrCodeImage: response.data.session.qrCodeImage });
      setQrTimer(response.data.session.qrRefreshInterval || 5);
      
      // Reset form
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      
      setFormData({
        subject: '',
        sessionName: '',
        department: '',
        semester: '',
        duration: '10',
        sessionDate: dateStr,
        sessionTime: timeStr,
        qrRefreshInterval: '5',
        locationName: '',
        latitude: '',
        longitude: '',
        radius: '100'
      });
      
      if (onSessionCreated) onSessionCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || '❌ Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-session">
      <h2 className="session-title fade-in">Create New Session</h2>

      <form onSubmit={handleSubmit} className="session-form">
        {/* Subject and Session Name */}
        <div className="form-row slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="form-group">
            <label>Subject <span className="required">*</span></label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="e.g., Data Structures"
              required
              className="animated-input"
            />
          </div>

          <div className="form-group">
            <label>Session Name <span className="required">*</span></label>
            <input
              type="text"
              name="sessionName"
              value={formData.sessionName}
              onChange={handleChange}
              placeholder="e.g., Lecture 1, Lab Session"
              required
              className="animated-input"
            />
          </div>
        </div>

        {/* Department and Semester */}
        <div className="form-row slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="form-group">
            <label>Department <span className="required">*</span></label>
            <select 
              name="department" 
              value={formData.department} 
              onChange={handleChange} 
              required
              className="animated-select"
            >
              <option value="">Select Department</option>
              <option value="CSE">Computer Science Engineering</option>
              <option value="ISE">Information Science Engineering</option>
              <option value="ECE">Electronics & Communication</option>
              <option value="ME">Mechanical Engineering</option>
              <option value="CE">Civil Engineering</option>
            </select>
          </div>

          <div className="form-group">
            <label>Semester <span className="required">*</span></label>
            <select 
              name="semester" 
              value={formData.semester} 
              onChange={handleChange} 
              required
              className="animated-select"
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date, Time and Duration */}
        <div className="form-row slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="form-group">
            <label><FaCalendarAlt /> Session Date <span className="required">*</span></label>
            <input
              type="date"
              name="sessionDate"
              value={formData.sessionDate}
              onChange={handleChange}
              required
              className="animated-input"
            />
          </div>

          <div className="form-group">
            <label><FaClock /> Session Time <span className="required">*</span></label>
            <input
              type="time"
              name="sessionTime"
              value={formData.sessionTime}
              onChange={handleChange}
              required
              className="animated-input"
            />
          </div>

          <div className="form-group">
            <label>Duration (minutes) <span className="required">*</span></label>
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min="5"
              max="180"
              required
              className="animated-input"
            />
          </div>
        </div>

        {/* QR Refresh Interval */}
        <div className="form-group slide-up" style={{ animationDelay: '0.35s' }}>
          <label><FaSync className="rotate-icon" /> QR Code Refresh Interval (seconds) <span className="required">*</span></label>
          <select
            name="qrRefreshInterval"
            value={formData.qrRefreshInterval}
            onChange={handleChange}
            required
            className="animated-select qr-interval-select"
          >
            <option value="3">3 seconds (Very Fast)</option>
            <option value="5">5 seconds (Fast)</option>
            <option value="10">10 seconds (Medium)</option>
            <option value="15">15 seconds (Slow)</option>
            <option value="30">30 seconds (Very Slow)</option>
            <option value="60">60 seconds (1 minute)</option>
          </select>
          <small className="helper-text">
            ⚠️ Shorter intervals provide better security but may affect performance
          </small>
        </div>

        {/* Geo-fencing Section */}
        <div className="location-section slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="section-header">
            <FaMapMarkerAlt className="pulse-icon" /> Classroom Location (Geo-fencing)
          </h3>
          
          <div className="form-group">
            <label>Location Name</label>
            <input
              type="text"
              name="locationName"
              value={formData.locationName}
              onChange={handleChange}
              placeholder="e.g., Room 301, Lab 2"
              className="animated-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude <span className="required">*</span></label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="13.0827"
                required
                className="animated-input"
              />
            </div>

            <div className="form-group">
              <label>Longitude <span className="required">*</span></label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="77.5877"
                required
                className="animated-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Allowed Radius (meters) <span className="required">*</span></label>
            <input
              type="number"
              name="radius"
              value={formData.radius}
              onChange={handleChange}
              min="10"
              max="500"
              required
              className="animated-input"
            />
            <small className="helper-text">Students must be within this radius to mark attendance</small>
          </div>

          <button 
            type="button" 
            onClick={getCurrentLocation} 
            className="location-btn"
            disabled={locationLoading}
          >
            {locationLoading ? (
              <>
                <div className="spinner-small"></div>
                Getting Location...
              </>
            ) : (
              <>
                <FaMapMarkerAlt className="btn-icon" /> Use Current Location
              </>
            )}
          </button>
        </div>

        <button type="submit" className="create-btn" disabled={loading}>
          {loading ? (
            <>
              <div className="spinner-small"></div>
              Creating...
            </>
          ) : (
            <>
              <FaPlus className="btn-icon" />
              Create Session
            </>
          )}
        </button>
      </form>

      {/* Dynamic QR Code Display */}
      {createdSession && dynamicQR && (
        <div className="dynamic-qr-display fade-in-scale">
          <div className="qr-header">
            <h3>🔄 Dynamic QR Code</h3>
            <div className="qr-timer-info">
              <span className="qr-timer-badge">Refreshing in: <strong>{qrTimer}s</strong></span>
              <span className="qr-interval-info">Interval: {createdSession.qrRefreshInterval}s</span>
            </div>
          </div>
          
          <div className="qr-code-container">
            <div className="qr-code-wrapper">
              <QRCode value={dynamicQR.qrCode} size={256} className="qr-code-animated" />
            </div>
            <div className="qr-info">
              <p className="qr-session-name">📚 {createdSession.sessionName}</p>
              <p className="qr-subject">{createdSession.subject}</p>
              <p className="qr-location">📍 {createdSession.locationName}</p>
              <p className="qr-time">
                🕐 {formData.sessionDate} at {formData.sessionTime}
              </p>
            </div>
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
