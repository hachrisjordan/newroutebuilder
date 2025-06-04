import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { getAirlineAlliance, isStarAllianceAirline, getAllProgramsFromDb } from '@/lib/alliance';

const getProgramLogoSrc = (code: string) => `/${code.toUpperCase()}.png`;

const SelectProgram: React.FC<{
  airline: string;
  selectedProgram?: string;
  setSelectedProgram: (code: string | undefined) => void;
}> = ({ airline, selectedProgram, setSelectedProgram }) => {
  const [displayValue, setDisplayValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [programs, setPrograms] = useState<{ code: string; name: string; ffp?: string }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isLoading = false;

  useEffect(() => {
    async function fetchPrograms() {
      const alliance = getAirlineAlliance(airline);
      if (!alliance) {
        setPrograms([]);
        return;
      }
      const allPrograms = await getAllProgramsFromDb();
      setPrograms(allPrograms.filter(p => p.alliance === alliance));
    }
    fetchPrograms();
  }, [airline]);

  const filteredPrograms = programs.filter((program) => {
    if (!searchTerm) return true;
    return (
      program.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (program.ffp || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="w-fit" ref={dropdownRef}>
      <div className="relative">
        {selectedProgram ? (
          <div
            className="h-8 pl-8 pr-8 flex items-center border rounded-md bg-background/50 text-sm cursor-text relative dark:bg-background/80 dark:border-border/50"
            onClick={() => setShowDropdown(true)}
          >
            <Image
              src={getProgramLogoSrc(selectedProgram || '')}
              alt={programs.find(p => p.code === selectedProgram)?.name || ''}
              width={20}
              height={20}
              className="absolute left-2 top-1/2 -translate-y-1/2 object-contain rounded-[4px]"
              unoptimized
            />
            <span className="block sm:hidden font-bold">{selectedProgram}</span>
            <span className="hidden sm:block dark:text-foreground/90">
              {programs.find(p => p.code === selectedProgram)?.name} {programs.find(p => p.code === selectedProgram)?.ffp ? (programs.find(p => p.code === selectedProgram)?.ffp) : ''} - <span className="font-bold">{selectedProgram}</span>
            </span>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 rounded-sm touch-manipulation select-none"
              onClick={e => {
                e.stopPropagation();
                setSelectedProgram(undefined);
                setDisplayValue('');
                setSearchTerm('');
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Input
            type="text"
            placeholder={isLoading ? 'Loading...' : 'Select program...'}
            value={displayValue}
            onChange={e => {
              setDisplayValue(e.target.value);
              setSearchTerm(e.target.value);
              setSelectedProgram(undefined);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="h-8 pl-8"
            disabled={isLoading}
          />
        )}
      </div>
      {showDropdown && !isLoading && (
        <div className="absolute z-10 mt-1 max-h-60 w-fit overflow-auto rounded-md bg-popover/95 dark:bg-popover/90 py-1 shadow-lg border dark:border-border/50">
          {filteredPrograms.length > 0 ? (
            filteredPrograms.map((program) => (
              <div
                key={program.code}
                className="flex items-center gap-2 px-2 py-1.5 pointer-fine:hover:bg-accent/50 pointer-fine:dark:hover:bg-accent/30 cursor-pointer transition-colors touch-manipulation select-none"
                onClick={() => {
                  setSelectedProgram(program.code);
                  setDisplayValue(`${program.name} ${program.ffp ? program.ffp : ''} - ${program.code}`);
                  setSearchTerm('');
                  setShowDropdown(false);
                }}
              >
                <Image
                  src={getProgramLogoSrc(program.code)}
                  alt={program.name}
                  width={20}
                  height={20}
                  className="object-contain rounded-[4px]"
                  unoptimized
                />
                <div className="flex flex-col">
                  <span className="text-sm">{program.name} {program.ffp ? program.ffp : ''} - <span className="font-bold">{program.code}</span></span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No programs found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectProgram; 