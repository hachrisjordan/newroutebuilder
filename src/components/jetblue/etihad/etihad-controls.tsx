'use client';
import EtihadShowAllCheckbox from './etihad-show-all-checkbox';
import EtihadSortDropdown from './etihad-sort-dropdown';
import { useSearchParams, useRouter } from 'next/navigation';

export default function EtihadControls() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showAll = searchParams.get('showAll') === '1';
  const sort = searchParams.get('sort') || 'duration';

  function handleShowAllChange(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) params.set('showAll', '1');
    else params.delete('showAll');
    params.set('page', '1');
    router.replace('?' + params.toString());
  }

  function handleSortChange(val: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', val);
    params.set('page', '1');
    router.replace('?' + params.toString());
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
      <EtihadShowAllCheckbox showAll={showAll} onChange={handleShowAllChange} />
      <EtihadSortDropdown sort={sort} onChange={handleSortChange} />
    </div>
  );
} 