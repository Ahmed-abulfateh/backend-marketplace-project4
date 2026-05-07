import { Router } from 'express'
import { getAdminSellers, updateSellerStatus } from '../controllers/adminController.js'
import authRequired from '../middleware/authMiddleware.js'

const router = Router()

router.get('/sellers', authRequired(['admin']), getAdminSellers)
router.patch('/sellers/:userId/status', authRequired(['admin']), updateSellerStatus)

export default router