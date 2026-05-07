import { Router } from 'express'
import { toggleCart, toggleFavorite, updateProfile } from '../controllers/profileController.js'
import authRequired from '../middleware/authMiddleware.js'

const router = Router()

router.patch('/', authRequired(['buyer', 'seller', 'admin']), updateProfile)
router.post('/favorites/:listingId/toggle', authRequired(['buyer', 'seller', 'admin']), toggleFavorite)
router.post('/cart/:listingId/toggle', authRequired(['buyer', 'seller', 'admin']), toggleCart)

export default router