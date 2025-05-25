'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { Menu } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import HeaderUserMenu from '@/components/auth-wizard/header-user-menu';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Seat Type / Delay', href: '/seat-type-delay' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Desktop Header */}
      <div className="hidden md:flex w-full px-4 h-16 items-center">
        <div className="mr-6 flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/rblogo.png" alt="RouteBuilder Logo" height={40} width={40} className="h-10 w-auto" priority />
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors hover:text-foreground/80',
                pathname === item.href
                  ? 'text-foreground'
                  : 'text-foreground/60'
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <HeaderUserMenu />
          <ThemeToggle />
        </div>
      </div>
      {/* Mobile Header */}
      <div className="flex md:hidden w-full px-4 h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/rblogo.png" alt="RouteBuilder Logo" height={32} width={32} className="h-8 w-auto" priority />
        </Link>
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent
              variant="drawer"
              className="flex flex-col"
            >
              <nav className="flex flex-col gap-2 p-6 text-base font-medium">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'py-2 px-2 rounded transition-colors hover:bg-accent',
                      pathname === item.href
                        ? 'text-foreground font-semibold'
                        : 'text-foreground/70'
                    )}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
} 