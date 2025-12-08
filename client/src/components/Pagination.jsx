import "../styles/pagination.css";

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrevPage}
      >
        ← Previous
      </button>

      <div className="pagination-pages">
        {currentPage > 3 && (
          <>
            <button
              className="pagination-page"
              onClick={() => onPageChange(1)}
            >
              1
            </button>
            {currentPage > 4 && <span className="pagination-ellipsis">...</span>}
          </>
        )}

        {getPageNumbers().map((page) => (
          <button
            key={page}
            className={`pagination-page ${page === currentPage ? "active" : ""}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}

        {currentPage < totalPages - 2 && (
          <>
            {currentPage < totalPages - 3 && <span className="pagination-ellipsis">...</span>}
            <button
              className="pagination-page"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}
      </div>

      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
      >
        Next →
      </button>
    </div>
  );
}
