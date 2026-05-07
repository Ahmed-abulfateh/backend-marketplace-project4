import AppState from '../models/AppState.js'
import Listing from '../models/Listing.js'
import Order from '../models/Order.js'
import { buildStore, canManageOrder, mailTransport, orderStatusFlow } from '../lib/marketplaceCore.js'

const advanceOrderStatus = async (req, res) => {
  const order = await Order.findOne({ id: req.params.orderId }).lean()

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' })
  }

  const canManage = await canManageOrder(req.session, order)

  if (!canManage) {
    return res.status(403).json({ message: 'You cannot manage this order.' })
  }

  const requestedStatus = String(req.body?.status ?? '').trim().toLowerCase()
  const allowedManualStatuses = ['pending', 'paid', 'shipped', 'delivered', 'complete']

  if (requestedStatus && !allowedManualStatuses.includes(requestedStatus)) {
    return res.status(400).json({ message: 'Status must be pending, paid, shipped, or delivered.' })
  }

  const nextStatus = requestedStatus
    ? requestedStatus === 'complete'
      ? 'delivered'
      : requestedStatus
    : orderStatusFlow[order.status] ?? order.status

  await Order.updateOne({ id: req.params.orderId }, { $set: { status: nextStatus } })

  if (mailTransport && order.email && nextStatus !== order.status) {
    void mailTransport
      .sendMail({
        from: process.env.WORKSPACE_EMAIL || process.env.SMTP_USER,
        to: order.email,
        subject: `Signal Market order ${order.id} status updated`,
        text: `Your order ${order.id} is now ${nextStatus}.`,
      })
      .catch((error) => {
        console.error('Order status email failed:', error)
      })
  }

  res.json({ store: await buildStore(req.session) })
}

const sendOrderMessage = async (req, res) => {
  const order = await Order.findOne({ id: req.params.orderId }).lean()

  if (!order) {
    return res.status(404).json({ message: 'Order not found.' })
  }

  const canManage = await canManageOrder(req.session, order)

  if (!canManage) {
    return res.status(403).json({ message: 'You cannot message on this order.' })
  }

  const text = String(req.body?.text ?? '').trim()

  if (!text) {
    return res.status(400).json({ message: 'Message text is required.' })
  }

  await Order.updateOne(
    { id: req.params.orderId },
    {
      $push: {
        messages: {
          senderId: req.session.id,
          senderName: req.session.name,
          senderRole: req.session.role,
          text,
        },
      },
    },
  )

  res.status(201).json({ store: await buildStore(req.session) })
}

const checkout = async (req, res) => {
  const { addressLine, block, buyerName, city, country, email, listingIds, paymentMethod, phone, road } = req.body ?? {}
  const requestedListingIds = Array.isArray(listingIds) ? listingIds : []

  if (requestedListingIds.length === 0) {
    return res.status(400).json({ message: 'At least one listing is required for checkout.' })
  }

  const listingQuantityMap = requestedListingIds.reduce((map, id) => {
    const key = String(id)
    map.set(key, (map.get(key) ?? 0) + 1)
    return map
  }, new Map())

  const listings = await Listing.find({ id: { $in: Array.from(listingQuantityMap.keys()) } }).lean()

  if (listings.length !== listingQuantityMap.size) {
    return res.status(404).json({ message: 'One or more selected listings were not found.' })
  }

  const outOfStockListing = listings.find((listing) => listing.inventory < (listingQuantityMap.get(listing.id) ?? 0))

  if (outOfStockListing) {
    return res.status(409).json({ message: `Insufficient stock for ${outOfStockListing.title}.` })
  }

  const decrementedListings = []

  try {
    for (const listing of listings) {
      const requestedQuantity = listingQuantityMap.get(listing.id) ?? 0

      if (requestedQuantity <= 0) {
        continue
      }

      const updatedListing = await Listing.findOneAndUpdate(
        { id: listing.id, inventory: { $gte: requestedQuantity } },
        { $inc: { inventory: -requestedQuantity } },
        { new: true },
      ).lean()

      if (!updatedListing) {
        throw new Error(`Insufficient stock for ${listing.title}.`)
      }

      decrementedListings.push({ id: listing.id, quantity: requestedQuantity })
    }
  } catch (error) {
    await Promise.all(decrementedListings.map(({ id, quantity }) => Listing.updateOne({ id }, { $inc: { inventory: quantity } })))

    return res.status(409).json({
      message: error instanceof Error ? error.message : 'Unable to confirm order due to stock availability.',
    })
  }

  try {
    const count = await Order.countDocuments()
    const shippingAddress = [addressLine, city, road, block, country].filter(Boolean).join(', ')
    const createdOrders = await Order.insertMany(
      requestedListingIds.map((listingId, index) => {
        const listing = listings.find((item) => item.id === String(listingId))

        if (!listing) {
          throw new Error('Could not build orders for checkout.')
        }

        return {
          id: `ord-${1044 + count + index}`,
          listingId: listing.id,
          buyerId: req.session.id,
          buyer: buyerName || req.session.name,
          total: listing.price,
          status: 'pending',
          email,
          phone,
          addressLine,
          city,
          road,
          block,
          country,
          shippingAddress,
          paymentMethod,
          messages: [],
        }
      }),
    )

    await AppState.updateOne({ ownerId: req.session.id }, { $set: { cartIds: [] } })

    let emailSent = false

    if (mailTransport && email) {
      try {
        await mailTransport.sendMail({
          from: process.env.WORKSPACE_EMAIL || process.env.SMTP_USER,
          to: email,
          subject: 'Signal Market order confirmation',
          text: `Your order has been created for ${createdOrders.length} item(s).`,
        })
        emailSent = true
      } catch (error) {
        console.error('Email send failed:', error)
      }
    }

    res.status(201).json({
      store: await buildStore(req.session),
      confirmation: {
        buyerName: buyerName || req.session.name,
        email,
        address: shippingAddress,
        paymentMethod,
        emailSent,
        orderIds: createdOrders.map((order) => order.id),
      },
    })
  } catch (error) {
    await Promise.all(decrementedListings.map(({ id, quantity }) => Listing.updateOne({ id }, { $inc: { inventory: quantity } })))
    res.status(500).json({ message: error instanceof Error ? error.message : 'Checkout failed.' })
  }
}

export { advanceOrderStatus, checkout, sendOrderMessage }