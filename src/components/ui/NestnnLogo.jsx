import React, { useState } from 'react';

export const NestnnLogo = ({
  size = 'md',
  className = '',
  variant = 'full',
  dark = false
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const fullSizes = {
    xs: 'h-7 w-10',
    sm: 'h-9 w-[54px]',
    md: 'h-11 w-[66px]',
    lg: 'h-20 w-[120px]',
    xl: 'h-24 w-36'
  };
  const iconSizes = {
    xs: 'h-7 w-7',
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20'
  };
  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  if (imageFailed || variant === 'text') {
    return (
      <span className={`font-black tracking-tight ${dark ? 'text-amber-300' : 'text-amber-800'} ${textSizes[size] || textSizes.md} ${className}`}>
        Nestnn
      </span>
    );
  }

  if (variant === 'icon') {
    return (
      <span className={`relative inline-flex flex-shrink-0 overflow-hidden rounded-xl bg-white ${iconSizes[size] || iconSizes.md} ${className}`}>
        <img
          src="/nestnn-mark.png"
          alt="Nestnn"
          className="h-full w-full object-contain p-1"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <img
      src="/nestnn-logo.png"
      alt="Nestnn Hotel & Inventory Management Platform"
      className={`flex-shrink-0 object-contain ${fullSizes[size] || fullSizes.md} ${dark ? 'rounded-md bg-white p-0.5' : ''} ${className}`}
      onError={() => setImageFailed(true)}
    />
  );
};
