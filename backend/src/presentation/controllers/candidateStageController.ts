import { Request, Response } from 'express';
import { isAppError } from '../../application/errors/AppError';
import { updateCandidateInterviewStage } from '../../application/services/candidateInterviewStageService';

export async function updateCandidateStageHandler(req: Request, res: Response): Promise<void> {
  try {
    const candidateId = parseInt(req.params.id, 10);
    if (Number.isNaN(candidateId) || candidateId < 1) {
      res.status(400).json({ message: 'Invalid candidate id' });
      return;
    }
    const result = await updateCandidateInterviewStage(req.prisma, candidateId, req.body);
    res.status(200).json(result);
  } catch (error) {
    if (isAppError(error)) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
