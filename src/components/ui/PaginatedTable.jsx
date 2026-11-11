import React, { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

const flattenRows = (children) => Children.toArray(children).flatMap((child) => {
  if (!isValidElement(child)) return [];
  if (child.type === React.Fragment) return flattenRows(child.props.children);
  return child.type === 'tr' ? [child] : [];
});

export const PaginatedTable = ({ children, tableClassName = '' }) => {
  const [page, setPage] = useState(1);
  const tableRef = useRef(null);
  const tableChildren = Children.toArray(children);
  const bodyIndex = tableChildren.findIndex((child) => isValidElement(child) && child.type === 'tbody');
  const rows = useMemo(
    () => bodyIndex < 0 ? [] : flattenRows(tableChildren[bodyIndex].props.children),
    [bodyIndex, tableChildren]
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const paginatedChildren = tableChildren.map((child, index) => (
    index === bodyIndex ? cloneElement(child, {}, visibleRows) : child
  ));

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const labels = Array.from(table.tHead?.rows[0]?.cells || []).map((header) => header.textContent.trim());
    Array.from(table.tBodies).flatMap((body) => Array.from(body.rows)).forEach((row) => {
      Array.from(row.cells).forEach((cell, index) => {
        cell.dataset.label = labels[index] || '';
      });
    });
  }, [visibleRows]);

  return (
    <div className="responsive-data-table-frame">
      <table ref={tableRef} className={`responsive-data-table ${tableClassName}`}>
        {paginatedChildren}
      </table>
      <div className="responsive-data-table-pagination" aria-label="Table pagination">
        <span>
          {rows.length === 0
            ? 'No rows'
            : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, rows.length)} of ${rows.length}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="responsive-data-table-page-button"
            aria-label="Previous page"
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="min-w-16 text-center">Page {currentPage} of {pageCount}</span>
          <button
            type="button"
            className="responsive-data-table-page-button"
            aria-label="Next page"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
