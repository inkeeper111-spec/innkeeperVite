import React from 'react';
import { NestnnLogo } from '../ui/NestnnLogo';

export const AppFooter = () => (
  <footer className="flex flex-col items-center gap-2 px-4 py-4 text-center text-[11px] text-orvelle-muted sm:flex-row sm:justify-center sm:gap-0 sm:px-6 lg:px-8">
    <NestnnLogo size="xs" />
    <span className="sm:ml-3">Copyrights infin8Tech</span>
    <span className="hidden mx-2 text-orvelle-champagne sm:inline">·</span>
    <span>With love from India</span>
  </footer>
);
