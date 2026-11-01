import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NestnnLogo } from '../components/ui/NestnnLogo';

describe('Nestnn logo', () => {
  it('uses the supplied logo asset with accessible brand text', () => {
    render(<NestnnLogo />);

    const logo = screen.getByRole('img', { name: 'Nestnn Hotel & Inventory Management Platform' });
    expect(logo).toHaveAttribute('src', '/nestnn-logo.png');
  });

  it('shows the Nestnn wordmark if the image cannot load', () => {
    render(<NestnnLogo />);
    fireEvent.error(screen.getByRole('img'));

    expect(screen.getByText('Nestnn')).toBeInTheDocument();
  });

  it('uses the dedicated mark in the collapsed icon variant', () => {
    render(<NestnnLogo variant="icon" />);

    expect(screen.getByRole('img', { name: 'Nestnn' })).toHaveAttribute('src', '/nestnn-mark.png');
  });
});
