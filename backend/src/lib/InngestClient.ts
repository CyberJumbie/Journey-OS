import { Inngest } from 'inngest';
import { config } from '../config/config';

/**
 * InngestClient — Singleton for the Inngest client.
 * Never instantiate Inngest outside this file.
 *
 * Event key is optional for local dev (Inngest Dev Server
 * works without cloud credentials).
 */
class InngestClientSingleton {
  private static instance: Inngest | null = null;

  static getInstance(): Inngest {
    if (!this.instance) {
      this.instance = new Inngest({
        id: 'journey-os',
        ...(config.INNGEST_EVENT_KEY ? { eventKey: config.INNGEST_EVENT_KEY } : {}),
      });
    }
    return this.instance;
  }
}

export default InngestClientSingleton;
