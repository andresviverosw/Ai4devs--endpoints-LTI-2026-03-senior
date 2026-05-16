import type { PrismaClient } from '@prisma/client';
import { AppError } from '../errors/AppError';

export type UpdateStagePayload = {
  positionId: unknown;
  interviewStepId: unknown;
};

function assertPositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new AppError(400, `Invalid ${label}`);
  }
  return value;
}

export async function updateCandidateInterviewStage(
  prisma: PrismaClient,
  candidateId: number,
  body: UpdateStagePayload,
): Promise<{
  applicationId: number;
  candidateId: number;
  positionId: number;
  currentInterviewStep: number;
}> {
  const positionId = assertPositiveInteger(body.positionId, 'positionId');
  const interviewStepId = assertPositiveInteger(body.interviewStepId, 'interviewStepId');

  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) {
    throw new AppError(404, 'Candidate not found');
  }

  const position = await prisma.position.findUnique({
    where: { id: positionId },
  });
  if (!position) {
    throw new AppError(404, 'Position not found');
  }

  const application = await prisma.application.findFirst({
    where: { candidateId, positionId },
  });
  if (!application) {
    throw new AppError(404, 'Application not found');
  }

  const step = await prisma.interviewStep.findUnique({
    where: { id: interviewStepId },
  });
  if (!step || step.interviewFlowId !== position.interviewFlowId) {
    throw new AppError(400, 'Invalid interview step for this position');
  }

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: { currentInterviewStep: interviewStepId },
  });

  return {
    applicationId: updated.id,
    candidateId: updated.candidateId,
    positionId: updated.positionId,
    currentInterviewStep: updated.currentInterviewStep,
  };
}
