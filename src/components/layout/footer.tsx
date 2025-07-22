'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function Footer() {
  const [open, setOpen] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
      setIsAtBottom(scrollBottom);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initialize
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const cardClass =
    'transition-[margin,max-width,background,border-radius,box-shadow] duration-700 ease-in-out ' +
    (isAtBottom
      ? 'bg-card md:shadow-2xl md:ring-1 md:ring-border md:rounded-2xl mx-auto md:mb-6 md:max-w-4xl md:max-w-6xl w-full rounded-none shadow-none ring-0 mb-0'
      : 'bg-background shadow-none ring-0 rounded-none mx-auto mb-0 md:max-w-[2000px] md:rounded-none md:shadow-none md:ring-0 md:mb-0 w-full');

  return (
    <footer className="w-full bg-transparent">
      <div
        className={
          'w-full px-4 flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0 ' +
          cardClass +
          (!isAtBottom ? ' md:border-t' : '')
        }
        style={{ boxSizing: 'border-box' }}
      >
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by Ha Nguyen (binbinhihi).
          </p>
        </div>
        <div className="flex items-center space-x-4 relative">
          {/* Game dropdown */}
          <div className="relative">
            <button
              className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded focus:outline-none focus:ring"
              onClick={() => setOpen((v) => !v)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              aria-haspopup="listbox"
              aria-expanded={open}
            >
              Game
            </button>
            {open && (
              <div className="absolute left-0 bottom-full mb-2 w-40 bg-background border rounded shadow z-10">
                <Link
                  href="/shortest-route"
                  className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-t"
                  onClick={() => setOpen(false)}
                >
                  Shortest Route
                </Link>
                <Link
                  href="/find-airport"
                  className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-b"
                  onClick={() => setOpen(false)}
                >
                  Find the Airport
                </Link>
              </div>
            )}
          </div>
          {/* Other links */}
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