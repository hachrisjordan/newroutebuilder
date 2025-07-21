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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

const navigation = [
  // { name: 'Home', href: '/' }, // Removed Home link
  { name: 'Seat Type / Delay', href: '/seat-type-delay' },
  { name: 'Award Finder', href: '/award-finder' },
  { name: 'Live Search', href: '/live-search' },
];

const specialAwards = [
  { name: 'Etihad on JetBlue', href: '/jetblue/etihad' },
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
          {/* Special Award Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'ml-6 text-sm font-medium transition-colors hover:text-foreground/80',
                  pathname.startsWith('/jetblue/etihad')
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
                aria-haspopup="menu"
              >
                Special Award
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {specialAwards.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>{item.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <HeaderUserMenu />
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
                {/* Special Award Mobile Dropdown */}
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground uppercase tracking-wider cursor-pointer select-none py-2 px-2 rounded hover:bg-accent">
                    Special Award
                  </summary>
                  <div className="flex flex-col ml-2">
                    {specialAwards.map((item) => (
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
                  </div>
                </details>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
} 