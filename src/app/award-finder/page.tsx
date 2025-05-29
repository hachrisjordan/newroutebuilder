import { AwardFinderSearch } from '@/components/award-finder/award-finder-search';
import AwardFinderResultsDemo from '@/components/award-finder/award-finder-results-demo';

export default function AwardFinderPage() {
  return (
    <main className="flex flex-col items-center bg-background min-h-screen pt-8 pb-12 px-2 sm:px-4">
      <AwardFinderSearch />
      <div className="mt-8 w-full flex flex-col items-center">
        <AwardFinderResultsDemo />
      </div>
    </main>
  );
} 