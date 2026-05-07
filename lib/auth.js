import crypto from 'crypto'

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

const verifyPassword = (password, passwordHash) => {
  const [salt, savedKey] = String(passwordHash).split(':')

  if (!salt || !savedKey) {
    return false
  }

  const derivedKey = crypto.scryptSync(password, salt, 64)
  const savedBuffer = Buffer.from(savedKey, 'hex')

  if (derivedKey.length !== savedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(derivedKey, savedBuffer)
}

export { hashPassword, verifyPassword }