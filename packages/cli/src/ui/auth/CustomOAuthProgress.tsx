import type { ReactElement } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

export interface CustomOAuthProgressProps {
  deviceAuth: {
    verification_uri?: string;
    verification_uri_complete?: string;
    user_code?: string;
    expires_in?: number;
  } | null;
  onCancel?: () => void;
}

export function CustomOAuthProgress({
  deviceAuth,
  onCancel,
}: CustomOAuthProgressProps): ReactElement {
  return (
    <Box
      borderStyle="round"
      borderColor="green"
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Custom OAuth Authentication</Text>
      {!deviceAuth ? (
        <Box marginTop={1}>
          <Text>
            <Spinner type="dots" /> Initializing device authorization...
          </Text>
        </Box>
      ) : (
        <>
          <Box marginTop={1} flexDirection="column">
            <Text>To continue, open the following URL in your browser:</Text>
            {deviceAuth.verification_uri_complete ? (
              <Text color="green">{deviceAuth.verification_uri_complete}</Text>
            ) : deviceAuth.verification_uri ? (
              <Text color="green">{deviceAuth.verification_uri}</Text>
            ) : null}
          </Box>
          {deviceAuth.user_code && (
            <Box marginTop={1} flexDirection="column">
              <Text>Enter the code:</Text>
              <Text color="green" bold>
                {deviceAuth.user_code}
              </Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text>
              <Spinner type="dots" /> Waiting for authorization...
            </Text>
          </Box>
        </>
      )}
      {onCancel && (
        <Box marginTop={1}>
          <Text>
            Press <Text bold>Ctrl+C</Text> to cancel authentication.
          </Text>
        </Box>
      )}
    </Box>
  );
}
