import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'APD Dumping - bbairtools',
  description: 'Find APD flights available for booking with various airline miles. Search and filter available award flights.',
  keywords: 'APD, award flights, miles booking, airline partnerships, flight search',
};

export default function APDDumpingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
