import mongoose from 'mongoose'

const appStateSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, unique: true },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
    favoriteIds: { type: [String], default: [] },
    cartIds: { type: [String], default: [] },
  },
  { timestamps: true },
)

export default mongoose.model('AppState', appStateSchema)