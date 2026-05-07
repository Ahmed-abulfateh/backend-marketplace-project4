import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    addressLine: { type: String, default: '' },
    city: { type: String, default: '' },
    road: { type: String, default: '' },
    block: { type: String, default: '' },
    country: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
    accountStatus: { type: String, enum: ['pending', 'active'], default: 'active' },
    passwordResetToken: { type: String, default: null },
    passwordResetExpiry: { type: Date, default: null },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)