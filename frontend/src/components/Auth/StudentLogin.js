import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './Auth.css';

const StudentLogin = () => {
  const [formData, setFormData] = useState({
    usn: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.usn || !formData.password) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.loginStudent(formData.usn, formData.password);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'student');
      localStorage.setItem('user', JSON.stringify(response.data.user));

      toast.success('Login successful!');
      navigate('/student/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Student Login</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>USN *</label>
            <input
              type="text"
              name="usn"
              value={formData.usn}
              onChange={handleChange}
              placeholder="e.g., 1KI21CS001"
              required
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="auth-footer">
            Don't have an account? <Link to="/student/register">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default StudentLogin;
