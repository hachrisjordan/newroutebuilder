import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ANA Skiplag - bbairtools',
  description: 'Find ANA flights available on LifeMiles for skiplagging. Search and filter available award flights.',
  keywords: 'ANA, All Nippon Airways, skiplag, award flights, miles booking, airline partnerships',
};

export default function ANASkiplagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 