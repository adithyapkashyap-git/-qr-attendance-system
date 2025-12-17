const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  usn: {
    type: String,
    required: [true, 'USN is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: [1, 'Semester must be between 1 and 8'],
    max: [8, 'Semester must be between 1 and 8']
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ✅ SIMPLIFIED: Hash password before saving (NO TRY-CATCH)
studentSchema.pre('save', async function() {
  // Only hash if password is new or modified
  if (!this.isModified('password')) {
    return;
  }

  console.log('🔐 Hashing password for:', this.email);
  
  // Generate salt and hash password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  console.log('✅ Password hashed successfully');
});

// ✅ Compare password method for login
studentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create indexes
studentSchema.index({ email: 1 });
studentSchema.index({ usn: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
