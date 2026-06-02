import { Router } from 'express';
import { predictFreshness } from '../controllers/ai.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/predict', protect, predictFreshness);

export default router;
