import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config';
import healthRouter from './routes/health.routes';
import Neo4jClient from './lib/Neo4jClient';
import { handleCopilotKit } from './copilotkit/runtime';

const app: Express = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api/v1/health', healthRouter);

// CopilotKit Runtime endpoint (P1-008)
// Handles AG-UI streaming: TEXT_MESSAGE + STATE_DELTA
app.all('/api/copilotkit', handleCopilotKit);

app.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
});

function shutdown(): void {
  Neo4jClient.close()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
