import Link from "next/link";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "bbairtools - Award Flight Planning Tools",
  description: "Award flight route planning tools. Plan routes and optimize your flying experience.",
  openGraph: {
    title: "bbairtools - Award Flight Planning Tools",
    description: "Award flight route planning tools. Plan routes and optimize your flying experience.",
    images: ['/rblogo.png'],
  },
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background">
      <div className="container py-10">
        <h1 className="text-4xl font-bold mb-6 text-center">Welcome to bbairtools</h1>
        <p className="text-lg text-muted-foreground mb-8 text-center">
          Award flight route planning tools. Plan routes with points and miles and optimize your flying experience.
        </p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Seat Type / Delay */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Seat Type / Delay</CardTitle>
              <CardDescription>
                Analyze seat types and flight delay statistics for smarter travel planning.
              </CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/seat-type-delay" aria-label="Go to Seat Type / Delay">Go to Seat Type / Delay</Link>
              </Button>
            </CardFooter>
          </Card>
          {/* Award Finder */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Award Finder</CardTitle>
              <CardDescription>
                Find the best award flight options across multiple airlines and alliances.
              </CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/award-finder" aria-label="Go to Award Finder">Go to Award Finder</Link>
              </Button>
            </CardFooter>
          </Card>
          {/* Live Search */}
          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Live Search</CardTitle>
              <CardDescription>
                Search for real-time flight availability and pricing with up-to-date data.
              </CardDescription>
            </CardHeader>
            <CardContent />
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/live-search" aria-label="Go to Live Search">Go to Live Search</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
