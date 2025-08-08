import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Virgin Dumping - NewRouteBuilder',
  description: 'Find Virgin Atlantic flights available for booking with Delta SkyMiles. Search and filter available award flights.',
  keywords: 'Delta SkyMiles, Virgin Atlantic, award flights, miles booking, airline partnerships',
};

export default function VirginDumpingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
