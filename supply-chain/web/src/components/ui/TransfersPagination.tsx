interface TransfersPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  itemsInCurrentPage: number;
  onPageChange: (newPage: number) => void;
}

export default function TransfersPagination({
  page,
  totalPages,
  total,
  pageSize,
  itemsInCurrentPage,
  onPageChange,
}: TransfersPaginationProps) {
  const offset = (page - 1) * pageSize;

  // Calculate start and end positions for "Showing X–Y of Z"
  const start = Math.min(total, offset + 1);
  const end = Math.min(total, offset + itemsInCurrentPage);

  // Handle Prev click
  const handlePrev = () => {
    onPageChange(Math.max(1, page - 1));
  };

  // Handle Next click
  const handleNext = () => {
    onPageChange(Math.min(totalPages, page + 1));
  };

  return (
    <div className="flex items-center justify-between p-3 border-t bg-gray-50">
      <div className="text-xs text-gray-500">
        Showing {start}–{end} of {total}
      </div>
      <div className="space-x-2">
        <button
          type="button"
          className="px-3 py-1 text-blue-500 text-xs bg-white border rounded disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-100"
          onClick={handlePrev}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          Prev
        </button>
        <span className="text-xs text-gray-600">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="px-3 py-1 text-blue-500 text-xs bg-white border rounded disabled:opacity-50 disabled:pointer-events-none hover:bg-gray-100"
          onClick={handleNext}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}
