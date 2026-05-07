import { Router } from 'express'
import authRequired from '../middleware/authMiddleware.js'
import { requestPasswordReset, resetPassword, signIn, signUp } from '../controllers/authController.js'

const router = Router()

router.post('/sign-in', signIn)
router.post('/sign-up', signUp)
router.post('/request-password-reset', authRequired(['buyer', 'seller', 'admin']), requestPasswordReset)
router.post('/reset-password', resetPassword)

export default router