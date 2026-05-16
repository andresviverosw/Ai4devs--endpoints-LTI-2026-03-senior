import { Router } from 'express';
import { getCandidatesForPositionHandler } from '../presentation/controllers/positionCandidatesController';

const router = Router();

router.get('/:id/candidates', getCandidatesForPositionHandler);

export default router;
