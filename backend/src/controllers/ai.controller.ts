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

    const prediction = AIService.predictExpiry({
      foodCategory,
      preparationTime: new Date(preparationTime),
      estimatedExpiryTime: new Date(estimatedExpiryTime),
      storageCondition: storageCondition || 'ambient',
    });

    res.status(200).json({
      success: true,
      prediction,
    });
  } catch (error) {
    next(error);
  }
};
