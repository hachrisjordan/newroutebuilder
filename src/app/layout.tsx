import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import 'flag-icons/css/flag-icons.min.css';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import StructuredData from "@/components/seo/structured-data";

// Font optimization
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bbairtools.com'),
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
    creator: '@bbairtools',
  },
  alternates: {
    canonical: 'https://bbairtools.com',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  other: {
    'theme-color': '#ffffff',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
        <link rel="dns-prefetch" href="https://dbaixrvzmfwhhbgyoebt.supabase.co" />
      </head>
      <body className={`font-mono ${inter.className}`} suppressHydrationWarning>
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
          <StructuredData />
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
