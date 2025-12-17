import React, { useState, useEffect } from 'react';
import { studentAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { 
  FaChartLine, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaCalendarAlt,
  FaGraduationCap,
  FaExclamationTriangle
} from 'react-icons/fa';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Area, AreaChart
} from 'recharts';
import './Student.css';

const AttendanceStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, graphs, eligibility

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await studentAPI.getStatistics();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="empty-state">
        <FaChartLine size={60} />
        <p>No statistics available</p>
      </div>
    );
  }

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const attendanceColor = getAttendanceColor(stats.attendancePercentage);
  const isEligibleForExam = stats.attendancePercentage >= 75;
  
  // Calculate classes needed to reach 75%
  const classesNeededFor75 = Math.max(
    0,
    Math.ceil((0.75 * stats.totalSessions - stats.attendedSessions) / 0.25)
  );

  // Prepare data for charts
  const subjectChartData = stats.subjectWiseAttendance?.map(subject => ({
    name: subject._id.substring(0, 15) + (subject._id.length > 15 ? '...' : ''),
    fullName: subject._id,
    attended: subject.attended,
    percentage: stats.totalSessions > 0 
      ? ((subject.attended / stats.totalSessions) * 100).toFixed(1)
      : 0
  })) || [];

  // Prepare pie chart data
  const pieData = [
    { name: 'Attended', value: stats.attendedSessions, color: '#10b981' },
    { name: 'Missed', value: stats.missedSessions, color: '#ef4444' }
  ];

  // Prepare trend data (mock data - you can replace with actual date-wise data from backend)
  const trendData = stats.recentAttendance?.map((item, index) => ({
    date: new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    attendance: item.count
  })) || [];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="attendance-stats-container">
      <div className="stats-header">
        <h2><FaChartLine /> Attendance Analytics</h2>
        <div className="tab-navigation">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'graphs' ? 'active' : ''} 
            onClick={() => setActiveTab('graphs')}
          >
            Graphs
          </button>
          <button 
            className={activeTab === 'eligibility' ? 'active' : ''} 
            onClick={() => setActiveTab('eligibility')}
          >
            Exam Eligibility
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* Main Stats Cards */}
          <div className="stats-grid-main">
            <div className="stat-card-large present">
              <div className="stat-icon-wrapper">
                <FaCheckCircle className="stat-icon" />
              </div>
              <div className="stat-content">
                <h3>Classes Attended</h3>
                <p className="stat-number">{stats.attendedSessions}</p>
                <span className="stat-label">Total Sessions</span>
              </div>
            </div>

            <div className="stat-card-large absent">
              <div className="stat-icon-wrapper">
                <FaTimesCircle className="stat-icon" />
              </div>
              <div className="stat-content">
                <h3>Classes Missed</h3>
                <p className="stat-number">{stats.missedSessions}</p>
                <span className="stat-label">Absent</span>
              </div>
            </div>

            <div className="stat-card-large total">
              <div className="stat-icon-wrapper">
                <FaCalendarAlt className="stat-icon" />
              </div>
              <div className="stat-content">
                <h3>Total Classes</h3>
                <p className="stat-number">{stats.totalSessions}</p>
                <span className="stat-label">Overall</span>
              </div>
            </div>
          </div>

          {/* Circular Progress */}
          <div className="circular-progress-container">
            <div className="progress-card">
              <h3>Overall Attendance</h3>
              <div className="circular-progress">
                <svg className="progress-ring" width="200" height="200">
                  <circle
                    className="progress-ring-circle-bg"
                    stroke="#e5e7eb"
                    strokeWidth="15"
                    fill="transparent"
                    r="85"
                    cx="100"
                    cy="100"
                  />
                  <circle
                    className="progress-ring-circle"
                    stroke={attendanceColor}
                    strokeWidth="15"
                    strokeLinecap="round"
                    fill="transparent"
                    r="85"
                    cx="100"
                    cy="100"
                    style={{
                      strokeDasharray: `${2 * Math.PI * 85}`,
                      strokeDashoffset: `${2 * Math.PI * 85 * (1 - stats.attendancePercentage / 100)}`,
                      transition: 'stroke-dashoffset 1s ease-in-out'
                    }}
                  />
                </svg>
                <div className="progress-text">
                  <span className="percentage" style={{ color: attendanceColor }}>
                    {stats.attendancePercentage}%
                  </span>
                  <span className="label">Attendance</span>
                </div>
              </div>
              <div className="progress-info">
                <p style={{ color: attendanceColor, fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {stats.attendancePercentage >= 75 ? '✅ Excellent! Keep it up!' : 
                   stats.attendancePercentage >= 50 ? '⚠️ Need Improvement' : 
                   '❌ Critical - Attend More Classes'}
                </p>
                {stats.attendancePercentage < 75 && (
                  <p className="warning-text">
                    <FaExclamationTriangle /> You need {classesNeededFor75} more classes to reach 75%
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Bar Chart */}
          {stats.subjectWiseAttendance && stats.subjectWiseAttendance.length > 0 && (
            <div className="chart-container">
              <h3>Subject-wise Attendance</h3>
              <div className="bar-chart">
                {stats.subjectWiseAttendance.map((subject, index) => {
                  const percentage = stats.totalSessions > 0 
                    ? (subject.attended / stats.totalSessions) * 100 
                    : 0;
                  return (
                    <div key={index} className="bar-item">
                      <div className="bar-label">{subject._id}</div>
                      <div className="bar-wrapper">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[(index + 1) % COLORS.length]})`,
                            animationDelay: `${index * 0.1}s`
                          }}
                        >
                          <span className="bar-value">{subject.attended}</span>
                        </div>
                      </div>
                      <div className="bar-percentage">{percentage.toFixed(0)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* GRAPHS TAB */}
      {activeTab === 'graphs' && (
        <div className="graphs-section">
          {/* Subject-wise Bar Chart */}
          <div className="chart-box">
            <h3>📊 Subject-wise Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  style={{ fontSize: '12px' }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar 
                  dataKey="attended" 
                  fill="#667eea" 
                  name="Classes Attended"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance Distribution Pie Chart */}
          <div className="chart-box">
            <h3>🥧 Attendance Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(1)}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Subject Performance Comparison */}
          <div className="chart-box full-width">
            <h3>📈 Subject Performance Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={subjectChartData}>
                <defs>
                  <linearGradient id="colorAttended" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="attended" 
                  stroke="#667eea" 
                  fillOpacity={1} 
                  fill="url(#colorAttended)"
                  name="Classes Attended"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance Trend Line Chart */}
          {trendData.length > 0 && (
            <div className="chart-box full-width">
              <h3>📉 Attendance Trend (Recent)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 8 }}
                    name="Daily Attendance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* EXAM ELIGIBILITY TAB */}
      {activeTab === 'eligibility' && (
        <div className="eligibility-section">
          <div className={`eligibility-card ${isEligibleForExam ? 'eligible' : 'not-eligible'}`}>
            <div className="eligibility-header">
              <FaGraduationCap size={50} />
              <h2>Exam Eligibility Status</h2>
            </div>

            <div className="eligibility-content">
              <div className="percentage-display">
                <svg width="180" height="180">
                  <circle 
                    cx="90" cy="90" r="75" 
                    fill="none" 
                    stroke="#e0e0e0" 
                    strokeWidth="12"
                  />
                  <circle 
                    cx="90" cy="90" r="75" 
                    fill="none" 
                    stroke={attendanceColor} 
                    strokeWidth="12"
                    strokeDasharray={`${(stats.attendancePercentage / 100) * 471} 471`}
                    strokeLinecap="round"
                    transform="rotate(-90 90 90)"
                    style={{ transition: 'stroke-dasharray 1s ease-in-out' }}
                  />
                  <text 
                    x="90" y="85" 
                    textAnchor="middle" 
                    fontSize="32" 
                    fontWeight="bold"
                    fill={attendanceColor}
                  >
                    {stats.attendancePercentage}%
                  </text>
                  <text 
                    x="90" y="110" 
                    textAnchor="middle" 
                    fontSize="14" 
                    fill="#666"
                  >
                    Attendance
                  </text>
                </svg>
              </div>

              <div className="eligibility-details">
                <div className={`status-badge ${isEligibleForExam ? 'eligible' : 'not-eligible'}`}>
                  {isEligibleForExam ? (
                    <>
                      <FaCheckCircle size={30} />
                      <span>✅ ELIGIBLE FOR EXAMS</span>
                    </>
                  ) : (
                    <>
                      <FaTimesCircle size={30} />
                      <span>❌ NOT ELIGIBLE</span>
                    </>
                  )}
                </div>

                <div className="eligibility-stats">
                  <div className="stat-item">
                    <label>Total Classes:</label>
                    <strong>{stats.totalSessions}</strong>
                  </div>
                  <div className="stat-item">
                    <label>Classes Attended:</label>
                    <strong className="text-success">{stats.attendedSessions}</strong>
                  </div>
                  <div className="stat-item">
                    <label>Classes Missed:</label>
                    <strong className="text-danger">{stats.missedSessions}</strong>
                  </div>
                  <div className="stat-item">
                    <label>Minimum Required:</label>
                    <strong>75%</strong>
                  </div>
                  <div className="stat-item">
                    <label>Current Percentage:</label>
                    <strong style={{ color: attendanceColor }}>{stats.attendancePercentage}%</strong>
                  </div>
                </div>

                {!isEligibleForExam && (
                  <div className="warning-box">
                    <FaExclamationTriangle size={24} />
                    <div>
                      <h4>Action Required!</h4>
                      <p>
                        You need to attend <strong>{classesNeededFor75} more consecutive classes</strong> to reach 75% attendance and become eligible for exams.
                      </p>
                      <p className="shortage">
                        Current shortage: <strong>{(75 - stats.attendancePercentage).toFixed(2)}%</strong>
                      </p>
                    </div>
                  </div>
                )}

                {isEligibleForExam && (
                  <div className="success-box">
                    <FaCheckCircle size={24} />
                    <div>
                      <h4>Great Job!</h4>
                      <p>
                        You have met the minimum attendance requirement. You are eligible to appear for examinations.
                      </p>
                      <p className="surplus">
                        Surplus: <strong>{(stats.attendancePercentage - 75).toFixed(2)}%</strong> above minimum
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subject-wise Eligibility */}
            {stats.subjectWiseAttendance && stats.subjectWiseAttendance.length > 0 && (
              <div className="subject-eligibility">
                <h3>Subject-wise Eligibility Breakdown</h3>
                <div className="subject-list">
                  {stats.subjectWiseAttendance.map((subject, index) => {
                    const subjectPercentage = stats.totalSessions > 0 
                      ? ((subject.attended / stats.totalSessions) * 100).toFixed(1)
                      : 0;
                    const subjectEligible = subjectPercentage >= 75;
                    
                    return (
                      <div key={index} className="subject-eligibility-item">
                        <div className="subject-name">
                          {subjectEligible ? '✅' : '❌'} {subject._id}
                        </div>
                        <div className="subject-progress">
                          <div 
                            className="progress-bar"
                            style={{ 
                              width: `${subjectPercentage}%`,
                              backgroundColor: subjectEligible ? '#10b981' : '#ef4444'
                            }}
                          />
                        </div>
                        <div className="subject-percentage" style={{ 
                          color: subjectEligible ? '#10b981' : '#ef4444'
                        }}>
                          {subjectPercentage}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceStats;
