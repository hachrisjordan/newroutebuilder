import type { Metadata } from "next";
import "./globals.css";
import 'flag-icons/css/flag-icons.min.css';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/providers/user-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import StructuredData from "@/components/seo/structured-data";
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: "bbairtools - Award Flight Route Planning",
    template: "%s | bbairtools"
  },
  description: "Award flight route planning tools. Plan routes and optimize your flying experience.",
  keywords: ["award flight planning", "award flight", "award route builder", "award airport search", "award aviation tools", "award flight routes", "award airline planning", "award airport database"],
  authors: [{ name: "bbairtools" }],
  creator: "bbairtools",
  publisher: "bbairtools",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bbairtools.com',
    title: 'bbairtools - Award Flight Route Planning Tools',
    description: 'Award flight route planning tools. Plan routes and optimize your flying experience.',
    siteName: 'bbairtools',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'bbairtools - Award Flight Planning Tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bbairtools - Award Flight Planning Tools',
    description: 'Award flight route planning tools. Plan routes and optimize your flying experience.',
    images: ['/og-image.png'],
  },
  metadataBase: new URL('https://bbairtools.com'),
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-mono" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </UserProvider>
        </ThemeProvider>
        <StructuredData />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
