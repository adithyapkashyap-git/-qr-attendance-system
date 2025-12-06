import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import './Auth.css';

const LecturerRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    password: '',
    department: '',
    subjects: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error('Please enter your name and email');
      return;
    }

    setLoading(true);
    try {
      await authAPI.sendLecturerOTP({ 
        email: formData.email, 
        name: formData.name 
      });
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.otp) {
      toast.error('Please enter OTP');
      return;
    }

    setLoading(true);
    try {
      const subjectsArray = formData.subjects.split(',').map(s => s.trim());
      const response = await authAPI.lecturerRegister({
        ...formData,
        subjects: subjectsArray,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'lecturer');
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Registration successful!');
      navigate('/lecturer/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await authAPI.sendLecturerOTP({ 
        email: formData.email, 
        name: formData.name 
      });
      toast.success('OTP resent to your email!');
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Lecturer Registration</h2>
        
        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <p>Details</p>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <p>Verify</p>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Employee ID</label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="Enter your Employee ID"
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

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
              <label>Subjects (comma separated)</label>
              <input
                type="text"
                name="subjects"
                value={formData.subjects}
                onChange={handleChange}
                placeholder="e.g., Data Structures, Algorithms, DBMS"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending OTP...' : <><FaEnvelope /> Send OTP</>}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="otp-info">
              <FaEnvelope className="otp-icon" />
              <p>We've sent a 6-digit OTP to</p>
              <strong>{formData.email}</strong>
            </div>

            <div className="form-group">
              <label>Enter OTP</label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                className="otp-input-large"
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : <><FaLock /> Verify & Register</>}
            </button>

            <button 
              type="button" 
              className="btn-resend" 
              onClick={handleResendOTP}
              disabled={loading}
            >
              Resend OTP
            </button>

            <button 
              type="button" 
              className="btn-back" 
              onClick={() => setStep(1)}
            >
              ← Back to Form
            </button>
          </form>
        )}

        <p className="auth-link">
          Already have an account? <Link to="/lecturer/login">Login here</Link>
        </p>
        <p className="auth-link">
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default LecturerRegister;
