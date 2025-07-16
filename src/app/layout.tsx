import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

// Enhanced SEO metadata
export const metadata: Metadata = {
  title: {
    default: "bbairtools - Aviation Tools for Better Flying",
    template: "%s | bbairtools"
  },
  description: "Comprehensive aviation tools including route finder, award search, seat maps, flight delay analysis, and airport games. Optimize your travel experience with professional aviation data.",
  keywords: ["aviation", "flight tools", "award search", "route finder", "seat maps", "flight delays", "airline tools", "travel optimization"],
  authors: [{ name: "bbairtools" }],
  creator: "bbairtools",
  publisher: "bbairtools",
  metadataBase: new URL('https://bbairtools.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://bbairtools.com',
    title: 'bbairtools - Aviation Tools for Better Flying',
    description: 'Comprehensive aviation tools including route finder, award search, seat maps, flight delay analysis, and airport games.',
    siteName: 'bbairtools',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'bbairtools - Aviation Tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bbairtools - Aviation Tools for Better Flying',
    description: 'Comprehensive aviation tools for optimizing your travel experience.',
    images: ['/og-image.jpg'],
  },
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
  verification: {
    google: 'your-google-verification-code',
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "bbairtools",
  "description": "Comprehensive aviation tools for better flying",
  "url": "https://bbairtools.com",
  "applicationCategory": "Travel",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "bbairtools"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-mono" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
