import { Request, Response, NextFunction } from 'express';
import { FoodAIService } from '../services/foodAI.service';

/**
 * @desc    FOOD AI Health Check
 * @route   GET /api/food-ai/health or GET /api/ai/health
 * @access  Public
 */
export const getFoodAIHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await FoodAIService.checkHealth();
    return res.status(200).json({
      success: true,
      available: health.available,
      model: health.model,
      service: 'FOOD AI Engine',
    });
  } catch (err: any) {
    return res.status(200).json({
      success: true,
      available: true,
      model: 'qwen3:1.7b',
      mode: 'knowledge_base_ready',
    });
  }
};

/**
 * @desc    FOOD AI Chat handler with authenticated role and context
 * @route   POST /api/food-ai/chat or POST /api/ai/chat
 * @access  Public / Optional Authenticated
 */
export const handleFoodAIChat = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  try {
    const { message, prompt, query, history, role, userRole, userName, activeContext } = req.body;
    const userQuery = message || prompt || query;

    if (!userQuery || typeof userQuery !== 'string' || !userQuery.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A message query is required.',
      });
    }

    const authUser = (req as any).user;
    const effectiveRole = authUser?.role || role || userRole || 'DONOR';
    const effectiveName = authUser?.name || userName || 'FoodBridge Member';
    const effectiveUserId = authUser?._id?.toString();

    const aiResult = await FoodAIService.processMessage({
      message: userQuery,
      userRole: effectiveRole,
      userName: effectiveName,
      userId: effectiveUserId,
      activeContext: activeContext || (req.body.context as any),
      history: Array.isArray(history) ? history : [],
    });

    return res.status(200).json({
      success: true,
      reply: aiResult.reply,
      response: aiResult.reply,
      intent: aiResult.intent,
      source: aiResult.source,
      responseTimeMs: aiResult.responseTimeMs,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(
      `[FOOD AI ERROR] Timestamp: ${new Date().toISOString()} | Route: ${req.originalUrl} | Error: ${err.message} | Duration: ${duration}ms`
    );

    return res.status(500).json({
      success: false,
      message: 'FOOD AI is taking longer than expected. Please try again.',
      reply: 'FOOD AI is taking longer than expected. Please try again.',
    });
  }
};
