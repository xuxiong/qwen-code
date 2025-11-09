---
title: Custom OAuth Static API Key Testing
description: Steps to verify the custom OAuth static API key bypass flow in the Qwen CLI.
---

# Custom OAuth Static API Key Testing

Follow these steps to validate the temporary static API key bypass for the custom OAuth flow:

1. **Configure settings**  
   Edit either `~/.qwen/settings.json` (global) or the project-level `.qwen/settings.json` so that:
   - `security.auth.selectedType` is set to `"custom-oauth"`.
   - `security.custom.apiUrl` points to your LLM endpoint.
   - `security.custom.staticApiKey` contains the temporary testing key.
   - `security.custom.models` includes at least one entry.
   - `model.name` matches one of the `models[].id` values.

2. **Run the CLI**  
   Start the CLI (e.g. `qwen`) and trigger an LLM request. The authentication log should show:

   ```
   Using static API key for testing, bypassing OAuth.
   ```

   The request should complete without the OAuth device authorization prompts.

3. **Confirm fallback to OAuth**  
   Remove or clear `staticApiKey` from the settings file and run the CLI again. The device authorization flow should reappear, confirming that the bypass only activates when the static key is supplied.

These steps ensure the static-key bypass works as expected while keeping the standard OAuth device flow available when the key is absent.
