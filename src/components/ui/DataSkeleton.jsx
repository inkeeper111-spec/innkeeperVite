import React from 'react';

const SkeletonBar = ({ className = '' }) => (
  <span className={`block animate-pulse rounded-md bg-slate-200/80 ${className}`} />
);

export const DataSkeleton = ({
  variant = 'table',
  rows = 5,
  columns = 4,
  className = '',
  label = 'Loading data'
}) => {
  if (variant === 'page') {
    return (
      <div role="status" aria-label={label} className={`space-y-6 p-1 ${className}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <SkeletonBar className="h-7 w-48 max-w-full" />
            <SkeletonBar className="h-4 w-72 max-w-full" />
          </div>
          <SkeletonBar className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-5">
              <SkeletonBar className="h-3 w-24" />
              <SkeletonBar className="mt-4 h-7 w-32" />
              <SkeletonBar className="mt-3 h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-5">
              <SkeletonBar className="mb-5 h-5 w-40" />
              <div className="flex h-48 items-end gap-3">
                {Array.from({ length: 8 }, (_, bar) => (
                  <SkeletonBar key={bar} className={`flex-1 ${['h-2/3', 'h-1/2', 'h-4/5', 'h-3/5'][bar % 4]}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <SkeletonBar className="mb-5 h-5 w-44" />
          <TableRows rows={rows} columns={columns} />
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div role="status" aria-label={label} className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-4">
            <SkeletonBar className="h-36 w-full rounded-lg" />
            <SkeletonBar className="mt-4 h-5 w-2/3" />
            <SkeletonBar className="mt-3 h-3 w-full" />
            <SkeletonBar className="mt-2 h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div role="status" aria-label={label} className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <SkeletonBar className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBar className="h-4 w-1/3" />
              <SkeletonBar className="h-3 w-2/3" />
            </div>
            <SkeletonBar className="hidden h-8 w-20 sm:block" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div role="status" aria-label={label} className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="hidden grid-cols-[repeat(var(--skeleton-columns),minmax(0,1fr))] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:grid"
        style={{ '--skeleton-columns': columns }}
      >
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBar key={index} className="h-3 w-3/4" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        <TableRows rows={rows} columns={columns} />
      </div>
    </div>
  );
};

const TableRows = ({ rows, columns }) => (
  <>
    {Array.from({ length: rows }, (_, row) => (
      <div
        key={row}
        className="grid gap-3 px-4 py-4 sm:grid-cols-[repeat(var(--skeleton-columns),minmax(0,1fr))] sm:gap-4"
        style={{ '--skeleton-columns': columns }}
      >
        {Array.from({ length: columns }, (_, column) => (
          <SkeletonBar
            key={column}
            className={`h-3 ${column === 0 ? 'w-4/5' : column === columns - 1 ? 'w-2/3 sm:ml-auto' : 'w-full'}`}
          />
        ))}
      </div>
    ))}
  </>
);
