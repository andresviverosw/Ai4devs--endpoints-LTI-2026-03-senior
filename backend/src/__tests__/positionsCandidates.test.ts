import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../app';

function createMockPrisma(partial: Partial<PrismaClient> = {}): PrismaClient {
  return partial as PrismaClient;
}

describe('GET /positions/:id/candidates', () => {
  it('returns candidates with full_name, current_interview_step, and average_score (happy path)', async () => {
    // Arrange
    const positionFindUnique = jest.fn().mockResolvedValue({ id: 7 });
    const applicationFindMany = jest.fn().mockResolvedValue([
      {
        candidate: { firstName: 'Ada', lastName: 'Lovelace' },
        interviewStep: { name: 'Technical' },
        interviews: [{ score: 80 }, { score: 100 }, { score: null }],
      },
      {
        candidate: { firstName: 'Alan', lastName: 'Turing' },
        interviewStep: { name: 'HR' },
        interviews: [{ score: null }],
      },
    ]);
    const prisma = createMockPrisma({
      position: { findUnique: positionFindUnique } as unknown as PrismaClient['position'],
      application: { findMany: applicationFindMany } as unknown as PrismaClient['application'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).get('/positions/7/candidates');

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      candidates: [
        {
          full_name: 'Ada Lovelace',
          current_interview_step: 'Technical',
          average_score: 90,
        },
        {
          full_name: 'Alan Turing',
          current_interview_step: 'HR',
          average_score: null,
        },
      ],
    });
    expect(positionFindUnique).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(applicationFindMany).toHaveBeenCalledWith({
      where: { positionId: 7 },
      include: expect.objectContaining({
        candidate: true,
        interviewStep: true,
        interviews: true,
      }),
    });
  });

  it('responds 404 when the position does not exist', async () => {
    // Arrange
    const positionFindUnique = jest.fn().mockResolvedValue(null);
    const applicationFindMany = jest.fn();
    const prisma = createMockPrisma({
      position: { findUnique: positionFindUnique } as unknown as PrismaClient['position'],
      application: { findMany: applicationFindMany } as unknown as PrismaClient['application'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).get('/positions/999/candidates');

    // Assert
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Position not found' });
    expect(applicationFindMany).not.toHaveBeenCalled();
  });

  it('responds 400 when position id is invalid', async () => {
    // Arrange
    const positionFindUnique = jest.fn();
    const applicationFindMany = jest.fn();
    const prisma = createMockPrisma({
      position: { findUnique: positionFindUnique } as unknown as PrismaClient['position'],
      application: { findMany: applicationFindMany } as unknown as PrismaClient['application'],
    });
    const app = createApp(prisma);

    // Act
    const res = await request(app).get('/positions/not-a-number/candidates');

    // Assert
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Invalid position id' });
    expect(positionFindUnique).not.toHaveBeenCalled();
  });
});
