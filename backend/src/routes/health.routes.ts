import { Router, type Request, type Response } from 'express';
import Neo4jClient from '../lib/Neo4jClient';
import SupabaseClientSingleton from '../lib/SupabaseClient';

const router: Router = Router();

interface HealthResponse {
  status: 'ok';
  version: string;
  timestamp: string;
  neo4j: 'ok' | 'error';
  supabase: 'ok' | 'error';
}

router.get('/', async (_req: Request, res: Response) => {
  const [neo4jStatus, supabaseStatus] = await Promise.all([
    checkNeo4j(),
    checkSupabase(),
  ]);

  const response: HealthResponse = {
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    neo4j: neo4jStatus,
    supabase: supabaseStatus,
  };

  res.json(response);
});

async function checkNeo4j(): Promise<'ok' | 'error'> {
  try {
    const driver = Neo4jClient.getInstance();
    const session = driver.session();
    try {
      await session.run('RETURN 1 AS ping');
      return 'ok';
    } finally {
      await session.close();
    }
  } catch {
    return 'error';
  }
}

async function checkSupabase(): Promise<'ok' | 'error'> {
  try {
    const supabase = SupabaseClientSingleton.getInstance();
    const { error } = await supabase.auth.getSession();
    if (error) return 'error';
    return 'ok';
  } catch {
    return 'error';
  }
}

export default router;
