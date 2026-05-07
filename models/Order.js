import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['buyer', 'seller', 'admin'], required: true },
    text: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    listingId: { type: String, required: true },
    buyerId: { type: String, default: '' },
    buyer: { type: String, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered'],
      required: true,
    },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    addressLine: { type: String, default: '' },
    city: { type: String, default: '' },
    road: { type: String, default: '' },
    block: { type: String, default: '' },
    country: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true },
)

export default mongoose.model('Order', orderSchema)