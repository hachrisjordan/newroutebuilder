'use client';
import { Checkbox } from '@/components/ui/checkbox';

interface EtihadShowAllCheckboxProps {
  showAll: boolean;
  onChange: (checked: boolean) => void;
}

export default function EtihadShowAllCheckbox({ showAll, onChange }: EtihadShowAllCheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <Checkbox
        checked={showAll}
        onCheckedChange={val => onChange(!!val)}
        className="mr-2"
        id="show-all-checkbox"
      />
      <span>Show all results</span>
    </label>
  );
} 