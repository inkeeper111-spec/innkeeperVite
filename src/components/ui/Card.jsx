import React from 'react';

export const Card = ({ children, className = '', title, subtitle, action, footer }) => {
  return (
    <div className={`min-w-0 bg-white rounded-xl border border-orvelle-border/80 shadow-sm overflow-hidden ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex flex-col gap-3 px-4 py-4 border-b border-orvelle-border/60 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="min-w-0 flex-1">
            {title && <h3 className="font-semibold text-orvelle-primary text-base break-words">{title}</h3>}
            {subtitle && <p className="text-xs text-orvelle-muted mt-0.5 break-words">{subtitle}</p>}
          </div>
          {action && <div className="w-full min-w-0 sm:w-auto sm:flex-none [&>*]:max-w-full [&>*]:flex-wrap">{action}</div>}
        </div>
      )}
      <div className="p-4 sm:p-5 lg:p-6">{children}</div>
      {footer && (
        <div className="flex flex-col gap-3 px-4 py-3 bg-orvelle-ivory border-t border-orvelle-border/60 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          {footer}
        </div>
      )}
    </div>
  );
};

