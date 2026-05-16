import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createApp } from './app';

dotenv.config();

const prisma = new PrismaClient();

export const app = createApp(prisma);
export default app;

const port = 3010;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}
