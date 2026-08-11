import { Router } from 'express';
import { predictFreshness, checkAIStatus } from '../controllers/ai.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/predict', protect, predictFreshness);
router.get('/status', protect, checkAIStatus);

export default router;
