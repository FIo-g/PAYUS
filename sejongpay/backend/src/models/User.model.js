// SejongPay User model — owner: 강동한 (DB) — schema per README
'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      // dedup: index defined once via schema.index() below
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    role: {
      type: String,
      enum: ['student', 'merchant', 'admin'],
      required: true,
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'walletBalance must be an integer',
      },
    },
    walletMonthlyCharged: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'walletMonthlyCharged must be an integer',
      },
    },
    cashbackTotal: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'cashbackTotal must be an integer',
      },
    },
    cashbackThisMonth: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'cashbackThisMonth must be an integer',
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profileImage: {
      type: String,
    },
    pushToken: {
      type: String,
    },
    refreshTokenHash: {
      type: String,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes per README
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ studentId: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);
