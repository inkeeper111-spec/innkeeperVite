import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isValidPhoneNumber, PhoneInput } from '../components/ui/PhoneInput';

const ControlledPhoneInput = ({ onChange = vi.fn(), ...props }) => {
  const [value, setValue] = useState('');
  return (
    <PhoneInput
      {...props}
      value={value}
      onChange={(phone) => {
        setValue(phone);
        onChange(phone);
      }}
    />
  );
};

describe('PhoneInput', () => {
  it('shows a country and calling code with a separate example number field', () => {
    render(<ControlledPhoneInput label="Phone" defaultCountry="India" />);

    expect(screen.getByRole('button', { name: /country calling code/i })).toHaveTextContent('IN +91');
    expect(screen.getByRole('textbox', { name: /Phone/ })).toHaveAttribute('type', 'tel');
    expect(screen.getByRole('textbox', { name: /Phone/ })).toHaveAttribute('placeholder', '9876543210');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows only the red validation message after an invalid number is blurred', () => {
    render(<ControlledPhoneInput label="Phone" defaultCountry="India" required />);
    const input = screen.getByRole('textbox', { name: /Phone/ });

    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.blur(input);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Digits only; the full number including country code must be 10 to 15 digits.'
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '9876543210' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('searches countries in a short list without a scrollable menu', () => {
    render(<ControlledPhoneInput label="Phone" defaultCountry="US" />);
    fireEvent.click(screen.getByRole('button', { name: /country calling code/i }));

    const search = screen.getByRole('searchbox', { name: /search countries/i });
    fireEvent.change(search, { target: { value: 'India' } });

    expect(screen.getByRole('option', { name: /IN \+91 — India/i })).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBeLessThanOrEqual(8);
  });

  it('stores the selected calling code with digits only', () => {
    const onChange = vi.fn();
    render(<ControlledPhoneInput label="Phone" defaultCountry="India" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '98a-765 43210' } });

    expect(onChange).toHaveBeenLastCalledWith('+91 - 9876543210');
    expect(screen.getByRole('textbox')).toHaveValue('9876543210');
  });

  it('validates the combined country code and number to 10 through 15 digits', () => {
    expect(isValidPhoneNumber('+91 - 123456789')).toBe(true);
    expect(isValidPhoneNumber('+1 - 12345678')).toBe(false);
    expect(isValidPhoneNumber('+1 - 123456789012345')).toBe(false);
    expect(isValidPhoneNumber('+1 (555) 123-4567')).toBe(false);
  });
});
