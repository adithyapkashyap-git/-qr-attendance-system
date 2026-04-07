import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaQrcode, FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';
import { FaGithub, FaLinkedin, FaEnvelope, FaCode } from 'react-icons/fa';
import './Pages.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        {/* Header */}
        <div className="landing-header">
          <FaQrcode className="landing-icon" />
          <h1>GeoAttend</h1>
          <p>Modern, Fast & Secure Attendance Management</p>
        </div>

        {/* Role Cards */}
        <div className="landing-cards">
          {/* Student Card */}
          <div className="landing-card">
            <FaUserGraduate className="card-icon student-icon" />
            <h2>Students</h2>
            <p>Scan QR codes to mark your attendance instantly</p>
            <div className="card-buttons">
              <button 
                className="btn-outline"
                onClick={() => navigate('/student/login')}
              >
                Login
              </button>
              <button 
                className="btn-solid"
                onClick={() => navigate('/student/register')}
              >
                Register
              </button>
            </div>
          </div>

          {/* Lecturer Card */}
          <div className="landing-card">
            <FaChalkboardTeacher className="card-icon lecturer-icon" />
            <h2>Lecturers</h2>
            <p>Generate QR codes and manage attendance efficiently</p>
            <div className="card-buttons">
              <button 
                className="btn-outline"
                onClick={() => navigate('/lecturer/login')}
              >
                Login
              </button>
              <button 
                className="btn-solid"
                onClick={() => navigate('/lecturer/register')}
              >
                Register
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="features">
          <h3>Key Features</h3>
          <div className="features-grid">
            <div className="feature-item">
              <span>⚡</span>
              <p>Instant Scanning</p>
            </div>
            <div className="feature-item">
              <span>📊</span>
              <p>Real-time Reports</p>
            </div>
            <div className="feature-item">
              <span>🔒</span>
              <p>Secure System</p>
            </div>
            <div className="feature-item">
              <span>📱</span>
              <p>Mobile Friendly</p>
            </div>
          </div>
        </div>

        {/* Developer Info Section */}
        <div className="developer-section">
          <div className="developer-card">
            <div className="developer-header">
              <FaCode className="developer-icon" />
              <h3>Developed By</h3>
            </div>
            
            <div className="developer-info">
              <div className="developer-avatar">
                <span>PS</span>
              </div>
              <h4>Programmers Syndicate</h4>
              <p className="developer-role"></p>
              <p className="developer-description">
                Kalpataru Institute of Technology, Tiptur
              </p>
            </div>

            <div className="developer-tech">
              <h5>Built With</h5>
              <div className="tech-stack">
                <span className="tech-badge">React</span>
                <span className="tech-badge">Node.js</span>
                <span className="tech-badge">MongoDB</span>
                <span className="tech-badge">Express</span>
                <span className="tech-badge">HTML5 QR Code</span>
              </div>
            </div>

            <div className="developer-links">
              <a 
                href="https://github.com/adithyapkashyap-git" 
                target="_blank" 
                rel="noopener noreferrer"
                className="dev-link"
              >
                <FaGithub /> GitHub
              </a>
              <a 
                href="https://www.linkedin.com/in/tejas-br-540046375" 
                target="_blank" 
                rel="noopener noreferrer"
                className="dev-link"
              >
                <FaLinkedin /> LinkedIn
              </a>
              <a 
                href="mailto:adithyapkashyap@gmail.com"
                className="dev-link"
              >
                <FaEnvelope /> Email
              </a>
            </div>

            <div className="developer-footer">
              <p>© 2025 QR Attendance System. All rights reserved.</p>
              <p className="version">Version 1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
