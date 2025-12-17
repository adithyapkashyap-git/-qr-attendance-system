import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { FaEnvelope, FaLock, FaUser, FaIdCard, FaBuilding, FaGraduationCap } from 'react-icons/fa';
import './Auth.css';

const StudentRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    usn: '',
    email: '',
    password: '',
    department: '',
    semester: '',
    otp: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // ✅ VALIDATION: Check ALL required fields
    if (!formData.name || !formData.usn || !formData.email || !formData.password || !formData.department || !formData.semester) {
      toast.error('Please fill all fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      console.log('📧 Sending OTP with data:', { email: formData.email, name: formData.name });
      
      await authAPI.sendStudentOTP(formData.email, formData.name);
      
      console.log('✅ OTP sent successfully');
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.otp || formData.otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Submitting registration with ALL data:', {
        name: formData.name,
        usn: formData.usn,
        email: formData.email,
        department: formData.department,
        semester: formData.semester,
        otp: formData.otp,
        hasPassword: !!formData.password
      });

      const response = await authAPI.registerStudent({
        name: formData.name,
        usn: formData.usn,
        email: formData.email,
        password: formData.password,
        department: formData.department,
        semester: parseInt(formData.semester),
        otp: formData.otp
      });

      console.log('✅ Registration successful:', response.data);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'student');
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Registration successful!');
      navigate('/student/dashboard');
    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('Error details:', error.response?.data);
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await authAPI.sendStudentOTP(formData.email, formData.name);
      toast.success('OTP resent to your email!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page bg-light min-vh-100 d-flex align-items-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <FaGraduationCap size={60} className="text-primary" />
                  </div>
                  <h2 className="fw-bold">Student Registration</h2>
                  <p className="text-muted">Join our attendance system today</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="progress" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar" 
                      style={{ width: step === 1 ? '50%' : '100%' }}
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between mt-2">
                    <small className={step >= 1 ? 'text-primary fw-bold' : 'text-muted'}>
                      Step 1: Details
                    </small>
                    <small className={step >= 2 ? 'text-primary fw-bold' : 'text-muted'}>
                      Step 2: Verify
                    </small>
                  </div>
                </div>

                {step === 1 ? (
                  <form onSubmit={handleSendOTP}>
                    <div className="form-group mb-3">
                      <label className="form-label">Full Name</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaUser />
                        </span>
                        <input
                          type="text"
                          name="name"
                          className="form-control"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group mb-3">
                      <label className="form-label">USN</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaIdCard />
                        </span>
                        <input
                          type="text"
                          name="usn"
                          className="form-control"
                          value={formData.usn}
                          onChange={handleChange}
                          placeholder="Enter your USN"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group mb-3">
                      <label className="form-label">Email</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaEnvelope />
                        </span>
                        <input
                          type="email"
                          name="email"
                          className="form-control"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group mb-3">
                      <label className="form-label">Department</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaBuilding />
                        </span>
                        <select 
                          name="department"
                          className="form-control"
                          value={formData.department} 
                          onChange={handleChange} 
                          required
                        >
                          <option value="">Select Department</option>
                          <option value="Computer Science Engineering">Computer Science Engineering</option>
                          <option value="Information Science Engineering">Information Science Engineering</option>
                          <option value="Electronics & Communication">Electronics & Communication</option>
                          <option value="Mechanical Engineering">Mechanical Engineering</option>
                          <option value="Civil Engineering">Civil Engineering</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group mb-3">
                      <label className="form-label">Semester</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaGraduationCap />
                        </span>
                        <select 
                          name="semester"
                          className="form-control"
                          value={formData.semester} 
                          onChange={handleChange} 
                          required
                        >
                          <option value="">Select Semester</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group mb-4">
                      <label className="form-label">Password</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <FaLock />
                        </span>
                        <input
                          type="password"
                          name="password"
                          className="form-control"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Create a password (min 6 characters)"
                          minLength="6"
                          required
                        />
                      </div>
                    </div>

                    <div className="d-grid">
                      <button 
                        type="submit"
                        className="btn btn-primary btn-lg mb-3"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Sending OTP...
                          </>
                        ) : (
                          <>
                            <FaEnvelope className="me-2" /> Send OTP
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="text-center mb-4 p-4 bg-light rounded">
                      <FaEnvelope size={48} className="text-primary mb-3" />
                      <p className="mb-1">We've sent a 6-digit OTP to</p>
                      <strong className="text-primary">{formData.email}</strong>
                    </div>

                    <div className="form-group mb-4">
                      <label className="form-label">Enter OTP</label>
                      <input
                        type="text"
                        name="otp"
                        className="form-control text-center fs-4"
                        value={formData.otp}
                        onChange={handleChange}
                        placeholder="Enter 6-digit OTP"
                        maxLength="6"
                        pattern="\d{6}"
                        style={{ letterSpacing: '10px' }}
                        required
                      />
                    </div>

                    <div className="d-grid gap-2">
                      <button 
                        type="submit"
                        className="btn btn-success btn-lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <FaLock className="me-2" /> Verify & Register
                          </>
                        )}
                      </button>

                      <button 
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={handleResendOTP}
                        disabled={loading}
                      >
                        Resend OTP
                      </button>

                      <button 
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setStep(1)}
                      >
                        ← Back to Form
                      </button>
                    </div>
                  </form>
                )}

                <div className="text-center mt-4">
                  <p className="text-muted">
                    Already have an account?{' '}
                    <Link to="/student/login" className="text-decoration-none fw-bold">
                      Login here
                    </Link>
                  </p>
                  <Link to="/" className="text-decoration-none text-muted">
                    ← Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
