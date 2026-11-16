import React from 'react';
import { Loader2 } from 'lucide-react';
import { NestnnLogo } from './NestnnLogo';

export const LoadingSpinner = ({ text = 'Loading data...', size = 'md' }) => {
  const sizeMap = {
    sm: { frame: 'h-10 w-10', logo: 'xs' },
    md: { frame: 'h-14 w-14', logo: 'sm' },
    lg: { frame: 'h-[4.5rem] w-[4.5rem]', logo: 'md' }
  };
  const dimensions = sizeMap[size] || sizeMap.md;

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 px-4 py-12">
      <span className={`relative grid ${dimensions.frame} place-items-center`}>
        <Loader2 aria-hidden="true" className="absolute inset-0 h-full w-full animate-spin text-brand-500/45" strokeWidth={1.5} />
        <span className="grid h-[72%] w-[72%] place-items-center overflow-hidden rounded-full bg-white shadow-sm">
          <NestnnLogo variant="icon" size={dimensions.logo} className="!h-full !w-full !rounded-full !bg-transparent !p-1" />
        </span>
      </span>
      {text && <p className="text-sm text-slate-500 font-medium">{text}</p>}
    </div>
  );
};
