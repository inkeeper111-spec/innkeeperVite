import React from 'react';

export const Card = ({ children, className = '', title, subtitle, action, footer }) => {
  return (
    <div className={`bg-white rounded-xl border border-orvelle-border/80 shadow-sm overflow-hidden ${className}`}>
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-orvelle-border/60 flex items-center justify-between">
          <div>
            {title && <h3 className="font-semibold text-orvelle-primary text-base">{title}</h3>}
            {subtitle && <p className="text-xs text-orvelle-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-3 bg-orvelle-ivory border-t border-orvelle-border/60 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};

