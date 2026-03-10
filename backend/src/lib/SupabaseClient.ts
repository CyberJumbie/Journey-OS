import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';
import { config } from '../config/config';

class SupabaseClientSingleton {
  private static instance: SupabaseClientType | null = null;

  static getInstance(): SupabaseClientType {
    if (!this.instance) {
      this.instance = createClient(
        config.SUPABASE_URL,
        config.SUPABASE_SERVICE_ROLE_KEY,
      );
    }
    return this.instance;
  }
}

export default SupabaseClientSingleton;
