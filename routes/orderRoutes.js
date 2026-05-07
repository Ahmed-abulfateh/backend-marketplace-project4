import { Router } from 'express'
import { advanceOrderStatus, checkout, sendOrderMessage } from '../controllers/orderController.js'
import authRequired from '../middleware/authMiddleware.js'

const router = Router()

router.patch('/:orderId/advance', authRequired(['seller', 'admin']), advanceOrderStatus)
router.post('/:orderId/messages', authRequired(['buyer', 'seller', 'admin']), sendOrderMessage)
router.post('/checkout/create', authRequired(['buyer', 'seller', 'admin']), checkout)

export default router