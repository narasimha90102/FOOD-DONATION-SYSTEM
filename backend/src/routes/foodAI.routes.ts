import { Router } from 'express';
import { getFoodAIHealth, handleFoodAIChat } from '../controllers/foodAI.controller';
import { optionalAuth } from '../middlewares/auth';

const router = Router();

router.get('/health', getFoodAIHealth);
router.post('/chat', optionalAuth, handleFoodAIChat);

export default router;
