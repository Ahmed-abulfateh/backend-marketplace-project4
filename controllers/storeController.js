import { buildStore, parseSession } from '../lib/marketplaceCore.js'

const health = async (_req, res) => {
  res.json({ ok: true })
}

const bootstrap = async (req, res) => {
  const session = parseSession(req)
  res.json({ store: await buildStore(session) })
}

export { bootstrap, health }