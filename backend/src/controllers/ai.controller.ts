import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai.service';

/**
 * @desc    Predict food freshness and safety window on-the-fly
 * @route   POST /api/ai/predict
 * @access  Private
 */
export const predictFreshness = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { foodCategory, preparationTime, estimatedExpiryTime, storageCondition } = req.body;

    if (!foodCategory || !preparationTime || !estimatedExpiryTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide foodCategory, preparationTime, and estimatedExpiryTime.',
      });
    }

    try {
      const prediction = await AIService.predictExpiry({
        foodCategory,
        preparationTime: new Date(preparationTime),
        estimatedExpiryTime: new Date(estimatedExpiryTime),
        storageCondition: storageCondition || 'ambient',
      });

      res.status(200).json({
        success: true,
        prediction,
      });
    } catch (aiErr: any) {
      if (aiErr.message && aiErr.message.includes('unavailable')) {
        return res.status(503).json({
          success: false,
          message: aiErr.message,
        });
      }
      throw aiErr;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check local Ollama AI status
 * @route   GET /api/ai/status
 * @access  Private
 */
export const checkAIStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isConnected = await AIService.checkHealth();
    res.status(200).json({
      success: true,
      provider: 'Ollama',
      model: 'qwen3:1.7b',
      status: isConnected ? 'Connected' : 'Disconnected',
    });
  } catch (error) {
    next(error);
  }
};
