import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lufthansa Skiplag - bbairtools',
  description: 'Find Lufthansa flights available for skiplagging on LifeMiles. Search and filter available award flights.',
  keywords: 'Lufthansa, skiplag, award flights, miles booking, airline partnerships',
};

export default function LufthansaSkiplagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 