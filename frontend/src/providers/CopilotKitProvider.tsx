'use client';

/**
 * P1-008: CopilotKit Provider
 *
 * Wraps the app with CopilotKitProvider, connecting to the
 * Express backend CopilotKit runtime at POST /api/copilotkit.
 *
 * The runtimeUrl points to the backend server (default: localhost:3001).
 */

import { CopilotKit } from '@copilotkit/react-core';

const COPILOTKIT_RUNTIME_URL =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/copilotkit`
    : 'http://localhost:3001/api/copilotkit';

interface CopilotKitProviderProps {
  children: React.ReactNode;
}

export default function CopilotKitAppProvider({
  children,
}: CopilotKitProviderProps) {
  return (
    <CopilotKit runtimeUrl={COPILOTKIT_RUNTIME_URL}>
      {children}
    </CopilotKit>
  );
}
