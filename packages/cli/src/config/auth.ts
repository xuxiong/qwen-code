/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@qwen-code/qwen-code-core';
import { loadEnvironment, loadSettings } from './settings.js';

export function validateAuthMethod(authMethod: string): string | null {
  const settings = loadSettings();
  loadEnvironment(settings.merged);

  if (authMethod === AuthType.USE_OPENAI) {
    const hasApiKey =
      process.env['OPENAI_API_KEY'] || settings.merged.security?.auth?.apiKey;
    if (!hasApiKey) {
      return 'OPENAI_API_KEY environment variable not found. You can enter it interactively or add it to your .env file.';
    }
    return null;
  }

  if (authMethod === AuthType.QWEN_OAUTH) {
    // Qwen OAuth doesn't require any environment variables for basic setup
    // The OAuth flow will handle authentication
    return null;
  }

  if (authMethod === AuthType.CUSTOM_OAUTH) {
    const customSettings = settings.merged.security?.custom;
    const apiUrl = customSettings?.apiUrl?.trim();
    const staticApiKey = customSettings?.staticApiKey?.trim();

    if (!apiUrl) {
      return 'Custom OAuth requires apiUrl to be configured in settings.';
    }

    if (staticApiKey) {
      return null;
    }

    if (
      !customSettings?.authServerUrl?.trim() ||
      !customSettings?.clientId?.trim()
    ) {
      return 'Custom OAuth requires authServerUrl and clientId to be configured in settings unless a staticApiKey is provided.';
    }
    return null;
  }

  return 'Invalid auth method selected.';
}
