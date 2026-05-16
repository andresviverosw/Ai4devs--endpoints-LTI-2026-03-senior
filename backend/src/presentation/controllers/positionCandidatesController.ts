import { Request, Response } from 'express';
import { isAppError } from '../../application/errors/AppError';
import { getCandidatesForPosition } from '../../application/services/positionCandidatesService';

export async function getCandidatesForPositionHandler(req: Request, res: Response): Promise<void> {
  try {
    const positionId = parseInt(req.params.id, 10);
    if (Number.isNaN(positionId) || positionId < 1) {
      res.status(400).json({ message: 'Invalid position id' });
      return;
    }
    const result = await getCandidatesForPosition(req.prisma, positionId);
    res.status(200).json(result);
  } catch (error) {
    if (isAppError(error)) {
      res.status(error.statusCode).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
