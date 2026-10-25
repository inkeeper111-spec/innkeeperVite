import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading data...', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
      <Loader2 className={`${sizeMap[size]} text-brand-600 animate-spin`} />
      {text && <p className="text-sm text-slate-500 font-medium">{text}</p>}
    </div>
  );
};

