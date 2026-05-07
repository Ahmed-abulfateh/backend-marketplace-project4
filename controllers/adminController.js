import User from '../models/User.js'
import { buildStore } from '../lib/marketplaceCore.js'

const getAdminSellers = async (_req, res) => {
  const sellers = await User.find({ role: 'seller' }).sort({ createdAt: -1 }).lean()
  res.json({
    sellers: sellers.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      accountStatus: user.accountStatus ?? 'active',
    })),
  })
}

const updateSellerStatus = async (req, res) => {
  const { status } = req.body ?? {}

  if (!['pending', 'active'].includes(status)) {
    return res.status(400).json({ message: 'Status must be pending or active.' })
  }

  const user = await User.findOneAndUpdate(
    { id: req.params.userId, role: 'seller' },
    { $set: { accountStatus: status } },
    { new: true },
  ).lean()

  if (!user) {
    return res.status(404).json({ message: 'Seller not found.' })
  }

  res.json({ store: await buildStore(req.session) })
}

export { getAdminSellers, updateSellerStatus }