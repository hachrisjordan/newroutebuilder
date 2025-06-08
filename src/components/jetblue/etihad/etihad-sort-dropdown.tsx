'use client';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

interface EtihadSortDropdownProps {
  sort: string;
  onChange?: (val: string) => void;
}

const SORT_OPTIONS = [
  { value: 'points', label: 'Points (Lowest)' },
  { value: 'duration', label: 'Duration (Shortest)' },
  { value: 'depart', label: 'Departure Time (Earliest)' },
];

export default function EtihadSortDropdown({ sort, onChange }: EtihadSortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const effectiveSort = sort || 'points';

  function handleChange(val: string) {
    if (onChange) return onChange(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', val);
    params.set('page', '1'); // reset to first page on sort change
    router.replace('?' + params.toString());
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Sort by:</span>
      <Select value={effectiveSort} onValueChange={handleChange}>
        <SelectTrigger className="w-56">
          <SelectValue>{SORT_OPTIONS.find(o => o.value === effectiveSort)?.label || ''}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 