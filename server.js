import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mongoose from 'mongoose'
import morgan from 'morgan'
import adminRoutes from './routes/adminRoutes.js'
import authRoutes from './routes/authRoutes.js'
import errorMiddleware from './middleware/errorMiddleware.js'
import AppState from './models/AppState.js'
import User from './models/User.js'
import listingRoutes from './routes/listingRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import storeRoutes from './routes/storeRoutes.js'
import { ensureSeedData } from './lib/marketplaceCore.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT ?? 3000)

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`)
})

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error.message)
})

const allowedOrigins = Array.from(
  new Set(
    [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ].filter(Boolean),
  ),
)

const isAllowedOrigin = (origin) => {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    return true
  }

  try {
    const parsedOrigin = new URL(origin)
    const isLocalhost = ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname)
    const hasDevPort = /^\d+$/.test(parsedOrigin.port)
    return isLocalhost && hasDevPort
  } catch {
    return false
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin is not allowed by CORS.'))
    },
  }),
)
app.use(express.json())
app.use(morgan('dev'))

app.get('/', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', storeRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api', profileRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/orders', orderRoutes)
app.post('/api/checkout', (req, res, next) => {
  req.url = '/checkout/create'
  next()
}, orderRoutes)
app.use('/api/admin', adminRoutes)
app.use(errorMiddleware)

const startServer = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment.')
    process.exit(1)
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })

    await AppState.deleteMany({ ownerId: { $exists: false } })
    await User.deleteMany({
      $or: [
        { email: { $exists: false } },
        { email: null },
        { phone: { $exists: false } },
        { phone: null },
        { passwordHash: { $exists: false } },
        { passwordHash: null },
      ],
    })

    await Promise.all([AppState.syncIndexes(), User.syncIndexes()])
    await ensureSeedData()

    app.listen(port, () => {
      console.log(`Marketplace backend ready on port ${port}`)
    })
  } catch (error) {
    console.error('Server startup failed:', error)
    process.exit(1)
  }
}

startServer()