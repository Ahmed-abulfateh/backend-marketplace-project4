import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import AppState from '../models/AppState.js'
import Listing from '../models/Listing.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import { hashPassword } from './auth.js'
import {
  defaultAppStateByRole,
  demoListingIds,
  demoOrderIds,
  initialListings,
  initialOrders,
  initialUsers,
} from '../seed/initialData.js'

const jwtSecret = process.env.JWT_SECRET || 'dev-secret'

const orderStatusFlow = {
  pending: 'paid',
  paid: 'shipped',
  shipped: 'delivered',
  delivered: 'delivered',
}

const mailTransport =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null

const cleanDocument = (document) => {
  if (!document) {
    return document
  }

  const { _id, __v, ...rest } = document
  return rest
}

const createSession = (user) => ({
  id: user.id,
  name: user.username,
  username: user.username,
  email: user.email,
  phone: user.phone,
  addressLine: user.addressLine ?? '',
  city: user.city ?? '',
  road: user.road ?? '',
  block: user.block ?? '',
  country: user.country ?? '',
  role: user.role,
  accountStatus: user.accountStatus ?? 'active',
})

const ensureSeedData = async () => {
  if (demoListingIds.length > 0) {
    await Listing.deleteMany({ id: { $in: demoListingIds } })
    await Order.deleteMany({ $or: [{ id: { $in: demoOrderIds } }, { listingId: { $in: demoListingIds } }] })
    await AppState.updateMany(
      {},
      {
        $pull: {
          favoriteIds: { $in: demoListingIds },
          cartIds: { $in: demoListingIds },
        },
      },
    )
  }

  if ((await Listing.countDocuments()) === 0) {
    await Listing.insertMany(initialListings)
  }

  if ((await Order.countDocuments()) === 0) {
    await Order.insertMany(initialOrders)
  }

  for (const user of initialUsers) {
    await User.updateOne(
      { email: user.email },
      {
        $setOnInsert: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          addressLine: user.addressLine ?? '',
          city: user.city ?? '',
          road: user.road ?? '',
          block: user.block ?? '',
          country: user.country ?? '',
          passwordHash: hashPassword(user.password),
          role: user.role,
          accountStatus: 'active',
        },
      },
      { upsert: true },
    )
  }

  await User.updateMany({ accountStatus: { $exists: false } }, { $set: { accountStatus: 'active' } })
}

const ensureUserState = async (session) => {
  const defaults = defaultAppStateByRole[session.role] ?? { favoriteIds: [], cartIds: [] }
  const state = await AppState.findOneAndUpdate(
    { ownerId: session.id },
    { $setOnInsert: { ownerId: session.id, role: session.role, ...defaults } },
    { returnDocument: 'after', upsert: true },
  ).lean()

  return cleanDocument(state)
}

const buildStore = async (session = null) => {
  let activeSession = session

  if (session?.id) {
    const user = await User.findOne({ id: session.id }).lean()
    activeSession = user ? createSession(user) : null
  }

  const listings = (await Listing.find().sort({ createdAt: -1 }).lean()).map(cleanDocument)
  const orders = (await Order.find().sort({ createdAt: -1 }).lean()).map(cleanDocument)
  const appState = activeSession ? await ensureUserState(activeSession) : null

  const pendingSellers =
    activeSession?.role === 'admin'
      ? (await User.find({ role: 'seller' }).sort({ createdAt: -1 }).lean()).map((user) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          accountStatus: user.accountStatus ?? 'active',
        }))
      : undefined

  return {
    session: activeSession,
    listings,
    favoriteIds: appState?.favoriteIds ?? [],
    cartIds: appState?.cartIds ?? [],
    orders,
    ...(pendingSellers !== undefined ? { pendingSellers } : {}),
  }
}

const parseSession = (req) => {
  const authorization = req.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  try {
    return jwt.verify(authorization.slice(7), jwtSecret)
  } catch {
    return null
  }
}

const issueToken = (session) => jwt.sign(session, jwtSecret, { expiresIn: '7d' })

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const editableListingFields = [
  'title',
  'imageUrl',
  'imageUrls',
  'price',
  'meta',
  'description',
  'category',
  'trust',
  'shipping',
  'inventory',
]

const pickListingUpdates = (payload = {}) =>
  Object.fromEntries(
    editableListingFields
      .filter((field) => payload[field] !== undefined)
      .map((field) => {
        if (field === 'price' || field === 'inventory') {
          return [field, Number(payload[field])]
        }

        if (field === 'imageUrl') {
          return [field, String(payload[field] ?? '').trim()]
        }

        if (field === 'imageUrls') {
          const imageUrls = Array.isArray(payload[field])
            ? payload[field].map((value) => String(value ?? '').trim()).filter(Boolean).slice(0, 6)
            : []

          return [field, imageUrls]
        }

        return [field, payload[field]]
      }),
  )

const isValidListingImageUrl = (value) => {
  if (!value) {
    return true
  }

  try {
    const parsed = new URL(String(value))
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const normalizeListingImageUrls = (payload = {}) => {
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.map((value) => String(value ?? '').trim()).filter(Boolean).slice(0, 6)
    : []
  const fallbackImageUrl = String(payload.imageUrl ?? '').trim()

  if (fallbackImageUrl && !imageUrls.includes(fallbackImageUrl)) {
    imageUrls.unshift(fallbackImageUrl)
  }

  return imageUrls.slice(0, 6)
}

const hasOnlyValidListingImages = (imageUrls) => imageUrls.every((value) => isValidListingImageUrl(value))

const findManagedListing = async (req, res) => {
  const listing = await Listing.findOne({ id: req.params.listingId }).lean()

  if (!listing) {
    res.status(404).json({ message: 'Listing not found.' })
    return null
  }

  const isAdmin = req.session.role === 'admin'
  const isOwner = listing.seller === req.session.name

  if (!isAdmin && !isOwner) {
    res.status(403).json({ message: 'You cannot manage this listing.' })
    return null
  }

  return listing
}

const canManageOrder = async (session, order) => {
  if (session.role === 'admin') {
    return true
  }

  if (order.buyerId === session.id || order.buyer === session.name || (session.email && order.email === session.email)) {
    return true
  }

  if (session.role === 'seller') {
    const listing = await Listing.findOne({ id: order.listingId }).lean()
    return listing?.seller === session.name
  }

  return false
}

export {
  buildStore,
  canManageOrder,
  createSession,
  ensureSeedData,
  ensureUserState,
  findManagedListing,
  hasOnlyValidListingImages,
  issueToken,
  mailTransport,
  normalizeListingImageUrls,
  orderStatusFlow,
  parseSession,
  pickListingUpdates,
  slugify,
}