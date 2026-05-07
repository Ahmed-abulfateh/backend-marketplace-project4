import User from '../models/User.js'
import { buildStore, createSession, ensureUserState } from '../lib/marketplaceCore.js'
import AppState from '../models/AppState.js'

const updateProfile = async (req, res) => {
  const username = String(req.body?.username ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const phone = String(req.body?.phone ?? '').trim()
  const addressLine = String(req.body?.addressLine ?? '').trim()
  const city = String(req.body?.city ?? '').trim()
  const road = String(req.body?.road ?? '').trim()
  const block = String(req.body?.block ?? '').trim()
  const country = String(req.body?.country ?? '').trim()

  if (!username || !email || !phone) {
    return res.status(400).json({ message: 'Username, email, and phone are required.' })
  }

  const conflictingUser = await User.findOne({
    id: { $ne: req.session.id },
    $or: [{ email }, { phone }],
  }).lean()

  if (conflictingUser) {
    return res.status(409).json({ message: 'Another account already uses that email or phone.' })
  }

  const user = await User.findOneAndUpdate(
    { id: req.session.id },
    {
      $set: {
        username,
        email,
        phone,
        addressLine,
        city,
        road,
        block,
        country,
      },
    },
    { new: true },
  ).lean()

  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  res.json({ store: await buildStore(createSession(user)) })
}

const toggleFavorite = async (req, res) => {
  const state = await ensureUserState(req.session)
  const favoriteIds = state.favoriteIds.includes(req.params.listingId)
    ? state.favoriteIds.filter((id) => id !== req.params.listingId)
    : [...state.favoriteIds, req.params.listingId]

  await AppState.updateOne({ ownerId: req.session.id }, { $set: { favoriteIds, role: req.session.role } })
  res.json({ store: await buildStore(req.session) })
}

const toggleCart = async (req, res) => {
  const state = await ensureUserState(req.session)
  const cartIds = state.cartIds.includes(req.params.listingId)
    ? state.cartIds.filter((id) => id !== req.params.listingId)
    : [...state.cartIds, req.params.listingId]

  await AppState.updateOne({ ownerId: req.session.id }, { $set: { cartIds, role: req.session.role } })
  res.json({ store: await buildStore(req.session) })
}

export { toggleCart, toggleFavorite, updateProfile }