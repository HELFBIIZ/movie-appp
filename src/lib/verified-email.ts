import { z } from 'zod';

const address = z.object({
  emailAddress: z.string().email(),
  verification: z.object({ status: z.string() }).nullish(),
});
const profile = z.object({
  primaryEmailAddress: address.nullish(),
  emailAddresses: z.array(address).optional(),
});
export function verifiedClerkEmail(value: unknown): string | null {
  const user = profile.safeParse(value);
  if (!user.success) return null;
  const candidates = [user.data.primaryEmailAddress, ...(user.data.emailAddresses ?? [])];
  return (
    candidates
      .find((item) => item?.verification?.status === 'verified')
      ?.emailAddress.toLowerCase() ?? null
  );
}
