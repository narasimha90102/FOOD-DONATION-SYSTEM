import { Router } from 'express';
import {
  createDonation,
  getDonations,
  getNearbyDonations,
  getDonationById,
  acceptDonation,
  updateDonationStatus,
  getDonorStats,
} from '../controllers/donation.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Apply protective shield to all routes
router.use(protect);

router.post('/', authorize('DONOR'), createDonation);
router.get('/', getDonations);
router.get('/nearby', authorize('NGO'), getNearbyDonations);
router.get('/donor-stats', authorize('DONOR'), getDonorStats);
router.get('/:id', getDonationById);
router.put('/:id/accept', authorize('NGO'), acceptDonation);
router.put('/:id/status', updateDonationStatus);

export default router;
