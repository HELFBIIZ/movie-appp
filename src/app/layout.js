import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import HelpButton from '@/components/HelpButton';
import { ClerkProvider } from '@clerk/nextjs';
import { LearningAccount } from '@/components/learning/LearningAccount';
import LevelCheck from '@/components/learning/LevelCheck';
import { ClerkAvailabilityProvider } from '@/components/ClerkAvailability';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// OAuth (Google/Apple) only works once both Clerk keys exist. Guarding here
// means the site keeps running - password login included - if they are absent
// on an environment that has not been configured yet.
const clerkEnabled = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

export const metadata = {
  title: 'Vxnta — Discover Movies & Trailers',
  description:
    'Vxnta is the ultimate movie discovery platform: browse thousands of films, watch official trailers, rate movies, build your watchlist, and find your next favorite film.',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#faf7f1] dark:bg-transparent text-stone-900 dark:text-[#e9e2d3]">
        <div aria-hidden="true" className="aurora" />
        <ThemeProvider>
          <LearningAccount>
            <ClerkAvailabilityProvider enabled={clerkEnabled}>
              {clerkEnabled ? <ClerkProvider>{children}</ClerkProvider> : children}
            </ClerkAvailabilityProvider>
            <LevelCheck />
          </LearningAccount>
        </ThemeProvider>
        <HelpButton />
      </body>
    </html>
  );
}
