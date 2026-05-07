import { Router } from 'express'
import {
  addListingReview,
  addModerationNote,
  createListing,
  deleteListing,
  updateListing,
  updateListingStatus,
} from '../controllers/listingController.js'
import authRequired from '../middleware/authMiddleware.js'
import sellerApproved from '../middleware/sellerApproved.js'

const router = Router()

router.post('/', authRequired(['seller', 'admin']), sellerApproved, createListing)
router.patch('/:listingId', authRequired(['seller', 'admin']), sellerApproved, updateListing)
router.delete('/:listingId', authRequired(['seller', 'admin']), sellerApproved, deleteListing)
router.patch('/:listingId/status', authRequired(['seller', 'admin']), sellerApproved, updateListingStatus)
router.post('/:listingId/notes', authRequired(['admin']), addModerationNote)
router.post('/:listingId/reviews', authRequired(['buyer', 'admin']), addListingReview)

export default router