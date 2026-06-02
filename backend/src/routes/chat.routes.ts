import { Router } from 'express';
import { getChats, getChatMessages, sendMessage } from '../controllers/chat.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.use(protect);

router.get('/', getChats);
router.get('/:id', getChatMessages);
router.post('/:id/messages', sendMessage);

export default router;
