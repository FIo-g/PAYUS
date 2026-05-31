// SejongPay Merchant model — owner: 강동한 (DB) — schema per README
'use strict';

const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String },
    price: { type: Number },
    image: { type: String },
    description: { type: String },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

const dayHoursSchema = new mongoose.Schema(
  {
    open: { type: String },
    close: { type: String },
    isOff: { type: Boolean, default: false },
  },
  { _id: false }
);

const merchantSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    businessNo: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['restaurant', 'cafe', 'convenience', 'study', 'other'],
      required: true,
    },
    description: {
      type: String,
    },
    address: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },
    phone: {
      type: String,
    },
    images: {
      type: [String],
      validate: {
        validator: function (v) {
          return v.length <= 5;
        },
        message: 'images array cannot exceed 5 items',
      },
    },
    menu: {
      type: [menuItemSchema],
    },
    businessHours: {
      mon: { type: dayHoursSchema },
      tue: { type: dayHoursSchema },
      wed: { type: dayHoursSchema },
      thu: { type: dayHoursSchema },
      fri: { type: dayHoursSchema },
      sat: { type: dayHoursSchema },
      sun: { type: dayHoursSchema },
    },
    staticQrCode: {
      type: String,
    },
    // 강동한: provision via crypto.randomBytes(32).toString('hex'); 32+ chars required for per-merchant QR HMAC isolation
    dynamicQrSecret: {
      type: String,
      required: true,
      minlength: 32,
    },
    feeRate: {
      type: Number,
      default: 0.003,
    },
    cashbackRate: {
      type: Number,
      default: 0.02,
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    stampGoal: {
      type: Number,
      default: 10,
    },
    stampReward: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes per README
merchantSchema.index({ location: '2dsphere' });
merchantSchema.index({ category: 1, isActive: 1 });
merchantSchema.index({ businessNo: 1 }, { unique: true });
merchantSchema.index({ name: 'text' });

module.exports = mongoose.model('Merchant', merchantSchema);
