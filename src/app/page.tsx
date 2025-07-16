import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flight Route Planning & Airport Tools",
  description: "Professional flight route planning tools and comprehensive airport database. Plan routes, find airports, analyze delays, and optimize your flying experience.",
  openGraph: {
    title: "bbairtools - Professional Flight Planning Tools",
    description: "Plan routes, find airports, analyze delays, and optimize your flying experience with advanced aviation tools.",
    images: ['/og-image.png'],
  },
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background">
      <div className="container py-10">
        <h1 className="text-4xl font-bold mb-6">Welcome to bbairtools</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Build and manage your flight routes efficiently with our powerful tools.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Route Planning</h2>
            <p className="text-muted-foreground">
              Plan your flight routes with our intuitive interface.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Airport Database</h2>
            <p className="text-muted-foreground">
              Access comprehensive airport information worldwide.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-2">Airline Integration</h2>
            <p className="text-muted-foreground">
              Connect with major airlines and their route networks.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
