const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const lecturerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
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
  subjects: {
    type: [String],
    required: [true, 'At least one subject is required'],
    validate: {
      validator: function(arr) {
        return arr && arr.length > 0;
      },
      message: 'At least one subject is required'
    }
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ✅ SIMPLIFIED: Hash password before saving (NO TRY-CATCH)
lecturerSchema.pre('save', async function() {
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
lecturerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Create indexes
lecturerSchema.index({ email: 1 });
lecturerSchema.index({ employeeId: 1 });

const Lecturer = mongoose.model('Lecturer', lecturerSchema);

module.exports = Lecturer;
