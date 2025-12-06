const nodemailer = require('nodemailer');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create transporter
const createTransporter = () => {
  console.log('📧 Creating email transporter...');
  console.log('📧 Email User:', process.env.EMAIL_USER);
  console.log('📧 Email Password Set:', process.env.EMAIL_PASSWORD ? 'YES ✅' : 'NO ❌');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ EMAIL_USER or EMAIL_PASSWORD not set in .env file!');
    throw new Error('Email credentials not configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  console.log('✅ Email transporter created successfully');
  return transporter;
};

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
  console.log('\n' + '='.repeat(60));
  console.log('📧 SENDING OTP EMAIL');
  console.log('='.repeat(60));
  console.log(`📨 To: ${email}`);
  console.log(`👤 Name: ${name}`);
  console.log(`🔑 OTP: ${otp}`);
  console.log('='.repeat(60));

  try {
    // Create transporter
    const transporter = createTransporter();

    // Verify transporter configuration
    console.log('🔍 Verifying email configuration...');
    await transporter.verify();
    console.log('✅ Email configuration verified');

    // Email options
    const mailOptions = {
      from: {
        name: 'QR Attendance System',
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: '🔐 Email Verification - QR Attendance System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .otp-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              padding: 20px;
              border-radius: 10px;
              margin: 30px 0;
              display: inline-block;
            }
            .footer {
              background: #f9fafb;
              padding: 20px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }
            .warning {
              color: #ef4444;
              font-size: 14px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 QR Attendance System</h1>
              <p>Email Verification</p>
            </div>
            <div class="content">
              <h2>Hello ${name}! 👋</h2>
              <p>Thank you for registering with us. Please use the OTP below to verify your email address:</p>
              <div class="otp-box">${otp}</div>
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
              <p class="warning">⚠️ Do not share this OTP with anyone!</p>
            </div>
            <div class="footer">
              <p>If you didn't request this, please ignore this email.</p>
              <p>© 2025 QR Attendance System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send email
    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`📧 Response: ${info.response}`);
    console.log('='.repeat(60) + '\n');
    
    return true;
  } catch (error) {
    console.error('\n' + '❌'.repeat(30));
    console.error('❌ EMAIL SENDING FAILED!');
    console.error('❌'.repeat(30));
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔴 AUTHENTICATION ERROR:');
      console.error('   - Check if EMAIL_USER is correct in .env');
      console.error('   - Check if EMAIL_PASSWORD is correct in .env');
      console.error('   - For Gmail, you need an "App Password"');
      console.error('   - Enable 2-Factor Authentication on Gmail');
      console.error('   - Generate App Password at: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n🔴 CONNECTION ERROR:');
      console.error('   - Check your internet connection');
      console.error('   - Gmail SMTP may be blocked by firewall');
    } else if (error.code === 'ESOCKET') {
      console.error('\n🔴 SOCKET ERROR:');
      console.error('   - Network timeout or connection refused');
    }
    
    console.error('\nFull Error Stack:');
    console.error(error);
    console.error('❌'.repeat(30) + '\n');
    
    return false;
  }
};

module.exports = { generateOTP, sendOTPEmail };