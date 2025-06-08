'use client';
import { Pagination } from '@/components/ui/pagination';
import { useRouter, useSearchParams } from 'next/navigation';

interface EtihadPaginationProps {
  currentPage: number;
  totalPages: number;
  sort: string;
  showAll: boolean;
}

export default function EtihadPagination({ currentPage, totalPages, sort, showAll }: EtihadPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handlePageChange(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p + 1));
    params.set('sort', sort);
    if (showAll) params.set('showAll', '1');
    else params.delete('showAll');
    router.replace('?' + params.toString());
  }

  return (
    <div className="flex justify-center items-center mt-8">
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
} 