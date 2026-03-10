import neo4j, { type Driver } from 'neo4j-driver';
import { config } from '../config/config';

class Neo4jClient {
  private static instance: Driver | null = null;

  static getInstance(): Driver {
    if (!this.instance) {
      this.instance = neo4j.driver(
        config.NEO4J_URI,
        neo4j.auth.basic(config.NEO4J_USER, config.NEO4J_PASSWORD),
      );
    }
    return this.instance;
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
    }
  }
}

export default Neo4jClient;
