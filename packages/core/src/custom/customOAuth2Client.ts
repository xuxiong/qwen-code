import path from 'node:path';
import os from 'node:os';

import {
  SharedTokenManager,
  type SharedTokenManagerClient,
  type TokenCredentials,
} from '../auth/sharedTokenManager.js';
import type { Config, CustomSettings } from '../config/config.js';

const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

export class CustomOAuth2Client
  implements SharedTokenManagerClient<TokenCredentials>
{
  private credentials: TokenCredentials = {};
  private readonly sharedManager: SharedTokenManager<TokenCredentials>;
  private readonly settings: CustomSettings;
  private readonly staticApiKey?: string;
  private hasLoggedStaticApiKeyUsage = false;

  constructor(config: Config) {
    this.settings = config.getCustomSettings();
    const trimmedKey = this.settings.staticApiKey
      ? this.settings.staticApiKey.trim()
      : undefined;
    this.staticApiKey = trimmedKey ? trimmedKey : undefined;

    if (!this.staticApiKey) {
      if (!this.settings.authServerUrl) {
        throw new Error('Custom OAuth configuration is missing authServerUrl.');
      }
      if (!this.settings.clientId) {
        throw new Error('Custom OAuth configuration is missing clientId.');
      }
    }

    const credentialPath = path.join(
      os.homedir(),
      '.qwen',
      'custom_oauth_credentials.json',
    );
    this.sharedManager = new SharedTokenManager<TokenCredentials>(
      credentialPath,
    );
  }

  getCredentials(): TokenCredentials {
    return this.credentials;
  }

  setCredentials(credentials: TokenCredentials): void {
    this.credentials = credentials;
  }

  async refreshAccessToken(): Promise<TokenCredentials> {
    if (this.staticApiKey) {
      return {
        access_token: this.staticApiKey,
      };
    }

    if (!this.credentials.refresh_token) {
      throw new Error('No refresh token available for custom OAuth client.');
    }

    const formData = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.credentials.refresh_token,
      client_id: this.settings.clientId!,
    });

    const response = await fetch(`${this.settings.authServerUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenData = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const updatedCredentials: TokenCredentials = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? this.credentials.refresh_token,
      expiry_date: Date.now() + tokenData.expires_in * 1000,
    };

    return updatedCredentials;
  }

  async getAccessToken(forceRefresh = false): Promise<string> {
    if (this.staticApiKey) {
      if (!this.hasLoggedStaticApiKeyUsage) {
        console.log('Using static API key for testing, bypassing OAuth.');
        this.hasLoggedStaticApiKeyUsage = true;
      }
      return this.staticApiKey;
    }

    const credentials = await this.sharedManager.getValidCredentials(
      this,
      forceRefresh,
    );

    if (!credentials.access_token) {
      throw new Error('Failed to obtain access token for custom OAuth.');
    }

    return credentials.access_token;
  }

  async requestDeviceAuthorization(): Promise<Record<string, unknown>> {
    const scope = this.settings.scope;
    const body = new URLSearchParams({
      client_id: this.settings.clientId!,
    });

    if (scope) {
      body.set('scope', scope);
    }

    const response = await fetch(
      `${this.settings.authServerUrl}/oauth/device/code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Device authorization request failed: ${response.status}`,
      );
    }

    return (await response.json()) as Record<string, unknown>;
  }

  async pollDeviceToken(
    deviceCode: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const formData = new URLSearchParams({
      grant_type: DEVICE_CODE_GRANT_TYPE,
      device_code: deviceCode,
      client_id: this.settings.clientId!,
    });

    while (true) {
      if (signal?.aborted) {
        throw new Error('Device authorization cancelled.');
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const response = await fetch(
        `${this.settings.authServerUrl}/oauth/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        },
      );

      if (response.ok) {
        const tokenData = (await response.json()) as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };

        const credentials: TokenCredentials = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expiry_date: Date.now() + tokenData.expires_in * 1000,
        };

        await this.sharedManager.saveCredentials(credentials);
        this.setCredentials(credentials);
        return;
      }

      const error = (await response.json()) as {
        error: string;
        error_description?: string;
      };

      if (signal?.aborted) {
        throw new Error('Device authorization cancelled.');
      }

      if (
        error.error === 'authorization_pending' ||
        error.error === 'slow_down'
      ) {
        continue;
      }

      throw new Error(
        `Token polling failed: ${error.error_description || error.error}`,
      );
    }
  }
}

export function createCustomOAuthClient(config: Config): CustomOAuth2Client {
  return new CustomOAuth2Client(config);
}
