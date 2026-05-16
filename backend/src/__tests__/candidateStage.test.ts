import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../app';

function createMockPrisma(partial: Partial<PrismaClient> = {}): PrismaClient {
  return partial as PrismaClient;
}

describe('PUT /candidates/:id/stage', () => {
  it('updates currentInterviewStep for the application on that position (happy path)', async () => {
    // Arrange
    const candidateFindUnique = jest.fn().mockResolvedValue({ id: 3 });
    const positionFindUnique = jest.fn().mockResolvedValue({ id: 10, interviewFlowId: 55 });
    const applicationFindFirst = jest.fn().mockResolvedValue({
      id: 200,
      candidateId: 3,
      positionId: 10,
      currentInterviewStep: 1,
    });
    const interviewStepFindUnique = jest.fn().mockResolvedValue({ id: 9, interviewFlowId: 55 });
    const applicationUpdate = jest.fn().mockResolvedValue({
      id: 200,
      candidateId: 3,
      positionId: 10,
      currentInterviewStep: 9,
    });
    const prisma = createMockPrisma({
      candidate: { findUnique: candidateFindUnique } as unknown as PrismaClient['candidate'],
      position: { findUnique: positionFindUnique } as unknown as PrismaClient['position'],
      application: {
        findFirst: applicationFindFirst,
        update: applicationUpdate,
      } as unknown as PrismaClient['application'],
      interviewStep: { findUnique: interviewStepFindUnique } as unknown as PrismaClient['interviewStep'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).put('/candidates/3/stage').send({
      positionId: 10,
      interviewStepId: 9,
    });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      applicationId: 200,
      candidateId: 3,
      positionId: 10,
      currentInterviewStep: 9,
    });
    expect(applicationUpdate).toHaveBeenCalledWith({
      where: { id: 200 },
      data: { currentInterviewStep: 9 },
    });
  });

  it('responds 404 when the candidate does not exist', async () => {
    // Arrange
    const candidateFindUnique = jest.fn().mockResolvedValue(null);
    const prisma = createMockPrisma({
      candidate: { findUnique: candidateFindUnique } as unknown as PrismaClient['candidate'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).put('/candidates/404/stage').send({
      positionId: 1,
      interviewStepId: 2,
    });

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Candidate not found' });
  });

  it('responds 404 when the position does not exist', async () => {
    // Arrange
    const candidateFindUnique = jest.fn().mockResolvedValue({ id: 1 });
    const positionFindUnique = jest.fn().mockResolvedValue(null);
    const prisma = createMockPrisma({
      candidate: { findUnique: candidateFindUnique } as unknown as PrismaClient['candidate'],
      position: { findUnique: positionFindUnique } as unknown as PrismaClient['position'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).put('/candidates/1/stage').send({
      positionId: 999,
      interviewStepId: 2,
    });

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Position not found' });
  });

  it('responds 404 when there is no application for that candidate and position', async () => {
    // Arrange
    const candidateFindUnique = jest.fn().mockResolvedValue({ id: 1 });
    const positionFindUnique = jest.fn().mockResolvedValue({ id: 10, interviewFlowId: 55 });
    const applicationFindFirst = jest.fn().mockResolvedValue(null);
    const applicationUpdate = jest.fn();
    const prisma = createMockPrisma({
      candidate: { findUnique: candidateFindUnique } as unknown as PrismaClient['candidate'],
      position: { findUnique: positionFindUnique } as unknown as PrismaClient['position'],
      application: {
        findFirst: applicationFindFirst,
        update: applicationUpdate,
      } as unknown as PrismaClient['application'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).put('/candidates/1/stage').send({
      positionId: 10,
      interviewStepId: 9,
    });

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Application not found' });
    expect(applicationUpdate).not.toHaveBeenCalled();
  });

  it('responds 400 when interviewStepId is not part of the position interview flow', async () => {
    // Arrange
    const candidateFindUnique = jest.fn().mockResolvedValue({ id: 1 });
    const positionFindUnique = jest.fn().mockResolvedValue({ id: 10, interviewFlowId: 55 });
    const applicationFindFirst = jest.fn().mockResolvedValue({
      id: 200,
      candidateId: 1,
      positionId: 10,
      currentInterviewStep: 1,
    });
    const interviewStepFindUnique = jest.fn().mockResolvedValue({
      id: 99,
      interviewFlowId: 999,
    });
    const applicationUpdate = jest.fn();
    const prisma = createMockPrisma({
      candidate: { findUnique: candidateFindUnique } as unknown as PrismaClient['candidate'],
      position: { findUnique: positionFindUnique } as unknown as PrismaClient['position'],
      application: {
        findFirst: applicationFindFirst,
        update: applicationUpdate,
      } as unknown as PrismaClient['application'],
      interviewStep: { findUnique: interviewStepFindUnique } as unknown as PrismaClient['interviewStep'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).put('/candidates/1/stage').send({
      positionId: 10,
      interviewStepId: 99,
    });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid interview step for this position' });
    expect(applicationUpdate).not.toHaveBeenCalled();
  });

  it('responds 400 when interviewStepId does not exist', async () => {
    // Arrange
    const candidateFindUnique = jest.fn().mockResolvedValue({ id: 1 });
    const positionFindUnique = jest.fn().mockResolvedValue({ id: 10, interviewFlowId: 55 });
    const applicationFindFirst = jest.fn().mockResolvedValue({
      id: 200,
      candidateId: 1,
      positionId: 10,
      currentInterviewStep: 1,
    });
    const interviewStepFindUnique = jest.fn().mockResolvedValue(null);
    const applicationUpdate = jest.fn();
    const prisma = createMockPrisma({
      candidate: { findUnique: candidateFindUnique } as unknown as PrismaClient['candidate'],
      position: { findUnique: positionFindUnique } as unknown as PrismaClient['position'],
      application: {
        findFirst: applicationFindFirst,
        update: applicationUpdate,
      } as unknown as PrismaClient['application'],
      interviewStep: { findUnique: interviewStepFindUnique } as unknown as PrismaClient['interviewStep'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).put('/candidates/1/stage').send({
      positionId: 10,
      interviewStepId: 404,
    });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid interview step for this position' });
    expect(applicationUpdate).not.toHaveBeenCalled();
  });

  it('responds 400 for invalid input (missing interviewStepId)', async () => {
    // Arrange
    const prisma = createMockPrisma({});
    const app = createApp(prisma);

    // Act
    const res = await request(app).put('/candidates/1/stage').send({ positionId: 10 });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid interviewStepId' });
  });

  it('responds 400 when candidate id in path is invalid', async () => {
    // Arrange
    const prisma = createMockPrisma({});
    const app = createApp(prisma);

    // Act
    const res = await request(app).put('/candidates/xyz/stage').send({
      positionId: 10,
      interviewStepId: 2,
    });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid candidate id' });
  });
});
