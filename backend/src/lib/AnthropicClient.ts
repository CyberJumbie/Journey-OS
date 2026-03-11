import Anthropic from '@anthropic-ai/sdk';

class AnthropicClient {
  private static instance: Anthropic | null = null;

  static getInstance(): Anthropic {
    if (!this.instance) {
      this.instance = new Anthropic();
    }
    return this.instance;
  }
}

export default AnthropicClient;
