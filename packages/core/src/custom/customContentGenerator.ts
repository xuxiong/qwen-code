import type { ContentGeneratorConfig } from '../core/contentGenerator.js';
import { OpenAIContentGenerator } from '../core/openaiContentGenerator/openaiContentGenerator.js';
import type { Config } from '../config/config.js';
import { CustomOAuth2Client } from './customOAuth2Client.js';
import { CustomOpenAIProvider } from './customOpenAIProvider.js';

export class CustomContentGenerator extends OpenAIContentGenerator {
  constructor(
    contentGeneratorConfig: ContentGeneratorConfig,
    cliConfig: Config,
  ) {
    const oauthClient = new CustomOAuth2Client(cliConfig);
    const provider = new CustomOpenAIProvider(
      contentGeneratorConfig,
      cliConfig,
      oauthClient,
    );

    super(contentGeneratorConfig, cliConfig, provider);
  }
}
