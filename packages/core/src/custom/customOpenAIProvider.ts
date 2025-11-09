import OpenAI from 'openai';

import type { ContentGeneratorConfig } from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';
import { DefaultOpenAICompatibleProvider } from '../core/openaiContentGenerator/provider/default.js';
import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT,
} from '../core/openaiContentGenerator/constants.js';
import type { CustomOAuth2Client } from './customOAuth2Client.js';

export class CustomOpenAIProvider extends DefaultOpenAICompatibleProvider {
  constructor(
    contentGeneratorConfig: ContentGeneratorConfig,
    cliConfig: Config,
    private readonly oauthClient: CustomOAuth2Client,
  ) {
    super(contentGeneratorConfig, cliConfig);
  }

  override async buildClient(): Promise<OpenAI> {
    const accessToken = await this.oauthClient.getAccessToken(false);

    const clientOptions: OpenAI.ClientOptions = {
      baseURL: this.contentGeneratorConfig.baseUrl,
      timeout: this.contentGeneratorConfig.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: this.contentGeneratorConfig.maxRetries ?? DEFAULT_MAX_RETRIES,
      defaultHeaders: this.buildHeaders(),
    };
    clientOptions.apiKey = accessToken;

    return new OpenAI(clientOptions);
  }

  async handleAuthError(error: unknown): Promise<boolean> {
    if (error instanceof OpenAI.APIError && error.status === 401) {
      try {
        await this.oauthClient.getAccessToken(true);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}
