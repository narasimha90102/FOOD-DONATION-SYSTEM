import { Router } from 'express';
import {
  createDonation,
  getDonations,
  getNearbyDonations,
  getDonationById,
  acceptDonation,
  updateDonationStatus,
  getDonorStats,
  assignVolunteer,
  distributeDonation,
  updateDonation,
  volunteerCancelDonation,
  repairCorruptedCoordinates,
} from '../controllers/donation.controller';
import { protect, authorize } from '../middlewares/auth';

const router = Router();

// Apply protective shield to all routes
router.use(protect);

router.post('/', authorize('DONOR'), createDonation);
router.post('/repair-coordinates', repairCorruptedCoordinates);
router.get('/', getDonations);
router.get('/nearby', authorize('NGO'), getNearbyDonations);
router.get('/donor-stats', authorize('DONOR'), getDonorStats);
router.get('/:id', getDonationById);
router.put('/:id/accept', authorize('NGO'), acceptDonation);
router.put('/:id/status', updateDonationStatus);
router.put('/:id/assign-volunteer', authorize('VOLUNTEER'), assignVolunteer);
router.put('/:id/distribute', authorize('NGO'), distributeDonation);
router.put('/:id/volunteer-cancel', authorize('VOLUNTEER'), volunteerCancelDonation);
router.put('/:id', authorize('DONOR', 'ADMIN'), updateDonation);

export default router;
