'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { HeaderUserMenu } from '@/components/auth-wizard/header-user-menu';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Find Airport', href: '/find-airport' },
  { name: 'Award Finder', href: '/award-finder' },
  { name: 'Live Search', href: '/live-search' },
  { name: 'Shortest Route', href: '/shortest-route' },
  { name: 'Seat Type & Delay', href: '/seat-type-delay' },
];

const specialAwards = [
  { name: 'JetBlue ↔ Etihad', href: '/jetblue/etihad' },
];

// Server-side navigation component
function NavigationLinks({ pathname }: { pathname: string }) {
  return (
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
  );
}

// Mobile navigation component
function MobileNavigation({ pathname }: { pathname: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-background border-t shadow-lg z-50">
          <div className="flex flex-col space-y-4 p-4">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-foreground/80',
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {specialAwards.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-foreground/80',
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Desktop Header */}
      <div className="hidden md:flex w-full px-4 h-16 items-center">
        <div className="mr-6 flex items-center">
          <Link href="/" className="flex items-center">
            <Image 
              src="/rblogo.png" 
              alt="RouteBuilder Logo" 
              height={40} 
              width={40} 
              className="h-10 w-auto" 
              priority
              sizes="40px"
            />
          </Link>
        </div>
        <NavigationLinks pathname={pathname} />
        <div className="ml-auto">
          <HeaderUserMenu />
        </div>
      </div>

      {/* Mobile Header */}
      <div className="flex md:hidden w-full px-4 h-16 items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image 
            src="/rblogo.png" 
            alt="RouteBuilder Logo" 
            height={32} 
            width={32} 
            className="h-8 w-auto" 
            priority
            sizes="32px"
          />
        </Link>
        <div className="flex items-center space-x-2">
          <HeaderUserMenu />
          <MobileNavigation pathname={pathname} />
        </div>
      </div>
    </header>
  );
} 