import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { toast } from 'react-toastify';
import './Auth.css';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    usn: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.studentLogin(formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'student');
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Login successful!');
      navigate('/student/dashboard');
    } catch (error) {
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
            <label>USN</label>
            <input
              type="text"
              name="usn"
              value={formData.usn}
              onChange={handleChange}
              placeholder="Enter your USN"
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
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/student/register">Register here</Link>
        </p>
        <p className="auth-link">
          <Link to="/">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default StudentLogin;
