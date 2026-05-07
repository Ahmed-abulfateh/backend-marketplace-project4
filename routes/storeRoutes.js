import { Router } from 'express'
import { bootstrap, health } from '../controllers/storeController.js'

const router = Router()

router.get('/health', health)
router.get('/bootstrap', bootstrap)

export default router