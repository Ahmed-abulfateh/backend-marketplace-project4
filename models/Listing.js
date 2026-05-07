import mongoose from 'mongoose'

const moderationNoteSchema = new mongoose.Schema(
  {
    author: { type: String, required: true },
    note: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false },
)

const reviewSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    buyerId: { type: String, required: true },
    author: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false },
)

const listingSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    imageUrls: { type: [String], default: [] },
    seller: { type: String, required: true },
    price: { type: Number, required: true },
    meta: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    trust: { type: String, required: true },
    shipping: { type: String, required: true },
    reviewScore: { type: Number, required: true },
    inventory: { type: Number, required: true },
    status: { type: String, enum: ['live', 'review', 'paused'], required: true },
    moderationNotes: { type: [moderationNoteSchema], default: [] },
    reviews: { type: [reviewSchema], default: [] },
  },
  { timestamps: true },
)

export default mongoose.model('Listing', listingSchema)