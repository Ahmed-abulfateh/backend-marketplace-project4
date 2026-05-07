import crypto from 'crypto'
import User from '../models/User.js'
import { hashPassword, verifyPassword } from '../lib/auth.js'
import { buildStore, createSession, issueToken, mailTransport } from '../lib/marketplaceCore.js'

const signIn = async (req, res) => {
  const identifier = String(req.body?.identifier ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Username, email, or phone and password are required.' })
  }

  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }, { phone: identifier }],
  }).lean()

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Invalid credentials.' })
  }

  const session = createSession(user)
  res.json({ token: issueToken(session), store: await buildStore(session) })
}

const signUp = async (req, res) => {
  const username = String(req.body?.username ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const phone = String(req.body?.phone ?? '').trim()
  const addressLine = String(req.body?.addressLine ?? '').trim()
  const city = String(req.body?.city ?? '').trim()
  const road = String(req.body?.road ?? '').trim()
  const block = String(req.body?.block ?? '').trim()
  const country = String(req.body?.country ?? '').trim()
  const password = String(req.body?.password ?? '')
  const role = req.body?.role
  const publicRoles = ['buyer', 'seller']

  if (!username || !email || !phone || !password || !publicRoles.includes(role)) {
    return res.status(400).json({ message: 'Username, email, phone, password, and role are required.' })
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { phone }],
  }).lean()

  if (existingUser) {
    return res.status(409).json({ message: 'An account with that email or phone already exists.' })
  }

  const user = await User.create({
    id: `usr-${Date.now()}`,
    username,
    email,
    phone,
    addressLine,
    city,
    road,
    block,
    country,
    passwordHash: hashPassword(password),
    role,
    accountStatus: role === 'seller' ? 'pending' : 'active',
  })

  const session = createSession(user)
  res.status(201).json({ token: issueToken(session), store: await buildStore(session) })
}

const requestPasswordReset = async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 60 * 60 * 1000)

  const user = await User.findOneAndUpdate(
    { id: req.session.id },
    { $set: { passwordResetToken: token, passwordResetExpiry: expiry } },
    { new: true },
  ).lean()

  if (!user) {
    return res.status(404).json({ message: 'User not found.' })
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`

  if (mailTransport) {
    await mailTransport.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Reset your Signal Market password',
      html: `<p>Click the link below to reset your Signal Market password. It expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
    })
    return res.json({ message: 'Password reset email sent.' })
  }

  res.json({ message: 'Password reset link generated.', resetUrl })
}

const resetPassword = async (req, res) => {
  const token = String(req.body?.token ?? '').trim()
  const newPassword = String(req.body?.newPassword ?? '')

  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Token and a password of at least 8 characters are required.' })
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpiry: { $gt: new Date() },
  }).lean()

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset link. Please request a new one.' })
  }

  await User.findOneAndUpdate(
    { id: user.id },
    { $set: { passwordHash: hashPassword(newPassword), passwordResetToken: null, passwordResetExpiry: null } },
  )

  res.json({ message: 'Password updated successfully. You can now sign in with your new password.' })
}

export { requestPasswordReset, resetPassword, signIn, signUp }