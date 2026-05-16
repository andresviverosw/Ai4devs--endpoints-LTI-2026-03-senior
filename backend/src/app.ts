import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import candidateRoutes from './routes/candidateRoutes';
import positionRoutes from './routes/positionRoutes';
import { uploadFile } from './application/services/fileUploadService';
import { AppError, isAppError } from './application/errors/AppError';

function asAppError(err: unknown): AppError | null {
  if (err instanceof AppError) {
    return err;
  }
  if (isAppError(err)) {
    return err as AppError;
  }
  return null;
}

declare global {
  namespace Express {
    interface Request {
      prisma: PrismaClient;
    }
  }
}

export function createApp(prisma: PrismaClient): express.Application {
  const app = express();

  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.prisma = prisma;
    next();
  });

  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    }),
  );

  app.use('/candidates', candidateRoutes);
  app.use('/positions', positionRoutes);

  app.post('/upload', uploadFile);

  app.get('/', (_req: Request, res: Response) => {
    res.send('Hola LTI!');
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err instanceof Error ? err.stack : err);
    const appErr = asAppError(err);
    if (appErr) {
      const status = appErr.status || appErr.statusCode || 500;
      res.status(status).json(appErr.toJSON());
      return;
    }
    res.type('text/plain');
    res.status(500).send('Something broke!');
  });

  return app;
}
