import Neo4jClient from '../lib/Neo4jClient';
import SupabaseClientSingleton from '../lib/SupabaseClient';

export interface HealthStatus {
  status: 'ok';
  version: string;
  timestamp: string;
  neo4j: 'ok' | 'error';
  supabase: 'ok' | 'error';
}

export class HealthService {
  async check(): Promise<HealthStatus> {
    const [neo4j, supabase] = await Promise.all([
      this.checkNeo4j(),
      this.checkSupabase(),
    ]);

    return {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      neo4j,
      supabase,
    };
  }

  private async checkNeo4j(): Promise<'ok' | 'error'> {
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

  private async checkSupabase(): Promise<'ok' | 'error'> {
    try {
      const supabase = SupabaseClientSingleton.getInstance();
      const { error } = await supabase.auth.getSession();
      if (error) return 'error';
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
