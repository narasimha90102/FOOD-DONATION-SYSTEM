import { Router } from 'express';
import { getAIHealth, getAIStatus, predictFreshness } from '../controllers/ai.controller';
import { handleFoodAIChat, getFoodAIHealth } from '../controllers/foodAI.controller';
import { optionalAuth } from '../middlewares/auth';

const router = Router();

router.get('/health', getFoodAIHealth);
router.get('/status', getAIStatus);
router.post('/predict', predictFreshness);
router.post('/analyze', predictFreshness);
router.post('/chat', optionalAuth, handleFoodAIChat);
router.post('/food-ai-chat', optionalAuth, handleFoodAIChat);

export default router;
