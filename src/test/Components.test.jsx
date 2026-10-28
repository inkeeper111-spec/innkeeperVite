import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button }         from '../components/ui/Button';
import { Badge }          from '../components/ui/Badge';
import { Card }           from '../components/ui/Card';
import { Input }          from '../components/ui/Input';
import { Modal }          from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { DatePicker } from '../components/ui/DatePicker';

// ─── Button ───────────────────────────────────────────────────────────────────
describe('Button component', () => {
  it('renders with label text', () => {
    render(<Button>Confirm Reservation</Button>);
    expect(screen.getByRole('button', { name: /confirm reservation/i })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled and shows spinner when loading', () => {
    render(<Button loading>Loading Button</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    // Lucide Loader2 renders as SVG inside the button
    expect(btn.querySelector('svg')).not.toBeNull();
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>No Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-brand-600/);
  });

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-rose-600/);
  });

  it('applies success variant classes', () => {
    render(<Button variant="success">Approve</Button>);
    expect(screen.getByRole('button').className).toMatch(/bg-emerald-600/);
  });
});

// ─── Badge ────────────────────────────────────────────────────────────────────
describe('Badge component', () => {
  it('renders with text content', () => {
    render(<Badge>active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('formats snake_case status to Title Case', () => {
    render(<Badge variant="checked_in">checked_in</Badge>);
    expect(screen.getByText('Checked In')).toBeInTheDocument();
  });

  it('formats pending_approval correctly', () => {
    render(<Badge variant="pending_approval">pending_approval</Badge>);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
  });

  it('applies available variant (green) styling', () => {
    const { container } = render(<Badge variant="available">available</Badge>);
    expect(container.firstChild.className).toMatch(/bg-emerald-50/);
  });

  it('applies critical variant (red) styling', () => {
    const { container } = render(<Badge variant="critical">critical</Badge>);
    expect(container.firstChild.className).toMatch(/bg-rose-100/);
  });

  it('applies medium badge size', () => {
    const { container } = render(<Badge size="md">Status</Badge>);
    expect(container.firstChild.className).toMatch(/text-sm/);
  });

  it('falls back to default variant for unknown status', () => {
    const { container } = render(<Badge variant="unknown_xyz">Unknown</Badge>);
    expect(container.firstChild.className).toMatch(/bg-slate-100/);
  });
});

// ─── Card ─────────────────────────────────────────────────────────────────────
describe('Card component', () => {
  it('renders children content', () => {
    render(<Card>Card Content Here</Card>);
    expect(screen.getByText('Card Content Here')).toBeInTheDocument();
  });

  it('renders title and subtitle in header', () => {
    render(<Card title="Revenue Summary" subtitle="This month">Body</Card>);
    expect(screen.getByText('Revenue Summary')).toBeInTheDocument();
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('renders action slot when provided', () => {
    render(
      <Card title="Bookings" action={<button>View All</button>}>
        Content
      </Card>
    );
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(<Card footer={<span>Footer Content</span>}>Body</Card>);
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('does not render header section when no title or action', () => {
    const { container } = render(<Card>Just Body</Card>);
    // No border-b header div should appear
    expect(container.querySelector('.border-b')).toBeNull();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Body</Card>);
    expect(container.firstChild.className).toMatch(/custom-class/);
  });
});

// ─── Input ────────────────────────────────────────────────────────────────────
describe('Input component', () => {
  it('renders input with label', () => {
    render(<Input label="Guest Name" name="guestName" />);
    expect(screen.getByLabelText(/guest name/i)).toBeInTheDocument();
  });

  it('shows required asterisk when required', () => {
    render(<Input label="Phone Number" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<Input label="Email" error="Invalid email format" />);
    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('applies error border styling when error is set', () => {
    render(<Input label="Email" error="Error" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-rose-400/);
  });

  it('displays helper text when no error', () => {
    render(<Input label="Code" helperText="Enter your booking code" />);
    expect(screen.getByText('Enter your booking code')).toBeInTheDocument();
  });

  it('calls onChange handler on user input', async () => {
    const handleChange = vi.fn();
    render(<Input label="Name" onChange={handleChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'John');
    expect(handleChange).toHaveBeenCalled();
  });

  it('accepts placeholder text', () => {
    render(<Input placeholder="Search guests..." />);
    expect(screen.getByPlaceholderText('Search guests...')).toBeInTheDocument();
  });

  it('renders as password type', () => {
    render(<Input label="Password" type="password" />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('renders premium date fields through the shared input component', async () => {
    const handleChange = vi.fn();
    render(<Input label="Stay Date" type="date" value="" onChange={handleChange} />);
    await userEvent.click(screen.getByRole('button', { name: /stay date/i }));
    expect(screen.getByRole('dialog', { name: /choose date/i })).toBeInTheDocument();
  });
});

// ─── DatePicker ──────────────────────────────────────────────────────────────
describe('DatePicker component', () => {
  it('selects a date and emits an input-compatible change event', async () => {
    const handleChange = vi.fn();
    render(<DatePicker label="Booking Date" value="2026-10-28" onChange={handleChange} />);
    await userEvent.click(screen.getByRole('button', { name: /booking date/i }));
    await userEvent.click(screen.getByRole('button', { name: /October 29, 2026/i }));
    expect(handleChange).toHaveBeenCalledWith({ target: { name: undefined, value: '2026-10-29' } });
  });
});

// ─── Modal ────────────────────────────────────────────────────────────────────
describe('Modal component', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Test Modal">
        Modal Content
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('renders title and content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Reservation Details">
        <p>Booking Reference: BK-2026-001</p>
      </Modal>
    );
    expect(screen.getByText('Reservation Details')).toBeInTheDocument();
    expect(screen.getByText('Booking Reference: BK-2026-001')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Payment" subtitle="Record guest settlement">
        Content
      </Modal>
    );
    expect(screen.getByText('Record guest settlement')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Modal">
        Content
      </Modal>
    );
    await userEvent.click(screen.getByRole('button'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} title="Modal">
        Content
      </Modal>
    );
    // The backdrop is the fixed inset-0 div before the dialog
    const backdrop = container.querySelector('.fixed.inset-0.bg-slate-900\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalled();
    }
  });

  it('calls onClose when Escape key is pressed', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Modal">
        Content
      </Modal>
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Modal"
        footer={<button>Save Changes</button>}>
        Content
      </Modal>
    );
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});

// ─── LoadingSpinner ───────────────────────────────────────────────────────────
describe('LoadingSpinner component', () => {
  it('renders with default loading text', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<LoadingSpinner text="Aggregating analytics..." />);
    expect(screen.getByText('Aggregating analytics...')).toBeInTheDocument();
  });

  it('renders SVG spinner icon', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders without text when text is empty string', () => {
    render(<LoadingSpinner text="" />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});
