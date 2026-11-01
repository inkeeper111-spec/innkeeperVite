import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

const countryName = (country) => displayNames.of(country) || country;

const countryOptions = getCountries()
  .map((country) => ({
    country,
    name: countryName(country),
    callingCode: getCountryCallingCode(country)
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const preferredCountries = ['US', 'IN', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP'];

const getNumberPlaceholder = (country) => ({
  US: '5555555555',
  CA: '5555555555',
  IN: '9876543210',
  GB: '7700900123',
  AU: '412345678'
}[country] || '1234567890');

const resolveCountry = (value) => {
  if (!value) return 'US';
  const normalized = value.trim().toLowerCase();
  const byCode = countryOptions.find(({ country }) => country.toLowerCase() === normalized);
  if (byCode) return byCode.country;
  const byName = countryOptions.find(({ name }) => name.toLowerCase() === normalized);
  return byName?.country || 'US';
};

const parsePhoneValue = (value, preferredCountry) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return { country: preferredCountry, nationalNumber: '' };

  const explicitInternational = String(value).trim().startsWith('+');
  if (!explicitInternational) {
    return { country: preferredCountry, nationalNumber: digits };
  }

  const candidates = countryOptions
    .filter(({ callingCode }) => digits.startsWith(callingCode))
    .sort((a, b) => b.callingCode.length - a.callingCode.length);
  const longestCode = candidates[0]?.callingCode;
  const matchingCountries = candidates.filter(({ callingCode }) => callingCode === longestCode);
  const match = matchingCountries.find(({ country }) => country === preferredCountry) || matchingCountries[0];
  if (!match) return { country: preferredCountry, nationalNumber: digits };

  return {
    country: match.country,
    nationalNumber: digits.slice(match.callingCode.length)
  };
};

export const formatPhoneNumber = (country, nationalNumber) =>
  nationalNumber ? `+${getCountryCallingCode(country)} - ${nationalNumber}` : '';

export const isValidPhoneNumber = (value) => {
  if (typeof value !== 'string' || !/^\+\d{1,3} - \d+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
};

export const PhoneInput = ({
  label,
  value = '',
  onChange,
  defaultCountry = 'US',
  required = false,
  helperText,
  className = ''
}) => {
  const id = useId();
  const countryPickerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [country, setCountry] = useState(() => resolveCountry(defaultCountry));
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const normalizedDefault = useMemo(() => resolveCountry(defaultCountry), [defaultCountry]);
  const callingCode = getCountryCallingCode(country);
  const parsedValue = parsePhoneValue(value, country);
  const nationalNumber = parsedValue.nationalNumber.slice(0, 15 - callingCode.length);
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    const matches = countryOptions.filter(({ country: code, name, callingCode: dialCode }) =>
      !query
        ? preferredCountries.includes(code)
        : (query.length <= 2 && code.toLowerCase().includes(query))
          || name.toLowerCase().includes(query)
          || dialCode.includes(query.replace(/^\+/, ''))
    );
    return matches.slice(0, 8);
  }, [countrySearch]);

  useEffect(() => {
    setCountry(normalizedDefault);
  }, [normalizedDefault]);

  useEffect(() => {
    if (!value) return;
    const parsed = parsePhoneValue(value, country);
    setCountry(parsed.country);
    const normalized = formatPhoneNumber(parsed.country, parsed.nationalNumber);
    if (normalized !== value) onChange(normalized);
  }, [value]);

  useEffect(() => {
    if (isCountryPickerOpen) searchInputRef.current?.focus();
  }, [isCountryPickerOpen]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!countryPickerRef.current?.contains(event.target)) setIsCountryPickerOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const handleCountryChange = (event) => {
    const nextCountry = event.target.value;
    const nextCode = getCountryCallingCode(nextCountry);
    setCountry(nextCountry);
    onChange(formatPhoneNumber(nextCountry, nationalNumber.slice(0, 15 - nextCode.length)));
  };

  const handleNumberChange = (event) => {
    const nextNumber = event.target.value.replace(/\D/g, '').slice(0, 15 - callingCode.length);
    onChange(formatPhoneNumber(country, nextNumber));
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={`${id}-number`} className="block text-xs font-semibold text-orvelle-primary uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-orvelle-error">*</span>}
        </label>
      )}
      <div className="flex w-full">
        <div className="relative shrink-0" ref={countryPickerRef}>
          <button
            type="button"
            aria-label={`${label || 'Phone'} country calling code`}
            aria-haspopup="listbox"
            aria-expanded={isCountryPickerOpen}
            onClick={() => {
              setCountrySearch('');
              setIsCountryPickerOpen((open) => !open);
            }}
            className="h-full min-h-8 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-2 text-xs text-orvelle-text focus:outline-none focus:ring-2 focus:ring-orvelle-champagne/30 focus:border-orvelle-champagne"
          >
            {country} +{callingCode}
          </button>
          {isCountryPickerOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Search countries"
                placeholder="Search country or calling code"
                value={countrySearch}
                onChange={(event) => setCountrySearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setIsCountryPickerOpen(false);
                }}
                className="mb-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orvelle-champagne/30"
              />
              <div role="listbox" aria-label="Countries">
                {filteredCountries.map((option) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={country === option.country}
                    key={option.country}
                    onClick={() => {
                      handleCountryChange({ target: { value: option.country } });
                      setIsCountryPickerOpen(false);
                    }}
                    className="block w-full rounded px-2 py-1.5 text-left text-xs text-orvelle-text hover:bg-slate-100"
                  >
                    {option.country} +{option.callingCode} — {option.name}
                  </button>
                ))}
                {filteredCountries.length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-slate-500">No matching countries.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <input
          id={`${id}-number`}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          minLength={Math.max(1, 10 - callingCode.length)}
          maxLength={15 - callingCode.length}
          pattern={`[0-9]{${Math.max(1, 10 - callingCode.length)},${15 - callingCode.length}}`}
          title="Enter digits only; the full number including the country calling code must contain 10 to 15 digits."
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder={getNumberPlaceholder(country)}
          className="h-8 min-w-0 flex-1 rounded-r-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-orvelle-text placeholder:text-orvelle-muted focus:z-10 focus:outline-none focus:ring-2 focus:ring-orvelle-champagne/30 focus:border-orvelle-champagne transition-all"
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {helperText || 'Digits only; the full number including country code must be 10 to 15 digits.'}
      </p>
    </div>
  );
};
