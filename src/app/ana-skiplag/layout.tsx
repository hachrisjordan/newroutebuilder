import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ANA Skiplag - NewRouteBuilder',
  description: 'Find ANA flights available for skiplagging. Search and filter available award flights.',
  keywords: 'ANA, All Nippon Airways, skiplag, award flights, miles booking, airline partnerships',
};

export default function ANASkiplagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 