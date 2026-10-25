import React from 'react';

/**
 * InnKeeper brand logo.
 * Drop logo.png (or logo.svg) in client/public/ to use the real image.
 * Falls back to a styled text mark automatically.
 */
export const InnkeeperLogo = ({
  size = 'md',
  className = '',
  variant = 'full',   // 'full' | 'icon' | 'text'
  dark = false        // true = white text (for dark backgrounds)
}) => {
  const imgSizes = { xs: 'h-6', sm: 'h-8', md: 'h-10', lg: 'h-14', xl: 'h-20' };
  const h = imgSizes[size] || imgSizes.md;

  const textColor   = dark ? 'text-amber-300'       : 'text-amber-800';
  const subColor    = dark ? 'text-amber-300/70'     : 'text-amber-600/80';
  const iconBg      = dark ? 'from-amber-600 to-amber-400' : 'from-amber-800 to-amber-500';

  /* ── Text-only mark ─────────────────────────────────────────────────────── */
  if (variant === 'text') {
    return (
      <div className={`flex flex-col leading-tight select-none ${className}`}>
        <span className={`font-black tracking-tight ${textColor} ${
          size === 'xs' ? 'text-sm' : size === 'sm' ? 'text-base' :
          size === 'lg' ? 'text-2xl' : size === 'xl' ? 'text-3xl' : 'text-xl'
        }`} style={{ fontFamily: 'Georgia,"Times New Roman",serif' }}>
          InnKeeper
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${subColor}`}>
          Hotel Management Suite
        </span>
      </div>
    );
  }

  /* ── Icon-only monogram ─────────────────────────────────────────────────── */
  if (variant === 'icon') {
    return (
      <div className={`rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center
        text-white font-black shadow-md select-none flex-shrink-0
        ${size === 'xs' ? 'w-7 h-7 text-base' :
          size === 'sm' ? 'w-9 h-9 text-lg' :
          size === 'lg' ? 'w-14 h-14 text-3xl' :
          size === 'xl' ? 'w-20 h-20 text-4xl' : 'w-11 h-11 text-2xl'}
        ${className}`}
        style={{ fontFamily: 'Georgia,"Times New Roman",serif' }}>
        I
      </div>
    );
  }

  /* ── Full logo (image + text fallback) ───────────────────────────────────── */
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Try real image first */}
      <img
        src="/logo.png"
        alt="InnKeeper HMS"
        className={`${h} w-auto object-contain flex-shrink-0`}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.parentElement.querySelector('[data-fallback]');
          if (fallback) fallback.style.display = 'flex';
        }}
      />
      {/* Fallback icon mark (shown when image missing) */}
      <div
        data-fallback="true"
        style={{ display: 'none' }}
        className={`rounded-xl bg-gradient-to-br ${iconBg} items-center justify-center
          text-white font-black shadow-md flex-shrink-0
          ${size === 'xs' ? 'w-7 h-7 text-base' :
            size === 'sm' ? 'w-9 h-9 text-lg' :
            size === 'lg' ? 'w-14 h-14 text-3xl' : 'w-11 h-11 text-2xl'}`}
        style2={{ fontFamily: 'Georgia,"Times New Roman",serif' }}>
        I
      </div>
      {/* Brand name */}
      <div className="flex flex-col leading-tight">
        <span className={`font-black tracking-tight ${textColor} ${
          size === 'xs' ? 'text-sm' : size === 'sm' ? 'text-base' :
          size === 'lg' ? 'text-2xl' : size === 'xl' ? 'text-3xl' : 'text-lg'
        }`} style={{ fontFamily: 'Georgia,"Times New Roman",serif' }}>
          InnKeeper
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-widest ${subColor}`}>
          Hotel Management Suite
        </span>
      </div>
    </div>
  );
};
