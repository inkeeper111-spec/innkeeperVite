import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaginatedTable } from '../components/ui/PaginatedTable';

describe('PaginatedTable', () => {
  it('shows ten rows per page and labels cells for mobile cards', async () => {
    const { container } = render(
      <PaginatedTable tableClassName="w-full">
        <thead>
          <tr><th>Guest</th></tr>
        </thead>
        <tbody>
          {Array.from({ length: 11 }, (_, index) => (
            <tr key={index}><td>Guest {index + 1}</td></tr>
          ))}
        </tbody>
      </PaginatedTable>
    );

    const table = container.querySelector('table');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(screen.getByText('1–10 of 11')).toBeInTheDocument();
    await waitFor(() => {
      expect(table.querySelector('tbody td')).toHaveAttribute('data-label', 'Guest');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(table.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(screen.getByText('11–11 of 11')).toBeInTheDocument();
    expect(screen.getByText('Guest 11')).toBeInTheDocument();
  });
});
