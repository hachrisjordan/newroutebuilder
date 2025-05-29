import * as React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  for (let i = 0; i < totalPages; i++) {
    if (
      i === 0 ||
      i === totalPages - 1 ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (
      (i === currentPage - 2 && currentPage > 2) ||
      (i === currentPage + 2 && currentPage < totalPages - 3)
    ) {
      pages.push('ellipsis-' + i);
    }
  }

  return (
    <nav className="flex items-center gap-2 mt-6" aria-label="Pagination">
      <button
        className="px-2 py-1 rounded border text-sm disabled:opacity-50"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
      >
        Previous
      </button>
      {pages.map((p, idx) =>
        typeof p === 'number' ? (
          <button
            key={p}
            className={`px-2 py-1 rounded border text-sm ${p === currentPage ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} transition`}
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p + 1}
          </button>
        ) : (
          <span key={p + '-' + idx} className="px-2 text-muted-foreground">…</span>
        )
      )}
      <button
        className="px-2 py-1 rounded border text-sm disabled:opacity-50"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
      >
        Next
      </button>
    </nav>
  );
};

export { Pagination }; 