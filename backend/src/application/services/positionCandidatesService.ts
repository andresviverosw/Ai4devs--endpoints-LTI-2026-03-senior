import type { PrismaClient } from '@prisma/client';
import { AppError } from '../errors/AppError';

function averageScoreFromInterviews(interviews: { score: number | null }[]): number | null {
  const scores = interviews
    .filter((i) => i.score !== null && i.score !== undefined)
    .map((i) => i.score as number);
  if (scores.length === 0) {
    return null;
  }
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export async function getCandidatesForPosition(
  prisma: PrismaClient,
  positionId: number,
): Promise<{
  candidates: Array<{
    full_name: string;
    current_interview_step: string;
    average_score: number | null;
  }>;
}> {
  const position = await prisma.position.findUnique({
    where: { id: positionId },
  });
  if (!position) {
    throw new AppError(404, 'Position not found');
  }

  const applications = await prisma.application.findMany({
    where: { positionId },
    include: {
      candidate: true,
      interviewStep: true,
      interviews: true,
    },
  });

  return {
    candidates: applications.map((app) => ({
      full_name: `${app.candidate.firstName} ${app.candidate.lastName}`.trim(),
      current_interview_step: app.interviewStep.name,
      average_score: averageScoreFromInterviews(app.interviews),
    })),
  };
}
