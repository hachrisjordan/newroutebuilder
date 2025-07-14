import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="w-full px-4 flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by Ha Nguyen (binbinhihi).
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/find-airport"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Find the Airport Game
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
} 