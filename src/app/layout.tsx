import type { Metadata } from "next";
import "./globals.css";
import 'flag-icons/css/flag-icons.min.css';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme-provider";

// Dynamically import analytics components
const Analytics = dynamic(() => import('@vercel/analytics/next').then(mod => mod.Analytics), {
  ssr: true,
});

const SpeedInsights = dynamic(() => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights), {
  ssr: true,
});

const StructuredData = dynamic(() => import('@/components/seo/structured-data'), {
  ssr: true,
});

export const metadata: Metadata = {
  title: {
    default: "bbairtools - Flight Route Planning & Airport Tools",
    template: "%s | bbairtools"
  },
  description: "Professional flight route planning tools and comprehensive airport database. Plan routes, find airports, analyze delays, and optimize your flying experience with advanced aviation tools.",
  keywords: ["flight planning", "route builder", "airport search", "aviation tools", "flight routes", "airline planning", "airport database"],
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
    title: 'bbairtools - Professional Flight Planning Tools',
    description: 'Professional flight route planning tools and comprehensive airport database. Plan routes, find airports, and optimize your flying experience.',
    siteName: 'bbairtools',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'bbairtools - Flight Planning Tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bbairtools - Professional Flight Planning Tools',
    description: 'Professional flight route planning tools and comprehensive airport database.',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
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
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <Suspense fallback={<div className="min-h-screen" />}>
                {children}
              </Suspense>
            </main>
            <Footer />
          </div>
        </ThemeProvider>
        <Suspense fallback={null}>
          <StructuredData />
        </Suspense>
        <Suspense fallback={null}>
          <SpeedInsights />
        </Suspense>
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
