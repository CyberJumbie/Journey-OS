import { createServer } from 'http';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { serve } from 'inngest/express';
import { config } from './config/config';
import healthRouter from './routes/health.routes';
import authRouter from './routes/auth.routes';
import uploadRouter from './routes/upload.routes';
import courseRouter from './routes/course.routes';
import itemRouter from './routes/item.routes';
import batchRouter from './routes/batch.routes';
import dashboardRouter from './routes/dashboard.routes';
import invitationRouter from './routes/invitation.routes';
import onboardingRouter from './routes/onboarding.routes';
import conceptMappingRouter from './routes/concept-mapping.routes';
import generationLogRouter from './routes/generation-log.routes';
import adminRouter from './routes/admin.routes';
import { authMiddleware } from './middleware/auth.middleware';
import Neo4jClient from './lib/Neo4jClient';
import SocketServer from './lib/SocketServer';
import InngestClientSingleton from './lib/InngestClient';
import { bulkGenerationFunction } from './inngest/bulk-generation.function';
import { dataLintFunction } from './inngest/data-lint.function';
import { goldenRegressionFunction } from './inngest/golden-regression.function';
import { handleCopilotKit } from './copilotkit/runtime';

const app: Express = express();

// Wrap Express with http.createServer for Socket.io (P2-012)
const httpServer = createServer(app);

// Initialize Socket.io on the HTTP server
SocketServer.init(httpServer);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);

// Inngest serve endpoint (P2-010) — must be before auth middleware
// Inngest Dev Server sends events here for local development
app.use(
  '/api/inngest',
  serve({
    client: InngestClientSingleton.getInstance(),
    functions: [bulkGenerationFunction, dataLintFunction, goldenRegressionFunction],
  }),
);

// Protected routes (require valid JWT)
app.use('/api/v1/uploads', authMiddleware, uploadRouter);
app.use('/api/v1/courses', authMiddleware, courseRouter);
app.use('/api/v1/items', authMiddleware, itemRouter);
app.use('/api/v1/batches', authMiddleware, batchRouter);
app.use('/api/v1/dashboard', authMiddleware, dashboardRouter);
app.use('/api/v1/invitations', invitationRouter);
app.use('/api/v1/users/me/onboarding', onboardingRouter);
app.use('/api/v1/generation-logs', authMiddleware, generationLogRouter);
app.use('/api/v1', authMiddleware, conceptMappingRouter);
app.use('/api/v1/admin', adminRouter);

// CopilotKit Runtime endpoint (P1-008)
// Handles AG-UI streaming: TEXT_MESSAGE + STATE_DELTA
app.all('/api/copilotkit', handleCopilotKit);

// Use httpServer.listen instead of app.listen for Socket.io support
httpServer.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
});

async function shutdown(): Promise<void> {
  try {
    await SocketServer.close();
    await Neo4jClient.close();
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

export default app;
