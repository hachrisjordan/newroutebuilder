import type { Metadata } from "next";
import "./globals.css";
import 'flag-icons/css/flag-icons.min.css';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/providers/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import StructuredData from "@/components/seo/structured-data";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: {
    default: "bbairtools - Flight Route Planning & Airport Tools",
    template: "%s | bbairtools"
  },
  description: "Professional flight route planning tools and comprehensive airport database. Plan routes, find airports, analyze delays, and optimize your flying experience with advanced aviation tools.",
  keywords: [
    "flight planning", 
    "route builder", 
    "airport search", 
    "aviation tools", 
    "flight routes", 
    "airline planning", 
    "airport database",
    "award flights",
    "flight delays",
    "aircraft types"
  ],
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
  alternates: {
    canonical: 'https://bbairtools.com',
  },
  category: 'travel',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resource hints for better performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//dbaixrvzmfwhhbgyoebt.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        
        {/* Preload critical assets */}
        <link rel="preload" href="/fonts/mono.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        
        {/* Critical inline CSS for font loading */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Prevent layout shift during font load */
            .font-mono { font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace; }
            
            /* Critical loading states */
            .loading-skeleton { 
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); 
              background-size: 200% 100%; 
              animation: loading 1.5s infinite; 
            }
            
            @keyframes loading { 
              0% { background-position: 200% 0; } 
              100% { background-position: -200% 0; } 
            }
            
            /* Reduce layout shift for images */
            img[loading="lazy"] { 
              content-visibility: auto; 
            }
          `
        }} />
      </head>
      <body className="font-mono antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col bg-background text-foreground">
            <Suspense fallback={
              <div className="h-16 w-full loading-skeleton" />
            }>
              <Header />
            </Suspense>
            
            <main className="flex-1" role="main">
              {children}
            </main>
            
            <Suspense fallback={null}>
              <Footer />
            </Suspense>
          </div>
        </ThemeProvider>
        
        <Suspense fallback={null}>
          <StructuredData />
        </Suspense>
        
        {/* Performance monitoring - load after critical content */}
        <Suspense fallback={null}>
          <SpeedInsights />
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
