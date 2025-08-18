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
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

const navigation = [
  // { name: 'Home', href: '/' }, // Removed Home link
  { name: 'Seat Type / Delay', href: '/seat-type-delay' },
  { name: 'Award Finder', href: '/award-finder' },
  { name: 'Live Search', href: '/live-search' },
];

const aviationData = [
  { name: 'Load Factor', href: '/load-factor' },
  { name: 'United Special Award', href: '/united-pz' },
];

const specialAwards = [
  { name: 'Etihad on JetBlue', href: '/jetblue/etihad' },
  { name: 'SkyTeam on Virgin Dumping', href: '/delta-virgin-dumping' },
  { name: 'Virgin Dumping', href: '/virgin-dumping' },
  { name: 'Lufthansa Skiplag', href: '/lufthansa-skiplag' },
  { name: 'ANA Skiplag', href: '/ana-skiplag' },
  { name: 'BA APD Dumping on Alaska', href: '/apd-dumping' },
  { name: 'JALSnipe (JL Married Segments)', href: '/jal-snipe' },
];

export function Header() {
  const pathname = usePathname();
  const [isAtTop, setIsAtTop] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingRole, setIsLoadingRole] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initialize
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      setIsLoadingRole(true);
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        setUserRole(profile?.role || null);
      } else {
        setUserRole(null);
      }
      setIsLoadingRole(false);
    };
    
    fetchUserRole();
  }, []);

  // Shared card style for both desktop and mobile
  const cardClass =
    'transition-[margin,max-width,background,border-radius,box-shadow] duration-700 ease-in-out ' +
    (isAtTop
      ? 'bg-card md:shadow-2xl md:ring-1 md:ring-border md:rounded-2xl mx-auto md:mt-6 md:max-w-7xl px-2 md:px-8 w-full rounded-none shadow-none ring-0 mt-0'
      : 'bg-background shadow-none ring-0 rounded-none mx-auto mt-0 md:max-w-[3000px] md:rounded-none md:shadow-none md:ring-0 md:mt-0 md:px-4 w-full');

  return (
    <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur supports-[backdrop-filter]:bg-transparent">
      {/* Desktop Header */}
      <div
        className={
          'hidden md:flex h-16 items-center ' +
          cardClass +
          (!isAtTop ? ' md:border-b' : '')
        }
        style={{
          boxSizing: 'border-box',
        }}
      >
        <div className="mr-6 flex items-center">
          <Link href="/" className="flex items-center">
            <Image src="/rblogo.png" alt="RouteBuilder Logo" height={40} width={40} className="h-10 w-auto" priority />
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium relative">
          {navigation.map((item) => (
            pathname === item.href ? (
              <span key={item.href} className="relative inline-flex items-center">
                <AnimatePresence>
                  <motion.div
                    layoutId="nav-highlight"
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-lg z-0"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </AnimatePresence>
                <Link
                  href={item.href}
                  className={cn(
                    'relative z-10 px-3 py-1.5 font-semibold text-primary transition-colors dark:text-primary',
                  )}
                >
                  {item.name}
                </Link>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'transition-colors hover:text-foreground/80',
                  'text-foreground/60'
                )}
              >
                {item.name}
              </Link>
            )
          ))}
          {/* Aviation Data Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'ml-6 text-sm font-medium transition-colors hover:text-foreground/80',
                  pathname.startsWith('/load-factor')
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
                aria-haspopup="menu"
              >
                Aviation Data
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {aviationData.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>{item.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Special Award Dropdown - Only for Owner and Pro users */}
          {(userRole === 'Owner' || userRole === 'Pro') && (
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
          )}
        </nav>
        <div className="ml-auto flex items-center space-x-4">
          <HeaderUserMenu />
          <ThemeToggle />
        </div>
      </div>
      {/* Mobile Header */}
      <div
        className={
          'flex md:hidden h-16 items-center justify-between border-b ' + cardClass
        }
        style={{
          boxSizing: 'border-box',
        }}
      >
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
                {/* Aviation Data Mobile Dropdown */}
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground uppercase tracking-wider cursor-pointer select-none py-2 px-2 rounded hover:bg-accent">
                    Aviation Data
                  </summary>
                  <div className="flex flex-col ml-2">
                    {aviationData.map((item) => (
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
                {/* Special Award Mobile Dropdown - Only for Owner and Pro users */}
                {(userRole === 'Owner' || userRole === 'Pro') && (
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
                )}
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
} 