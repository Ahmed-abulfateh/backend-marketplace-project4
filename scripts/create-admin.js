import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { hashPassword } from '../lib/auth.js'
import User from '../models/User.js'

dotenv.config()

const usage = [
  'Usage:',
  'npm run admin:create -- --username <username> --email <email> --phone <phone> --password <password>',
  '',
  'Example:',
  'npm run admin:create -- --username ops-admin --email ops@example.com --phone 97330000000 --password StrongPass123!',
].join('\n')

const parseArgs = (argv) => {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]
    const value = argv[index + 1]

    if (!key?.startsWith('--')) {
      continue
    }

    if (!value || value.startsWith('--')) {
      args[key.slice(2)] = 'true'
      continue
    }

    args[key.slice(2)] = value
  }

  return args
}

const createUserId = (username) =>
  `usr-admin-${String(username)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now()}`

const args = parseArgs(process.argv.slice(2))

if (args.help === 'true') {
  console.log(usage)
  process.exit(0)
}

const username = String(args.username ?? '').trim()
const email = String(args.email ?? '').trim().toLowerCase()
const phone = String(args.phone ?? '').trim()
const password = String(args.password ?? '')

if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment.')
  process.exit(1)
}

if (!username || !email || !phone || !password) {
  console.error(usage)
  process.exit(1)
}

try {
  await mongoose.connect(process.env.MONGODB_URI)

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  }).lean()

  if (existingUser) {
    console.error('A user with that email or phone already exists.')
    process.exitCode = 1
  } else {
    const user = await User.create({
      id: createUserId(username),
      username,
      email,
      phone,
      passwordHash: hashPassword(password),
      role: 'admin',
    })

    console.log(`Admin created: ${user.email}`)
  }
} catch (error) {
  console.error('Failed to create admin user:', error)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}