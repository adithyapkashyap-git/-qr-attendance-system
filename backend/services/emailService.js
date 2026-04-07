const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.EMAIL_PORT || 465);
const SMTP_SECURE = String(process.env.EMAIL_SECURE || 'true').toLowerCase() !== 'false';
const SMTP_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS || 15000);

let transporter;

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const createTransporter = () => {
  if (transporter) {
    return transporter;
  }

  console.log('Creating email transporter...');
  console.log('Email host:', SMTP_HOST);
  console.log('Email port:', SMTP_PORT);
  console.log('Email user:', process.env.EMAIL_USER);
  console.log('Email password set:', process.env.EMAIL_PASSWORD ? 'YES' : 'NO');

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email credentials not configured');
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    requireTLS: true,
  });

  return transporter;
};

const withTimeout = (promise, timeoutMs, message) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(message);
        error.code = 'ETIMEOUT';
        reject(error);
      }, timeoutMs);
    }),
  ]);

// Send OTP email
const sendOTPEmail = async (email, otp, name) => {
  console.log('\n' + '='.repeat(60));
  console.log('SENDING OTP EMAIL');
  console.log('='.repeat(60));
  console.log(`To: ${email}`);
  console.log(`Name: ${name}`);
  console.log(`OTP: ${otp}`);
  console.log('='.repeat(60));

  try {
    const mailer = createTransporter();

    const mailOptions = {
      from: {
        name: 'QR Attendance System',
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: 'Email Verification - QR Attendance System',
      text: [
        `Hello ${name},`,
        '',
        `Your OTP for QR Attendance System is: ${otp}`,
        '',
        'This OTP is valid for 10 minutes.',
        'Do not share this OTP with anyone.',
      ].join('\n'),
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
              <h1>QR Attendance System</h1>
              <p>Email Verification</p>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Thank you for registering with us. Please use the OTP below to verify your email address:</p>
              <div class="otp-box">${otp}</div>
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
              <p class="warning">Do not share this OTP with anyone.</p>
            </div>
            <div class="footer">
              <p>If you did not request this, please ignore this email.</p>
              <p>&copy; 2025 QR Attendance System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log('Sending email...');
    const info = await withTimeout(
      mailer.sendMail(mailOptions),
      SMTP_TIMEOUT_MS,
      `Email send timed out after ${SMTP_TIMEOUT_MS}ms`
    );

    console.log('EMAIL SENT SUCCESSFULLY');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Response: ${info.response}`);
    console.log('='.repeat(60) + '\n');

    return true;
  } catch (error) {
    console.error('\n' + '!'.repeat(30));
    console.error('EMAIL SENDING FAILED');
    console.error('!'.repeat(30));
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);

    if (error.code === 'EAUTH') {
      console.error('Authentication failed for the configured email account.');
    } else if (error.code === 'ECONNECTION') {
      console.error('SMTP connection failed.');
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEOUT') {
      console.error('SMTP request timed out.');
    }

    console.error(error);
    console.error('!'.repeat(30) + '\n');

    return false;
  }
};

module.exports = { generateOTP, sendOTPEmail };
