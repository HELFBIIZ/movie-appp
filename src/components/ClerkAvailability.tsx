'use client';
import { createContext } from 'react';

// Only the server's configured/not-configured decision crosses the boundary.
export const ClerkAvailability = createContext(false);
export function ClerkAvailabilityProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return <ClerkAvailability.Provider value={enabled}>{children}</ClerkAvailability.Provider>;
}
