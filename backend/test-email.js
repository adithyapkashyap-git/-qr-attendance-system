require('dotenv').config();
const { sendOTPEmail } = require('./services/emailService');

const testEmail = async () => {
  const email = 'your-test-email@gmail.com'; // Change this to your email
  const otp = '123456';
  const name = 'Test User';

  console.log('Sending test email...');
  const result = await sendOTPEmail(email, otp, name);
  
  if (result) {
    console.log('✅ Email sent successfully!');
  } else {
    console.log('❌ Failed to send email');
  }
  
  process.exit();
};

testEmail();
