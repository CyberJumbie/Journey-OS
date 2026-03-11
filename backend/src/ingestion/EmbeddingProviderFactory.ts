import type { IEmbeddingProvider } from './providers/IEmbeddingProvider.interface';
import { VoyageEmbeddingProvider } from './providers/VoyageEmbeddingProvider';
import { OpenAIEmbeddingProvider } from './providers/OpenAIEmbeddingProvider';
import type { EnvConfig } from '../config/config';

/**
 * EmbeddingProviderFactory — creates embedding providers based on config.
 *
 * Ingest mode: returns ALL configured providers (both columns populated).
 * Search mode: returns ONE provider (config-controlled, switchable without re-ingest).
 */
export class EmbeddingProviderFactory {
  /**
   * Get all providers configured for ingest.
   * Reads EMBEDDING_PROVIDERS env var (comma-separated: "voyage,openai").
   */
  static getIngestProviders(config: EnvConfig): IEmbeddingProvider[] {
    const providerNames = config.EMBEDDING_PROVIDERS.split(',').map((p) => p.trim());
    const providers: IEmbeddingProvider[] = [];

    for (const name of providerNames) {
      const provider = EmbeddingProviderFactory.createProvider(name, config);
      if (provider) {
        providers.push(provider);
      }
    }

    if (providers.length === 0) {
      throw new Error('No embedding providers configured. Set EMBEDDING_PROVIDERS env var.');
    }

    return providers;
  }

  /**
   * Get the single provider configured for search.
   * Reads EMBEDDING_SEARCH_PROVIDER env var ("voyage" or "openai").
   */
  static getSearchProvider(config: EnvConfig): IEmbeddingProvider {
    const provider = EmbeddingProviderFactory.createProvider(config.EMBEDDING_SEARCH_PROVIDER, config);
    if (!provider) {
      throw new Error(`Search provider "${config.EMBEDDING_SEARCH_PROVIDER}" not configured.`);
    }
    return provider;
  }

  private static createProvider(name: string, config: EnvConfig): IEmbeddingProvider | null {
    switch (name) {
      case 'voyage':
        return new VoyageEmbeddingProvider(config.VOYAGE_API_KEY);
      case 'openai': {
        if (!config.OPENAI_API_KEY) {
          console.warn('[EmbeddingProviderFactory] OPENAI_API_KEY not set, skipping OpenAI provider');
          return null;
        }
        return new OpenAIEmbeddingProvider(config.OPENAI_API_KEY);
      }
      default:
        console.warn(`[EmbeddingProviderFactory] Unknown provider: ${name}`);
        return null;
    }
  }
}
