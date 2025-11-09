import lockfile from 'proper-lockfile';
import path from 'node:path';
import { promises as fs } from 'node:fs';

export interface TokenCredentials {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface SharedTokenManagerClient<C extends TokenCredentials> {
  getCredentials(): C;
  setCredentials(credentials: C): void;
  refreshAccessToken(): Promise<C>;
}

const LOCK_OPTIONS = {
  retries: {
    retries: 5,
    factor: 1.2,
    minTimeout: 200,
  },
} as const;

export class SharedTokenManager<C extends TokenCredentials> {
  constructor(private readonly credentialPath: string) {}

  async getValidCredentials(
    client: SharedTokenManagerClient<C>,
    forceRefresh = false,
  ): Promise<C> {
    const release = await this.acquireLock();
    try {
      let credentials = await this.readCredentials();
      if (!credentials) {
        credentials = client.getCredentials();
      }

      if (
        forceRefresh ||
        !credentials?.access_token ||
        this.isTokenExpired(credentials)
      ) {
        if (!credentials?.refresh_token) {
          throw new Error(
            'Authentication expired, no refresh token available.',
          );
        }

        client.setCredentials(credentials);
        credentials = await client.refreshAccessToken();
        await this.writeCredentials(credentials);
      }

      client.setCredentials(credentials);
      return credentials;
    } finally {
      await release();
    }
  }

  async saveCredentials(credentials: C): Promise<void> {
    const release = await this.acquireLock();
    try {
      await this.writeCredentials(credentials);
    } finally {
      await release();
    }
  }

  private async acquireLock(): Promise<() => Promise<void>> {
    await fs.mkdir(path.dirname(this.credentialPath), { recursive: true });
    await fs.writeFile(this.credentialPath, '', { flag: 'a' });
    return lockfile.lock(this.credentialPath, LOCK_OPTIONS);
  }

  private isTokenExpired(credentials: C | undefined): boolean {
    if (!credentials?.expiry_date) {
      return true;
    }

    // Refresh slightly before actual expiry to avoid race conditions
    return Date.now() >= credentials.expiry_date - 60 * 1000;
  }

  private async readCredentials(): Promise<C | undefined> {
    try {
      const data = await fs.readFile(this.credentialPath, 'utf-8');
      if (!data.trim()) {
        return undefined;
      }
      return JSON.parse(data) as C;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  private async writeCredentials(credentials: C): Promise<void> {
    await fs.writeFile(
      this.credentialPath,
      JSON.stringify(credentials, null, 2),
      'utf-8',
    );
  }
}
