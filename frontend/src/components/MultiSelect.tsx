'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

// Field: light grey surface like DirectStay's form fields. Open list: plain white panel.
const FIELD = { background: '#F3F3F3A1', border: '#FFFFFF', text: '#2C3236', placeholder: '#606060' };
const PANEL = { background: '#ffffff', border: '#e5e7eb', divider: '#f1f2f4', text: '#2C3236', muted: '#6b7280' };

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  loading?: boolean;
  required?: boolean;
  searchable?: boolean;
  loadingText?: string;
  searchPlaceholder?: string;
}

export default function MultiSelect({
  options,
  values,
  onChange,
  placeholder = 'Please make a selection',
  loading = false,
  required = false,
  searchable = true,
  loadingText = 'Loading assets…',
  searchPlaceholder = 'Search assets',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? options.filter((option) => option.label.toLowerCase().includes(term)) : options;
  }, [options, query]);

  const labelFor = (value: string) => options.find((option) => option.value === value)?.label ?? value;

  const toggle = (value: string) => {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm focus:outline-none focus-visible:shadow-[0_0_0_3px_rgba(23,32,92,0.08)]"
        style={{ backgroundColor: FIELD.background, borderColor: FIELD.border, color: values.length ? FIELD.text : FIELD.placeholder, minHeight: '40px' }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {values.length === 0 ? (
            <span>{loading ? loadingText : placeholder}</span>
          ) : (
            values.map((value) => (
              <span
                key={value}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs"
                style={{ backgroundColor: '#ffffff', color: '#1e266d', borderRadius: '4px' }}
              >
                {labelFor(value)}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${labelFor(value)}`}
                  className="cursor-pointer"
                  onClick={(event) => { event.stopPropagation(); toggle(value); }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      toggle(value);
                    }
                  }}
                >
                  <X size={12} />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Native required validation: blocks submit until at least one option is chosen. */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={values.length ? 'selected' : ''}
          onChange={() => undefined}
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
        />
      )}

      {open && (
        <div
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border shadow-lg"
          style={{ backgroundColor: PANEL.background, borderColor: PANEL.border }}
        >
          {searchable && options.length > 8 && (
            <div className="border-b p-2" style={{ borderColor: PANEL.divider }}>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full rounded-md border px-2 py-1.5 text-sm placeholder:text-[#606060]"
                style={{ backgroundColor: FIELD.background, borderColor: FIELD.border, outline: 'none', color: FIELD.text }}
              />
            </div>
          )}
          <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm" style={{ color: PANEL.muted }}>
                {loading ? loadingText : 'No matches'}
              </li>
            )}
            {filtered.map((option) => {
              const selected = values.includes(option.value);
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={selected}
                  tabIndex={0}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                  style={{ color: PANEL.text }}
                  onClick={() => toggle(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      toggle(option.value);
                    }
                  }}
                >
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center border"
                    style={{
                      borderColor: selected ? '#2563eb' : '#9ca3af',
                      backgroundColor: selected ? '#2563eb' : 'transparent',
                    }}
                  >
                    {selected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                  </span>
                  {option.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
