const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.EMAIL_PORT || 465);
const SMTP_SECURE = String(process.env.EMAIL_SECURE || 'true').toLowerCase() !== 'false';
const SMTP_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS || 15000);
const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';
const BREVO_TIMEOUT_MS = Number(process.env.BREVO_TIMEOUT_MS || 15000);
const SMTP_BLOCKED_PORTS = new Set([25, 465, 587]);

let transporter;

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const isRenderEnvironment = () =>
  Boolean(
    process.env.RENDER ||
    process.env.RENDER_SERVICE_ID ||
    process.env.RENDER_INSTANCE_ID ||
    process.env.RENDER_EXTERNAL_HOSTNAME
  );

const getEmailServiceStatus = () => {
  const hasBrevoConfig = Boolean(
    process.env.BREVO_API_KEY &&
    (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER)
  );

  if (hasBrevoConfig) {
    return {
      ready: true,
      mode: 'brevo-api',
      message: 'Brevo API is configured',
    };
  }

  const hasSmtpConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  const smtpBlockedOnRender = isRenderEnvironment() && SMTP_BLOCKED_PORTS.has(SMTP_PORT);

  if (hasSmtpConfig && smtpBlockedOnRender) {
    return {
      ready: false,
      mode: 'smtp-blocked',
      message: 'SMTP email is blocked on this Render environment. Configure BREVO_API_KEY and BREVO_SENDER_EMAIL for OTP delivery.',
    };
  }

  if (hasSmtpConfig) {
    return {
      ready: true,
      mode: 'smtp',
      message: 'SMTP is configured',
    };
  }

  return {
    ready: false,
    mode: 'missing',
    message: 'OTP email service is not configured on the server.',
  };
};

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

  const emailServiceStatus = getEmailServiceStatus();
  if (!emailServiceStatus.ready && emailServiceStatus.mode === 'smtp-blocked') {
    const error = new Error(emailServiceStatus.message);
    error.code = 'ESMTPUNSUPPORTED';
    throw error;
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

const sendViaBrevoApi = async (email, otp, name, html) => {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
  const senderName = process.env.BREVO_SENDER_NAME || 'QR Attendance System';

  if (!process.env.BREVO_API_KEY || !senderEmail) {
    throw new Error('Brevo API credentials not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email, name }],
        subject: 'Email Verification - QR Attendance System',
        textContent: [
          `Hello ${name},`,
          '',
          `Your OTP for QR Attendance System is: ${otp}`,
          '',
          'This OTP is valid for 10 minutes.',
          'Do not share this OTP with anyone.',
        ].join('\n'),
        htmlContent: html,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Brevo API request failed with status ${response.status}: ${errorText}`);
      error.code = 'EBREVO';
      throw error;
    }

    const data = await response.json();
    console.log('EMAIL SENT SUCCESSFULLY VIA BREVO');
    console.log(`Brevo message ID: ${data.messageId || 'n/a'}`);
    return true;
  } finally {
    clearTimeout(timeout);
  }
};

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
    const html = `
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
      `;

    if (process.env.BREVO_API_KEY) {
      console.log('Sending email via Brevo API...');
      const sent = await sendViaBrevoApi(email, otp, name, html);
      console.log('='.repeat(60) + '\n');
      return sent;
    }

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
      html,
    };

    console.log('Sending email via SMTP...');
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
    } else if (error.code === 'ESMTPUNSUPPORTED') {
      console.error('The current hosted environment blocks SMTP. Use an HTTPS email API such as Brevo.');
    } else if (error.code === 'EBREVO') {
      console.error('Brevo API rejected the email request.');
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEOUT') {
      console.error('SMTP request timed out.');
    } else if (error.name === 'AbortError') {
      console.error('Brevo API request timed out.');
    }

    console.error(error);
    console.error('!'.repeat(30) + '\n');

    return false;
  }
};

module.exports = { generateOTP, sendOTPEmail, getEmailServiceStatus };
