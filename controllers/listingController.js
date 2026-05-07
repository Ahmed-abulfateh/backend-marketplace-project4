import AppState from '../models/AppState.js'
import Listing from '../models/Listing.js'
import Order from '../models/Order.js'
import {
  buildStore,
  findManagedListing,
  hasOnlyValidListingImages,
  normalizeListingImageUrls,
  pickListingUpdates,
  slugify,
} from '../lib/marketplaceCore.js'

const createListing = async (req, res) => {
  const payload = req.body ?? {}
  const imageUrls = normalizeListingImageUrls(payload)
  const imageUrl = imageUrls[0] ?? ''

  if (!hasOnlyValidListingImages(imageUrls)) {
    return res.status(400).json({ message: 'Image URL must be a valid http(s) URL.' })
  }

  await Listing.create({
    id: slugify(payload.title || `listing-${Date.now()}`),
    title: payload.title,
    imageUrl,
    imageUrls,
    seller: req.session.name,
    price: Number(payload.price),
    meta: payload.meta,
    description: payload.description,
    category: payload.category,
    trust: payload.trust,
    shipping: payload.shipping,
    reviewScore: Number(payload.reviewScore ?? 4.8),
    inventory: Number(payload.inventory),
    status: 'review',
    moderationNotes: [],
  })

  res.status(201).json({ store: await buildStore(req.session) })
}

const updateListing = async (req, res) => {
  const listing = await findManagedListing(req, res)

  if (!listing) {
    return
  }

  const imageUrls = normalizeListingImageUrls(req.body)

  if ((req.body?.imageUrl !== undefined || req.body?.imageUrls !== undefined) && !hasOnlyValidListingImages(imageUrls)) {
    return res.status(400).json({ message: 'Image URL must be a valid http(s) URL.' })
  }

  const updates = pickListingUpdates({
    ...req.body,
    ...(req.body?.imageUrl !== undefined || req.body?.imageUrls !== undefined
      ? { imageUrl: imageUrls[0] ?? '', imageUrls }
      : {}),
  })

  await Listing.updateOne({ id: listing.id }, { $set: updates })
  res.json({ store: await buildStore(req.session) })
}

const deleteListing = async (req, res) => {
  const listing = await findManagedListing(req, res)

  if (!listing) {
    return
  }

  await Listing.deleteOne({ id: listing.id })
  await Order.deleteMany({ listingId: listing.id })
  await AppState.updateMany(
    {},
    {
      $pull: {
        favoriteIds: listing.id,
        cartIds: listing.id,
      },
    },
  )

  res.json({ store: await buildStore(req.session) })
}

const updateListingStatus = async (req, res) => {
  const listing = await findManagedListing(req, res)

  if (!listing) {
    return
  }

  await Listing.updateOne({ id: listing.id }, { $set: { status: req.body?.status } })
  res.json({ store: await buildStore(req.session) })
}

const addModerationNote = async (req, res) => {
  await Listing.updateOne(
    { id: req.params.listingId },
    {
      $push: {
        moderationNotes: {
          author: req.session.name,
          note: req.body?.note,
        },
      },
    },
  )

  res.json({ store: await buildStore(req.session) })
}

const addListingReview = async (req, res) => {
  const listing = await Listing.findOne({ id: req.params.listingId }).lean()

  if (!listing) {
    return res.status(404).json({ message: 'Listing not found.' })
  }

  const rating = Number(req.body?.rating)
  const comment = String(req.body?.comment ?? '').trim()

  if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !comment) {
    return res.status(400).json({ message: 'Rating (1-5) and comment are required.' })
  }

  const deliveredOrders = await Order.find({ listingId: listing.id, status: 'delivered' }).lean()
  const matchingOrder = deliveredOrders.find((order) => order.buyerId === req.session.id || order.buyer === req.session.name)

  if (!matchingOrder) {
    return res.status(403).json({ message: 'Only buyers with delivered orders can add reviews.' })
  }

  if (listing.reviews?.some((review) => review.orderId === matchingOrder.id)) {
    return res.status(409).json({ message: 'Review already submitted for this order.' })
  }

  const nextReviews = [
    ...(listing.reviews ?? []),
    {
      orderId: matchingOrder.id,
      buyerId: req.session.id,
      author: req.session.name,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    },
  ]
  const nextScore = nextReviews.reduce((sum, review) => sum + review.rating, 0) / nextReviews.length

  await Listing.updateOne(
    { id: listing.id },
    {
      $set: { reviewScore: Number(nextScore.toFixed(1)) },
      $push: {
        reviews: {
          orderId: matchingOrder.id,
          buyerId: req.session.id,
          author: req.session.name,
          rating,
          comment,
        },
      },
    },
  )

  res.status(201).json({ store: await buildStore(req.session) })
}

export { addListingReview, addModerationNote, createListing, deleteListing, updateListing, updateListingStatus }