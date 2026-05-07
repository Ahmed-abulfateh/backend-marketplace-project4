import User from '../models/User.js'
import { createSession, parseSession } from '../lib/marketplaceCore.js'

const authRequired = (roles) => async (req, res, next) => {
  const tokenSession = parseSession(req)

  if (!tokenSession) {
    return res.status(401).json({ message: 'Authentication required.' })
  }

  const user = await User.findOne({ id: tokenSession.id }).lean()

  if (!user) {
    return res.status(401).json({ message: 'User session is no longer valid.' })
  }

  const session = createSession(user)

  if (roles && !roles.includes(session.role)) {
    return res.status(403).json({ message: 'Role is not allowed for this action.' })
  }

  req.session = session
  next()
}

export default authRequired