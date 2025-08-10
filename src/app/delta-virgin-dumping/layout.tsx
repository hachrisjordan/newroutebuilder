import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkyTeam on Virgin Dumping - bbairtools',
  description: 'Find SkyTeam flights available for booking with Virgin Atlantic points. Search and filter available award flights.',
  keywords: 'SkyTeam, Virgin Atlantic, award flights, miles booking, airline partnerships',
};

export default function DeltaVirginDumpingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 