import { Request, Response, NextFunction } from 'express';
import { OllamaService } from '../services/ollamaService';

/**
 * @desc    Get AI engine health status
 * @route   GET /api/ai/health
 * @access  Public / Protected
 */
export const getAIHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await OllamaService.checkHealth();
    res.status(health.success ? 200 : 503).json(health);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      ollama: false,
      model: 'unknown',
      message: 'AI engine error: Unable to determine health status.',
    });
  }
};

/**
 * @desc    Backward compatible AI status endpoint
 * @route   GET /api/ai/status
 * @access  Public / Protected
 */
export const getAIStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await OllamaService.checkHealth();
    res.status(200).json({
      success: true,
      status: health.ollama ? 'Connected' : 'Disconnected',
      provider: 'Ollama',
      model: health.model,
      details: health.message,
    });
  } catch (err: any) {
    res.status(200).json({
      success: false,
      status: 'Disconnected',
      provider: 'Ollama',
      model: 'qwen3:1.7b',
      details: 'Ollama service offline',
    });
  }
};

/**
 * @desc    Predict freshness & safety index for food listing
 * @route   POST /api/ai/predict
 * @access  Public / Protected
 */
export const predictFreshness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { foodCategory, preparationTime, estimatedExpiryTime, storageCondition } = req.body;

    if (!foodCategory || !preparationTime || !estimatedExpiryTime) {
      return res.status(400).json({
        success: false,
        message: 'foodCategory, preparationTime, and estimatedExpiryTime are required.',
      });
    }

    const prediction = await OllamaService.predictFreshness({
      foodCategory,
      preparationTime,
      estimatedExpiryTime,
      storageCondition,
    });

    return res.status(200).json({
      success: true,
      prediction,
      data: {
        confidence: prediction.aiFreshnessScore,
        estimatedExpiry: `${prediction.aiSafeWindowHours} Hours`,
        riskLevel: prediction.aiRiskLevel === 'danger' ? 'High' : prediction.aiRiskLevel === 'warning' ? 'Medium' : 'Low',
        recommendation: prediction.aiRecommendation,
      },
    });
  } catch (err: any) {
    console.error('[AI Controller] Freshness prediction failed:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'AI freshness prediction currently unavailable.',
    });
  }
};

/**
 * @desc    FOOD AI Chat endpoint for FoodBridge platform assistance
 * @route   POST /api/ai/chat or POST /api/ai/food-ai-chat
 * @access  Public / Authenticated
 */
export const chatWithAI = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, message, query, history, role, userRole, userName } = req.body;
    const userQuery = message || prompt || query;

    if (!userQuery || typeof userQuery !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Prompt message is required.',
      });
    }

    const authenticatedUser = (req as any).user;
    const activeRole = authenticatedUser?.role || role || userRole || 'DONOR';
    const activeName = authenticatedUser?.name || userName || 'FoodBridge Member';

    const response = await OllamaService.chatWithFoodAI({
      message: userQuery,
      userRole: activeRole,
      userName: activeName,
      history: Array.isArray(history) ? history : [],
    });

    return res.status(200).json({
      success: true,
      reply: response,
      response,
      message: response,
    });
  } catch (err: any) {
    console.error('[AI Controller] Chat failed:', err);
    return res.status(500).json({
      success: false,
      message: 'FOOD AI is temporarily unavailable. Please try again shortly.',
    });
  }
};

export const foodAIChat = chatWithAI;
