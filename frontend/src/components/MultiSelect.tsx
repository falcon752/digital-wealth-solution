'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

// The open list uses a dark charcoal panel, matching how phones show native dropdowns.
const PANEL = { background: '#262626', border: '#3f3f46', divider: 'rgba(255,255,255,0.08)', text: '#f5f5f5', muted: '#a1a1aa' };

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
        className="flex w-full items-center justify-between gap-2 border bg-white px-3 py-2 text-left text-sm"
        style={{ borderColor: '#d1d5db', color: values.length ? '#1a202c' : '#4a5568', minHeight: '38px' }}
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
                style={{ backgroundColor: '#eef2ff', color: '#1e266d' }}
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
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border shadow-2xl"
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
                className="w-full rounded border px-2 py-1.5 text-sm placeholder:text-zinc-400"
                style={{ backgroundColor: '#1c1c1c', borderColor: PANEL.border, outline: 'none', color: PANEL.text }}
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
                  className="flex cursor-pointer items-center gap-2 border-b px-3 py-2.5 text-sm last:border-b-0 hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                  style={{ color: PANEL.text, borderColor: PANEL.divider }}
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
                      borderColor: selected ? '#3b82f6' : PANEL.muted,
                      backgroundColor: selected ? '#3b82f6' : 'transparent',
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
